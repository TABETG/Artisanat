// Remboursement depuis l'administration : total ou partiel, frais de port compris si besoin, remise en stock facultative.
//
// Déroulé sûr :
//  1. begin_refund (PostgreSQL) verrouille la commande, vérifie le plafond (déjà remboursé + en cours) et écrit l'opération « en cours » ;
//     deux clics simultanés ne peuvent donc pas rembourser deux fois ;
//  2. Stripe est appelé avec une clé d'idempotence liée à cette opération : un nouvel essai ne crée pas un second remboursement ;
//  3. finish_refund enregistre le résultat, remet en stock une seule fois et recalcule le total remboursé.
// Les remboursements faits depuis le tableau de bord Stripe sont repris par le webhook (sync_stripe_refund).
import Stripe from 'stripe';
import { json, requireAdmin, serviceClient } from '../shared/admin';
import { canEmailCustomers, mailTools, sendEmails } from '../shared/email';
import { refundEmail } from '../shared/order-emails';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

interface Body {
  orderId?: unknown; amountCents?: unknown; shippingCents?: unknown; restock?: unknown; reason?: unknown;
  returnId?: unknown; restockItems?: unknown; notify?: unknown;
}

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);
  const denied = await requireAdmin(req);
  if (denied) return denied;

  let body: Body;
  try { body = await req.json(); } catch { return json({ error: 'Requête invalide' }, 400); }

  const orderId = typeof body.orderId === 'string' && /^[0-9a-f-]{36}$/i.test(body.orderId) ? body.orderId : null;
  const amount = Math.round(Number(body.amountCents));
  const shipping = Math.max(0, Math.round(Number(body.shippingCents ?? 0)) || 0);
  const returnId = body.returnId == null ? null : Number(body.returnId);
  const reason = typeof body.reason === 'string' ? body.reason.slice(0, 300) : '';
  const restockItems = Array.isArray(body.restockItems)
    ? body.restockItems
        .filter((i): i is { product_id: string; quantity: number } =>
          typeof i?.product_id === 'string' && /^[0-9a-f-]{36}$/i.test(i.product_id) && Number.isInteger(i?.quantity) && i.quantity > 0 && i.quantity <= 100)
        .map((i) => ({ product_id: i.product_id, quantity: i.quantity }))
    : null;
  if (!orderId || !Number.isInteger(amount) || amount <= 0) return json({ error: 'Requête invalide' }, 400);
  if (returnId !== null && !Number.isInteger(returnId)) return json({ error: 'Requête invalide' }, 400);

  const supabase = serviceClient();
  const { data: order } = await supabase.from('orders').select('id,stripe_payment_id').eq('id', orderId).maybeSingle();
  if (!order) return json({ error: 'Commande introuvable' }, 404);
  if (!order.stripe_payment_id) return json({ error: 'Paiement Stripe introuvable pour cette commande.' }, 400);

  // 1. Opération enregistrée « en cours » (verrou et plafond côté base)
  const { data: refundId, error: beginError } = await supabase.rpc('begin_refund', {
    p_order_id: orderId, p_amount: amount, p_shipping: shipping, p_reason: reason, p_restock: body.restock === true,
    p_restock_items: restockItems, p_return_id: returnId, p_by: adminEmail(req),
  });
  if (beginError) {
    const max = /MONTANT_INVALIDE:(\d+)/.exec(beginError.message);
    if (max) return json({ error: `Montant invalide (maximum ${euro(Number(max[1]))}, remboursements en cours compris).` }, 400);
    if (beginError.message.includes('RETOUR_DEJA_REMBOURSE')) return json({ error: 'Ce retour a déjà été remboursé.' }, 409);
    if (beginError.message.includes('FRAIS_INVALIDES')) return json({ error: 'Frais de port à rembourser invalides.' }, 400);
    console.error('begin_refund', { order: orderId, error: beginError.message });
    return json({ error: 'Service momentanément indisponible.' }, 500);
  }

  // 2. Stripe, avec une clé d'idempotence propre à cette opération
  let refund: Stripe.Refund;
  try {
    refund = await stripe.refunds.create(
      { payment_intent: order.stripe_payment_id, amount, reason: 'requested_by_customer', metadata: { refund_id: String(refundId), order_id: orderId } },
      { idempotencyKey: `remboursement-${refundId}` },
    );
  } catch (e) {
    const message = e instanceof Stripe.errors.StripeError ? e.message : 'Remboursement refusé par Stripe.';
    await supabase.rpc('finish_refund', { p_refund_id: refundId, p_status: 'failed', p_stripe_refund_id: null, p_error: message });
    console.error('Remboursement refusé', { order: orderId, refund: refundId, error: message });
    return json({ error: message }, 400);
  }

  // 3. Résultat : « succeeded » en général, « pending » parfois (le webhook mettra à jour)
  const status = refund.status === 'succeeded' ? 'succeeded' : refund.status === 'failed' || refund.status === 'canceled' ? refund.status : 'pending';
  const { error: finishError } = await supabase.rpc('finish_refund', { p_refund_id: refundId, p_status: status, p_stripe_refund_id: refund.id, p_error: null });
  if (finishError) console.error('finish_refund (le webhook rattrapera)', { refund: refundId, error: finishError.message });

  const { data: updated } = await supabase.from('orders').select('refunded_cents,total_cents,status,note,email,shipping_name').eq('id', orderId).maybeSingle();
  const full = (updated?.refunded_cents ?? 0) >= (updated?.total_cents ?? Infinity);

  // 4. Email au client (sauf si l'administrateur l'a décoché). Un échec d'email n'annule pas le remboursement.
  let email: 'sent' | 'manual' | 'none' | 'failed' = 'none';
  if (body.notify !== false && updated?.email && (status === 'succeeded' || status === 'pending')) {
    email = await notifyRefund(supabase, Number(refundId), { id: orderId, email: updated.email, shipping_name: updated.shipping_name ?? null },
      { amountCents: amount, shippingCents: shipping, full: full || amount >= (updated.total_cents ?? Infinity) });
  }

  return json({
    refund_id: refundId, status, email,
    refunded_cents: updated?.refunded_cents ?? 0,
    full,
    note: `${status === 'pending' ? 'Remboursement en cours' : 'Remboursé'} ${euro(amount)}${shipping ? ` (dont ${euro(shipping)} de livraison)` : ''} le ${new Date().toLocaleDateString('fr-FR')}${reason ? ` : ${reason}` : ''}`,
  });
};

async function notifyRefund(supabase: ReturnType<typeof serviceClient>, refundId: number,
  order: { id: string; email: string; shipping_name: string | null }, r: { amountCents: number; shippingCents: number; full: boolean }) {
  if (!canEmailCustomers()) return 'manual' as const;
  const { data: claimed } = await supabase.from('refunds').update({ email_sent_at: new Date().toISOString() })
    .eq('id', refundId).is('email_sent_at', null).select('id');
  if (!claimed?.length) return 'sent' as const; // déjà envoyé
  try {
    await sendEmails([refundEmail(order, r, mailTools())]);
    return 'sent' as const;
  } catch (e) {
    await supabase.from('refunds').update({ email_sent_at: null }).eq('id', refundId);
    console.error('Email de remboursement', { refund: refundId, error: e instanceof Error ? e.message : 'inconnu' });
    return 'failed' as const;
  }
}

const euro = (c: number) => `${(c / 100).toFixed(2).replace('.', ',')} €`;

/** Adresse de l'administrateur (jeton déjà vérifié par requireAdmin), pour l'historique. */
function adminEmail(req: Request): string | null {
  try {
    const token = req.headers.get('authorization')!.replace(/^Bearer\s+/i, '');
    const payload = JSON.parse(Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    return typeof payload.email === 'string' ? payload.email : null;
  } catch { return null; }
}
