// Traitement des événements Stripe, séparé de la fonction Netlify pour pouvoir être testé.
//
// Garanties :
//  • signature vérifiée avant toute action ;
//  • chaque événement est journalisé (table stripe_events) : un événement déjà traité est ignoré,
//    un événement en échec est repris en entier au prochain essai de Stripe ;
//  • la commande, ses lignes, la baisse de stock et le numéro de facture sont créés en UNE transaction
//    (fonction SQL create_order_from_checkout), donc jamais de commande à moitié enregistrée ;
//  • chaque email n'est envoyé qu'une fois (réservation de l'action avant l'envoi, annulée si l'envoi échoue) ;
//  • l'état de la session est relu chez Stripe : l'ordre d'arrivée des événements n'a pas d'importance.
import type Stripe from 'stripe';
import { createHmac } from 'node:crypto';
import type { Email } from './email';

/** Appel d'une fonction SQL (supabase.rpc en production, PostgreSQL direct dans les tests). */
export type Rpc = <T = unknown>(fn: string, args: Record<string, unknown>) => Promise<T>;

export interface Mailer {
  canEmailCustomers: () => boolean;
  send: (emails: Email[], from?: string) => Promise<number>;
  layout: (title: string, paragraphs: string[], button?: { label: string; url: string }) => string;
  url: (path: string) => string;
}

export interface Deps {
  stripe: Stripe;
  /** Vérification de signature (les tests utilisent la vraie vérification de la bibliothèque Stripe). */
  webhooks: Pick<Stripe['webhooks'], 'constructEventAsync'>;
  webhookSecret: string;
  rpc: Rpc;
  mail: Mailer;
  ownerEmail?: string;
  /** Clé servant à fabriquer des codes de carte cadeau imprévisibles mais identiques à chaque essai. */
  giftCardSecret: string;
  /** Reversements aux artisans partenaires (place de marché) : facultatif. */
  paySellers?: (orderId: string, session: Stripe.Checkout.Session, items: OrderItemInput[], shipping: Map<string, number>) => Promise<void>;
  log?: (message: string, details?: Record<string, unknown>) => void;
}

export interface OrderItemInput {
  product_id: string | null;
  seller_id: string | null;
  name: string;
  unit_price_cents: number;
  quantity: number;
}

interface CreateOrderResult { order_id: string; created: boolean; stock_problem: boolean; sold_out: string[] }

/** Durée pendant laquelle le stock reste réservé pour un paiement différé (virement SEPA…). */
const ASYNC_HOLD_DAYS = 7;

const euro = (c: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(c / 100);

/** Point d'entrée : requête HTTP de Stripe → réponse. 400 = signature invalide, 500 = Stripe réessaiera. */
export async function processStripeWebhook(req: Request, deps: Deps): Promise<Response> {
  if (req.method !== 'POST') return new Response('Méthode non autorisée', { status: 405 });
  const log = deps.log ?? ((m, d) => console.error(m, d ?? ''));
  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = await deps.webhooks.constructEventAsync(payload, req.headers.get('stripe-signature') ?? '', deps.webhookSecret);
  } catch {
    return new Response('Signature invalide', { status: 400 });
  }

  const objectId = (event.data.object as { id?: string }).id ?? null;
  const state = await deps.rpc<string>('stripe_event_begin', { p_id: event.id, p_type: event.type, p_object_id: objectId });
  if (state === 'done') return new Response('déjà traité');

  try {
    const outcome = await handleEvent(event, deps);
    await deps.rpc('stripe_event_finish', { p_id: event.id, p_status: outcome, p_error: null });
    return new Response(outcome === 'ignored' ? 'ignoré' : 'ok');
  } catch (e) {
    // Journal exploitable sans données personnelles : identifiant d'événement, type, message technique
    const message = e instanceof Error ? e.message : String(e);
    log('Événement Stripe en échec (Stripe réessaiera)', { event: event.id, type: event.type, object: objectId, error: message });
    await deps.rpc('stripe_event_finish', { p_id: event.id, p_status: 'failed', p_error: message }).catch(() => {});
    return new Response('Erreur', { status: 500 });
  }
}

async function handleEvent(event: Stripe.Event, deps: Deps): Promise<'done' | 'ignored'> {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      // L'état est relu chez Stripe : peu importe l'ordre dans lequel les événements arrivent
      const session = await deps.stripe.checkout.sessions.retrieve((event.data.object as Stripe.Checkout.Session).id,
        { expand: ['shipping_cost.shipping_rate', 'total_details.breakdown'] });
      if (session.payment_status !== 'paid') {
        // Paiement différé (virement…) : on garde la pièce de côté en attendant le résultat
        await deps.rpc('extend_reservation', { p_session_id: session.id, p_expires_at: new Date(Date.now() + ASYNC_HOLD_DAYS * 86400000).toISOString() });
        return 'done';
      }
      if (session.metadata?.type === 'giftcard') await recordGiftCard(session, deps);
      else await recordOrder(session, deps);
      return 'done';
    }
    case 'checkout.session.async_payment_failed': {
      await deps.rpc('release_reservation', { p_ref: null, p_session_id: (event.data.object as Stripe.Checkout.Session).id });
      return 'done';
    }
    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session;
      await deps.rpc('release_reservation', { p_ref: null, p_session_id: session.id });
      await remindAbandonedCart(session, deps);
      return 'done';
    }
    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      const refunds = await deps.stripe.refunds.list({ charge: charge.id, limit: 100 });
      for (const r of refunds.data) await syncRefund(r, deps);
      return 'done';
    }
    case 'refund.created':
    case 'refund.updated':
    case 'refund.failed': {
      await syncRefund(event.data.object as Stripe.Refund, deps);
      return 'done';
    }
    default:
      return 'ignored';
  }
}

async function syncRefund(r: Stripe.Refund, deps: Deps) {
  const paymentIntent = typeof r.payment_intent === 'string' ? r.payment_intent : r.payment_intent?.id ?? null;
  const refundId = r.metadata?.refund_id ? Number(r.metadata.refund_id) : null;
  await deps.rpc('sync_stripe_refund', {
    p_stripe_refund_id: r.id, p_payment_intent: paymentIntent, p_amount: r.amount, p_status: r.status ?? 'pending',
    p_refund_id: Number.isFinite(refundId) ? refundId : null,
  });
}

/** Commande payée : création atomique, puis actions uniques (emails, artisans). Rejouable sans doublon. */
export async function recordOrder(session: Stripe.Checkout.Session, deps: Deps) {
  const s = session as Stripe.Checkout.Session & {
    collected_information?: { shipping_details?: { name?: string; address?: Stripe.Address } };
    shipping_details?: { name?: string; address?: Stripe.Address };
  };
  const shippingDetails = s.collected_information?.shipping_details ?? s.shipping_details ?? null;
  const rate = session.shipping_cost?.shipping_rate;
  const rateObj = rate && typeof rate !== 'string' ? rate : null;

  let promoCode: string | null = null;
  const discount = session.total_details?.breakdown?.discounts?.[0]?.discount;
  if (discount?.promotion_code) {
    try {
      const pc = typeof discount.promotion_code === 'string' ? await deps.stripe.promotionCodes.retrieve(discount.promotion_code) : discount.promotion_code;
      promoCode = pc.code;
    } catch { /* sans importance */ }
  }

  const lineItems = await deps.stripe.checkout.sessions.listLineItems(session.id, { limit: 100, expand: ['data.price.product'] });
  // Les frais d'envoi des artisans sont des lignes à part : ce ne sont pas des articles
  const sellerShipping = new Map<string, number>();
  const items: OrderItemInput[] = lineItems.data.flatMap((li) => {
    const product = li.price?.product as Stripe.Product | undefined;
    if (product?.metadata?.seller_shipping) { sellerShipping.set(product.metadata.seller_shipping, li.amount_total ?? 0); return []; }
    return [{
      product_id: product?.metadata?.product_id ?? null,
      seller_id: product?.metadata?.seller_id ?? null,
      name: li.description ?? product?.name ?? 'Article',
      unit_price_cents: li.price?.unit_amount ?? 0,
      quantity: li.quantity ?? 1,
    }];
  });

  const order = {
    stripe_session_id: session.id,
    stripe_payment_id: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null,
    email: session.customer_details?.email ?? null,
    customer_name: session.customer_details?.name ?? null,
    phone: session.customer_details?.phone ?? null,
    shipping_name: shippingDetails?.name ?? null,
    shipping_address: shippingDetails?.address ?? session.customer_details?.address ?? null,
    subtotal_cents: session.amount_subtotal ?? 0,
    shipping_cents: session.shipping_cost?.amount_total ?? 0,
    discount_cents: session.total_details?.amount_discount ?? 0,
    total_cents: session.amount_total ?? 0,
    shipping_method: rateObj?.display_name ?? null,
    shipping_method_id: rateObj?.metadata?.method_id ?? null,
    promo_code: promoCode,
    customer_message: session.custom_fields?.find((f) => f.key === 'message')?.text?.value ?? null,
  };

  // UNE transaction : commande + lignes + stock + numéro de facture (ou rien du tout)
  const result = await deps.rpc<CreateOrderResult>('create_order_from_checkout', { p_order: order, p_items: items });

  if (result.created && result.sold_out.length) await notifyOwnerSoldOut(result.sold_out, deps).catch(() => {});

  // Email au client : obligatoire (confirmation sur support durable) → une erreur fait réessayer Stripe
  await once(result.order_id, 'confirmation', deps, () => sendOrderConfirmation(result.order_id, session, items, deps));
  // Email au vendeur : utile mais non bloquant
  await once(result.order_id, 'owner', deps, () => notifyOwnerNewOrder(session, items, deps)).catch(() => {});

  if (deps.paySellers && items.some((i) => i.seller_id)) await deps.paySellers(result.order_id, session, items, sellerShipping);
}

/** Exécute une action au plus une fois par commande ; si elle échoue, elle redevient disponible pour le prochain essai. */
async function once(orderId: string, action: 'confirmation' | 'owner', deps: Deps, fn: () => Promise<void>) {
  const claimed = await deps.rpc<boolean>('claim_order_action', { p_order_id: orderId, p_action: action });
  if (!claimed) return;
  try { await fn(); } catch (e) {
    await deps.rpc('unclaim_order_action', { p_order_id: orderId, p_action: action });
    throw e;
  }
}

async function sendOrderConfirmation(orderId: string, session: Stripe.Checkout.Session, items: OrderItemInput[], deps: Deps) {
  const to = session.customer_details?.email;
  if (!to || !deps.mail.canEmailCustomers()) return;
  const number = orderId.slice(0, 8).toUpperCase();
  const lines = [
    `Bonjour ${session.customer_details?.name ?? ''},`.trim(),
    `Nous avons bien reçu votre commande n° ${number} et votre paiement. Nous la préparons avec soin.`,
    ...items.map((i) => `• ${i.quantity} × ${i.name} — ${euro(i.unit_price_cents * i.quantity)}`),
    `Livraison : ${euro(session.shipping_cost?.amount_total ?? 0)}`,
    `Total payé : ${euro(session.amount_total ?? 0)}`,
    'Vous recevrez un email avec le numéro de suivi dès l’expédition.',
  ];
  await deps.mail.send([{
    to, subject: `Commande n° ${number} confirmée`,
    text: `${lines.join('\n\n')}\n\nSuivre ma commande : ${deps.mail.url('/suivi-commande')}\nConditions générales de vente : ${deps.mail.url('/conditions-generales-de-vente')}`,
    html: deps.mail.layout('Merci pour votre commande', lines, { label: 'Suivre ma commande', url: deps.mail.url('/suivi-commande') }),
  }]);
}

async function notifyOwnerNewOrder(session: Stripe.Checkout.Session, items: OrderItemInput[], deps: Deps) {
  const to = deps.ownerEmail;
  if (!to || !deps.mail.canEmailCustomers()) return;
  const lines = [
    `${session.customer_details?.name ?? 'Un client'} vient de payer ${euro(session.amount_total ?? 0)}.`,
    ...items.map((i) => `• ${i.quantity} × ${i.name}`),
  ];
  await deps.mail.send([{ to, subject: `Nouvelle commande : ${euro(session.amount_total ?? 0)}`, text: lines.join('\n'),
    html: deps.mail.layout('Nouvelle commande', lines, { label: 'Voir les commandes', url: deps.mail.url('/admin/commandes') }) }]);
}

async function notifyOwnerSoldOut(names: string[], deps: Deps) {
  const to = deps.ownerEmail;
  if (!to || !deps.mail.canEmailCustomers()) return;
  const lines = ['Ces pièces viennent de passer en rupture de stock :', ...names.map((n) => `• ${n}`)];
  await deps.mail.send([{ to, subject: 'Rupture de stock', text: lines.join('\n'),
    html: deps.mail.layout('Rupture de stock', lines, { label: 'Gérer le stock', url: deps.mail.url('/admin/alertes') }) }]);
}

/** Code de carte cadeau : imprévisible (HMAC secret) mais identique à chaque essai pour la même session. */
export function giftCardCode(sessionId: string, secret: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = createHmac('sha256', secret).update(sessionId).digest();
  const pick = (start: number) => Array.from({ length: 4 }, (_, i) => chars[bytes[start + i] % chars.length]).join('');
  return `CADEAU-${pick(0)}-${pick(4)}`;
}

async function recordGiftCard(session: Stripe.Checkout.Session, deps: Deps) {
  const amount = session.amount_total ?? 0;
  const code = giftCardCode(session.id, deps.giftCardSecret);
  const expires = new Date((session.created ?? Math.floor(Date.now() / 1000)) * 1000 + 365 * 86400000);
  // Clés d'idempotence : un nouvel essai ne crée ni coupon ni code en double chez Stripe
  const coupon = await deps.stripe.coupons.create({ duration: 'once', amount_off: amount, currency: 'eur', name: `Carte cadeau ${euro(amount)}` },
    { idempotencyKey: `carte-cadeau-coupon-${session.id}` });
  const promo = await deps.stripe.promotionCodes.create({ coupon: coupon.id, code, max_redemptions: 1, expires_at: Math.floor(expires.getTime() / 1000) },
    { idempotencyKey: `carte-cadeau-code-${session.id}` });
  const m = session.metadata ?? {};
  await deps.rpc('record_gift_card', { p_card: {
    code, amount_cents: amount, stripe_session_id: session.id, promotion_code_id: promo.id, expires_at: expires.toISOString(),
    buyer_name: m.buyer_name || session.customer_details?.name || null, buyer_email: session.customer_details?.email ?? null,
    recipient_name: m.recipient_name || null, recipient_email: m.recipient_email || null, message: m.message || null,
  } });

  if (!deps.mail.canEmailCustomers()) return;
  const claimed = await deps.rpc<boolean>('claim_gift_card_email', { p_session_id: session.id });
  if (!claimed) return;
  const until = expires.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const shopUrl = deps.mail.url('/boutique');
  const emails: Email[] = [];
  if (session.customer_details?.email) {
    emails.push({ to: session.customer_details.email, subject: `Votre carte cadeau de ${euro(amount)}`,
      text: `Merci ! Voici le code de la carte cadeau : ${code} (${euro(amount)}, valable jusqu’au ${until}).${m.recipient_email ? `\nNous l’avons aussi envoyé à ${m.recipient_email}.` : ''}`,
      html: deps.mail.layout(`Carte cadeau de ${euro(amount)}`, ['Merci pour votre achat. Voici le code, à saisir sur la page de paiement :', code, `Valable jusqu’au ${until}, en une seule fois.`,
        ...(m.recipient_email ? [`Nous l’avons aussi envoyé à ${m.recipient_email}.`] : ['Vous pouvez le transmettre à la personne de votre choix.'])], { label: 'Découvrir la boutique', url: shopUrl }) });
  }
  if (m.recipient_email) {
    const from = m.buyer_name || session.customer_details?.name || 'Quelqu’un';
    emails.push({ to: m.recipient_email, subject: `${from} vous offre une carte cadeau`,
      text: `${m.recipient_name ? `Bonjour ${m.recipient_name},\n\n` : ''}${from} vous offre ${euro(amount)} à dépenser sur notre boutique.${m.message ? `\n\n« ${m.message} »` : ''}\n\nVotre code : ${code} (valable jusqu’au ${until})\n${shopUrl}`,
      html: deps.mail.layout(`Une carte cadeau de ${euro(amount)} pour vous`, [...(m.recipient_name ? [`Bonjour ${m.recipient_name},`] : []), `${from} vous offre ${euro(amount)} à dépenser sur notre boutique de créations artisanales.`,
        ...(m.message ? [`« ${m.message} »`] : []), `Votre code : ${code}`, `À saisir sur la page de paiement, valable jusqu’au ${until}.`], { label: 'Choisir ma pièce', url: shopUrl }) });
  }
  try { await deps.mail.send(emails); } catch (e) {
    await deps.rpc('unclaim_gift_card_email', { p_session_id: session.id });
    throw e;
  }
}

/** Paiement abandonné : rappel avec le lien de reprise, si le client l'a accepté et qu'aucune commande n'existe. */
async function remindAbandonedCart(session: Stripe.Checkout.Session, deps: Deps) {
  const email = session.customer_details?.email;
  const url = session.after_expiration?.recovery?.url;
  if (!email || !url || session.consent?.promotions !== 'opt_in' || !deps.mail.canEmailCustomers()) return;
  if (session.metadata?.type === 'giftcard') return;
  const items = await deps.stripe.checkout.sessions.listLineItems(session.id, { limit: 10 });
  const lines = [
    'Bonjour,',
    'Vous avez laissé quelques pièces dans votre panier. Les voici :',
    ...items.data.map((li) => `• ${li.description}`),
    'Les pièces uniques peuvent partir vite : si l’une d’elles vous plaît, n’attendez pas trop.',
  ];
  await deps.mail.send([{ to: email, subject: 'Votre panier vous attend', text: `${lines.join('\n')}\n\nReprendre ma commande : ${url}`,
    html: deps.mail.layout('Votre panier vous attend', lines, { label: 'Reprendre ma commande', url }) }]);
}
