// Remboursement depuis l'espace vendeur : total ou partiel, avec remise en stock facultative.
import Stripe from 'stripe';
import { json, requireAdmin, serviceClient } from '../shared/admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);
  const denied = await requireAdmin(req);
  if (denied) return denied;

  let body: { orderId?: string; amountCents?: number; restock?: boolean; reason?: string };
  try { body = await req.json(); } catch { return json({ error: 'Requête invalide' }, 400); }

  const supabase = serviceClient();
  const { data: order } = await supabase.from('orders')
    .select('id,stripe_payment_id,total_cents,refunded_cents,note,order_items(product_id,quantity)')
    .eq('id', body.orderId ?? '').maybeSingle();
  if (!order) return json({ error: 'Commande introuvable' }, 404);
  if (!order.stripe_payment_id) return json({ error: 'Paiement Stripe introuvable pour cette commande.' }, 400);

  const remaining = order.total_cents - (order.refunded_cents ?? 0);
  const amount = Math.round(Number(body.amountCents));
  if (!(amount > 0) || amount > remaining) return json({ error: `Montant invalide (maximum ${(remaining / 100).toFixed(2).replace('.', ',')} €).` }, 400);

  try {
    await stripe.refunds.create({ payment_intent: order.stripe_payment_id, amount, reason: 'requested_by_customer' });
  } catch (e) {
    console.error('admin-refund', e);
    return json({ error: e instanceof Stripe.errors.StripeError ? e.message : 'Remboursement refusé par Stripe.' }, 400);
  }

  const refunded = (order.refunded_cents ?? 0) + amount;
  const full = refunded >= order.total_cents;
  const line = `Remboursé ${(amount / 100).toFixed(2).replace('.', ',')} € le ${new Date().toLocaleDateString('fr-FR')}${body.reason ? ` : ${String(body.reason).slice(0, 200)}` : ''}`;
  await supabase.from('orders').update({
    refunded_cents: refunded,
    ...(full ? { status: 'refunded' } : {}),
    note: [order.note, line].filter(Boolean).join('\n'),
  }).eq('id', order.id);

  if (body.restock) {
    for (const item of order.order_items ?? []) {
      if (item.product_id) await supabase.rpc('increment_stock', { p_product_id: item.product_id, p_quantity: item.quantity });
    }
  }
  return json({ refunded_cents: refunded, full, note: line });
};
