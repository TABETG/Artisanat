// Stripe appelle cette adresse après chaque paiement réussi.
// C'est ici (et seulement ici) que la commande est enregistrée et le stock diminué.
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase = createClient(
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export default async (req: Request) => {
  if (req.method !== 'POST') return new Response('Méthode non autorisée', { status: 405 });

  const signature = req.headers.get('stripe-signature');
  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature ?? '', process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new Response('Signature invalide', { status: 400 });
  }

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === 'paid') {
      try {
        await recordOrder(session);
      } catch (e) {
        console.error('Enregistrement de commande impossible', e);
        return new Response('Erreur', { status: 500 }); // Stripe réessaiera automatiquement
      }
    }
  }
  return new Response('ok');
};

async function recordOrder(session: Stripe.Checkout.Session) {
  const s = session as Stripe.Checkout.Session & {
    collected_information?: { shipping_details?: { name?: string; address?: Stripe.Address } };
    shipping_details?: { name?: string; address?: Stripe.Address };
  };
  const shippingDetails = s.collected_information?.shipping_details ?? s.shipping_details ?? null;

  const { data: order, error } = await supabase.from('orders').insert({
    stripe_session_id: session.id,
    stripe_payment_id: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null,
    email: session.customer_details?.email ?? null,
    customer_name: session.customer_details?.name ?? null,
    phone: session.customer_details?.phone ?? null,
    shipping_name: shippingDetails?.name ?? null,
    shipping_address: shippingDetails?.address ?? session.customer_details?.address ?? null,
    subtotal_cents: session.amount_subtotal ?? 0,
    shipping_cents: session.shipping_cost?.amount_total ?? 0,
    total_cents: session.amount_total ?? 0,
    status: 'paid',
  }).select('id').single();

  if (error) {
    if (error.code === '23505') return; // déjà enregistrée (Stripe peut envoyer deux fois le même événement)
    throw error;
  }

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 100, expand: ['data.price.product'],
  });

  const items = lineItems.data.map((li) => {
    const product = li.price?.product as Stripe.Product | undefined;
    return {
      order_id: order.id,
      product_id: product?.metadata?.product_id ?? null,
      name: li.description ?? product?.name ?? 'Article',
      unit_price_cents: li.price?.unit_amount ?? 0,
      quantity: li.quantity ?? 1,
    };
  });
  const { error: itemsError } = await supabase.from('order_items').insert(items);
  if (itemsError) throw itemsError;

  let stockProblem = false;
  const productIds: string[] = [];
  for (const item of items) {
    if (!item.product_id) continue;
    productIds.push(item.product_id);
    const { data: ok } = await supabase.rpc('decrement_stock', {
      p_product_id: item.product_id, p_quantity: item.quantity,
    });
    if (ok === false) stockProblem = true;
  }

  // Prévenir le propriétaire des produits qui viennent de passer en rupture
  if (productIds.length) {
    const { data: soldOut } = await supabase.from('products').select('name').in('id', productIds).eq('stock', 0);
    if (soldOut?.length) await notifyOwnerSoldOut(soldOut.map((p) => p.name));
  }
  if (stockProblem) {
    await supabase.from('orders').update({
      status: 'check_stock',
      note: 'Un article a été vendu deux fois en même temps : contactez le client (échange ou remboursement depuis Stripe).',
    }).eq('id', order.id);
  }
}

/** Email au propriétaire (facultatif : actif si RESEND_API_KEY et OWNER_EMAIL sont renseignés). */
async function notifyOwnerSoldOut(names: string[]) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.OWNER_EMAIL;
  if (!key || !to) return;
  const site = process.env.URL ?? '';
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? 'Boutique <onboarding@resend.dev>',
        to: [to],
        subject: names.length > 1 ? `${names.length} produits en rupture de stock` : `Rupture de stock : ${names[0]}`,
        text: `Bonjour,\n\nSuite à une vente, ces produits sont maintenant en rupture de stock :\n\n${names.map((n) => `- ${n}`).join('\n')}\n\nPour les remettre en vente : ${site}/admin/alertes\n`,
      }),
    });
  } catch (e) {
    console.error('Email de rupture non envoyé', e);
  }
}
