// Stripe appelle cette adresse à chaque événement de paiement.
// C'est ici (et seulement ici) que la commande est enregistrée et le stock diminué.
// Toute la logique est dans ../shared/stripe-processing.ts (testée automatiquement).
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { absoluteUrl, canEmailCustomers, layout, sendEmails } from '../shared/email';
import { processStripeWebhook, type OrderItemInput, type Rpc } from '../shared/stripe-processing';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase = createClient(
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const rpc: Rpc = async (fn, args) => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(`${fn} : ${error.message}`);
  return data;
};

export default (req: Request) => processStripeWebhook(req, {
  stripe,
  webhooks: stripe.webhooks,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  rpc,
  mail: { canEmailCustomers, send: sendEmails, layout, url: absoluteUrl },
  ownerEmail: process.env.OWNER_EMAIL,
  giftCardSecret: process.env.GIFT_CARD_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET!,
  paySellers,
});

/** Place de marché (désactivée par défaut) : reversement à chaque artisan, une seule fois par commande. */
async function paySellers(orderId: string, session: Stripe.Checkout.Session, items: OrderItemInput[], shipping: Map<string, number>) {
  const sellerIds = [...new Set(items.map((i) => i.seller_id).filter((x): x is string => !!x))];
  if (!sellerIds.length) return;
  const [{ data: sellers }, { data: privs }, { data: settingsRow }, { data: done }] = await Promise.all([
    supabase.from('sellers').select('id,shop_name,commission_percent').in('id', sellerIds),
    supabase.from('seller_private').select('seller_id,email,stripe_account_id').in('seller_id', sellerIds),
    supabase.from('settings').select('data').eq('id', 1).maybeSingle(),
    supabase.from('seller_transfers').select('seller_id').eq('order_id', orderId),
  ]);
  const defaultCommission = Number((settingsRow?.data as { marketplace_commission_percent?: number } | null)?.marketplace_commission_percent ?? 15);
  const alreadyPaid = new Set((done ?? []).map((d) => d.seller_id));

  const pi = typeof session.payment_intent === 'string' ? await stripe.paymentIntents.retrieve(session.payment_intent) : session.payment_intent;
  const chargeId = typeof pi?.latest_charge === 'string' ? pi.latest_charge : pi?.latest_charge?.id;

  for (const sellerId of sellerIds) {
    if (alreadyPaid.has(sellerId)) continue;
    const seller = sellers?.find((s) => s.id === sellerId);
    const priv = privs?.find((p) => p.seller_id === sellerId);
    const mine = items.filter((i) => i.seller_id === sellerId);
    const sales = mine.reduce((n, i) => n + i.unit_price_cents * i.quantity, 0);
    const ship = shipping.get(sellerId) ?? 0;
    const commission = Math.round((sales * Number(seller?.commission_percent ?? defaultCommission)) / 100);
    const amount = Math.max(0, sales - commission + ship);

    await supabase.from('seller_shipments').upsert({ order_id: orderId, seller_id: sellerId, shipping_cents: ship });
    let transferId: string | null = null;
    if (priv?.stripe_account_id && amount > 0) {
      // Clé d'idempotence : un nouvel essai du webhook ne crée jamais un second virement
      const t = await stripe.transfers.create({
        amount, currency: 'eur', destination: priv.stripe_account_id, transfer_group: session.id,
        ...(chargeId ? { source_transaction: chargeId } : {}),
        description: `Commande ${orderId.slice(0, 8).toUpperCase()} — ${seller?.shop_name ?? ''}`,
        metadata: { order_id: orderId, seller_id: sellerId },
      }, { idempotencyKey: `virement-${orderId}-${sellerId}` });
      transferId = t.id;
    }
    const { error } = await supabase.from('seller_transfers').insert({ order_id: orderId, seller_id: sellerId, sales_cents: sales, shipping_cents: ship, commission_cents: commission, amount_cents: amount, stripe_transfer_id: transferId });
    if (error && error.code !== '23505') throw new Error(`seller_transfers : ${error.message}`);
    if (error) continue; // déjà enregistré par un essai parallèle

    if (priv?.email && canEmailCustomers()) {
      const lines = ['Bonne nouvelle : une de vos créations vient d’être achetée.', ...mine.map((i) => `• ${i.quantity} × ${i.name}`),
        `Vous recevrez ${(amount / 100).toFixed(2).replace('.', ',')} € (commission et frais d’envoi compris) sur votre compte Stripe.`, 'Retrouvez l’adresse de livraison dans votre espace artisan.'];
      try {
        await sendEmails([{ to: priv.email, subject: 'Nouvelle commande à expédier', text: lines.join('\n'),
          html: layout('Nouvelle commande à expédier', lines, { label: 'Ouvrir mon espace artisan', url: absoluteUrl('/compte?onglet=atelier') }) }]);
      } catch { console.error('Email artisan non envoyé', { order: orderId, seller: sellerId }); }
    }
  }
}
