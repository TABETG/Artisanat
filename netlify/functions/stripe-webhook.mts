// Stripe appelle cette adresse après chaque paiement réussi.
// C'est ici (et seulement ici) que la commande est enregistrée et le stock diminué.
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { absoluteUrl, canEmailCustomers, layout, sendEmails } from '../shared/email';

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

  if (event.type === 'checkout.session.expired') {
    try { await remindAbandonedCart(event.data.object as Stripe.Checkout.Session); } catch (e) { console.error('Relance panier', e); }
    return new Response('ok');
  }

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === 'paid') {
      try {
        if (session.metadata?.type === 'giftcard') {
          await recordGiftCard(session);
        } else {
          const full = await stripe.checkout.sessions.retrieve(session.id, { expand: ['shipping_cost.shipping_rate', 'total_details.breakdown'] });
          await recordOrder(full);
        }
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

  const rate = session.shipping_cost?.shipping_rate;
  const discount = session.total_details?.breakdown?.discounts?.[0]?.discount;
  let promoCode: string | null = null;
  if (discount?.promotion_code) {
    try {
      const pc = typeof discount.promotion_code === 'string' ? await stripe.promotionCodes.retrieve(discount.promotion_code) : discount.promotion_code;
      promoCode = pc.code;
    } catch { /* sans importance */ }
  }

  const { data: order, error } = await supabase.from('orders').insert({
    shipping_method: rate && typeof rate !== 'string' ? rate.display_name ?? null : null,
    discount_cents: session.total_details?.amount_discount ?? 0,
    promo_code: promoCode,
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
    customer_message: session.custom_fields?.find((f) => f.key === 'message')?.text?.value ?? null,
  }).select('id').single();

  if (error) {
    if (error.code === '23505') return; // déjà enregistrée (Stripe peut envoyer deux fois le même événement)
    throw error;
  }

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 100, expand: ['data.price.product'],
  });

  // Les frais d'envoi des artisans sont des lignes à part : ce ne sont pas des articles
  const sellerShipping = new Map<string, number>();
  const items = lineItems.data.flatMap((li) => {
    const product = li.price?.product as Stripe.Product | undefined;
    if (product?.metadata?.seller_shipping) { sellerShipping.set(product.metadata.seller_shipping, li.amount_total ?? 0); return []; }
    return [{
      order_id: order.id,
      product_id: product?.metadata?.product_id ?? null,
      seller_id: product?.metadata?.seller_id ?? null,
      name: li.description ?? product?.name ?? 'Article',
      unit_price_cents: li.price?.unit_amount ?? 0,
      quantity: li.quantity ?? 1,
    }];
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
  await sendOrderConfirmation(order.id, session, items);
  await paySellers(order.id, session, items, sellerShipping);
  await notifyOwnerNewOrder(session, items);

  if (stockProblem) {
    await supabase.from('orders').update({
      status: 'check_stock',
      note: 'Un article a été vendu deux fois en même temps : contactez le client (échange ou remboursement depuis Stripe).',
    }).eq('id', order.id);
  }
}

/** Email au propriétaire (facultatif : actif si RESEND_API_KEY et OWNER_EMAIL sont renseignés). */
async function notifyOwnerSoldOut(names: string[]) {
  const to = process.env.OWNER_EMAIL;
  if (!to) return;
  const url = `${process.env.URL ?? ''}/admin/alertes`;
  const subject = names.length > 1 ? `${names.length} produits en rupture de stock` : `Rupture de stock : ${names[0]}`;
  const lines = ['Suite à une vente, ces produits sont maintenant en rupture de stock :', ...names.map((n) => `• ${n}`)];
  try {
    await sendEmails([{
      to, subject,
      text: `${lines.join('\n')}\n\nPour les remettre en vente : ${url}`,
      html: layout(subject, lines, { label: 'Ouvrir les alertes stock', url }),
    }], process.env.EMAIL_FROM ?? 'Boutique <onboarding@resend.dev>');
  } catch (e) {
    console.error('Email de rupture non envoyé', e);
  }
}

/** Email « Merci pour votre commande » avec le numéro de commande (si l'envoi automatique est configuré). */
async function sendOrderConfirmation(orderId: string, session: Stripe.Checkout.Session, items: { name: string; quantity: number; unit_price_cents: number }[]) {
  const to = session.customer_details?.email;
  if (!to || !canEmailCustomers()) return;
  const number = orderId.slice(0, 8).toUpperCase();
  const euro = (c: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(c / 100);
  const lines = [
    `Bonjour ${session.customer_details?.name ?? ''},`.trim(),
    `Nous avons bien reçu votre commande n° ${number}. Nous la préparons avec soin à l’atelier.`,
    ...items.map((i) => `• ${i.quantity} × ${i.name} — ${euro(i.unit_price_cents * i.quantity)}`),
    `Total payé : ${euro(session.amount_total ?? 0)}`,
    'Vous recevrez un email avec le numéro de suivi dès l’expédition.',
  ];
  try {
    await sendEmails([{
      to, subject: `Commande n° ${number} confirmée`,
      text: `${lines.join('\n\n')}\n\nSuivre ma commande : ${absoluteUrl('/suivi-commande')}`,
      html: layout('Merci pour votre commande', lines, { label: 'Suivre ma commande', url: absoluteUrl('/suivi-commande') }),
    }]);
  } catch (e) {
    console.error('Email de confirmation non envoyé', e);
  }
}

const euro = (c: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(c / 100);

/** Email « Nouvelle commande » au propriétaire (si OWNER_EMAIL et Resend sont configurés). */
async function notifyOwnerNewOrder(session: Stripe.Checkout.Session, items: { name: string; quantity: number }[]) {
  const to = process.env.OWNER_EMAIL;
  if (!to || !process.env.RESEND_API_KEY) return;
  const lines = [
    `${session.customer_details?.name ?? 'Un client'} vient de payer ${euro(session.amount_total ?? 0)}.`,
    ...items.map((i) => `• ${i.quantity} × ${i.name}`),
  ];
  try {
    await sendEmails([{ to, subject: `Nouvelle commande : ${euro(session.amount_total ?? 0)}`, text: lines.join('\n'),
      html: layout('Nouvelle commande', lines, { label: 'Préparer la commande', url: absoluteUrl('/admin/commandes') }) }],
    process.env.EMAIL_FROM ?? 'Boutique <onboarding@resend.dev>');
  } catch (e) { console.error('Email nouvelle commande', e); }
}

/** Carte cadeau payée : code promo à usage unique, valable 1 an, envoyé par email. */
async function recordGiftCard(session: Stripe.Checkout.Session) {
  const { data: existing } = await supabase.from('gift_cards').select('id').eq('stripe_session_id', session.id).maybeSingle();
  if (existing) return; // déjà traitée

  const amount = session.amount_total ?? 0;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const code = `CADEAU-${part()}-${part()}`;
  const expires = new Date(Date.now() + 365 * 86400000);

  const coupon = await stripe.coupons.create({ duration: 'once', amount_off: amount, currency: 'eur', name: `Carte cadeau ${euro(amount)}` });
  const promo = await stripe.promotionCodes.create({ coupon: coupon.id, code, max_redemptions: 1, expires_at: Math.floor(expires.getTime() / 1000) });

  const m = session.metadata ?? {};
  const { error } = await supabase.from('gift_cards').insert({
    code, amount_cents: amount, stripe_session_id: session.id, promotion_code_id: promo.id, expires_at: expires.toISOString(),
    buyer_name: m.buyer_name || session.customer_details?.name || null, buyer_email: session.customer_details?.email ?? null,
    recipient_name: m.recipient_name || null, recipient_email: m.recipient_email || null, message: m.message || null,
  });
  if (error && error.code !== '23505') throw error;

  if (!canEmailCustomers()) return;
  const until = expires.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const shopUrl = absoluteUrl('/boutique');
  const emails = [];
  if (session.customer_details?.email) {
    emails.push({ to: session.customer_details.email, subject: `Votre carte cadeau de ${euro(amount)}`,
      text: `Merci ! Voici le code de la carte cadeau : ${code} (${euro(amount)}, valable jusqu’au ${until}).${m.recipient_email ? `\nNous l’avons aussi envoyé à ${m.recipient_email}.` : ''}`,
      html: layout(`Carte cadeau de ${euro(amount)}`, ['Merci pour votre achat. Voici le code, à saisir sur la page de paiement :', code, `Valable jusqu’au ${until}, en une seule fois.`,
        ...(m.recipient_email ? [`Nous l’avons aussi envoyé à ${m.recipient_email}.`] : ['Vous pouvez le transmettre à la personne de votre choix.'])], { label: 'Découvrir la boutique', url: shopUrl }) });
  }
  if (m.recipient_email) {
    const from = m.buyer_name || session.customer_details?.name || 'Quelqu’un';
    emails.push({ to: m.recipient_email, subject: `${from} vous offre une carte cadeau`,
      text: `${m.recipient_name ? `Bonjour ${m.recipient_name},\n\n` : ''}${from} vous offre ${euro(amount)} à dépenser sur notre boutique.${m.message ? `\n\n« ${m.message} »` : ''}\n\nVotre code : ${code} (valable jusqu’au ${until})\n${shopUrl}`,
      html: layout(`Une carte cadeau de ${euro(amount)} pour vous`, [...(m.recipient_name ? [`Bonjour ${m.recipient_name},`] : []), `${from} vous offre ${euro(amount)} à dépenser sur notre boutique de tapis et créations en laine tissés à la main.`,
        ...(m.message ? [`« ${m.message} »`] : []), `Votre code : ${code}`, `À saisir sur la page de paiement, valable jusqu’au ${until}.`], { label: 'Choisir ma pièce', url: shopUrl }) });
  }
  try { await sendEmails(emails); } catch (e) { console.error('Email carte cadeau', e); }
}

/** Paiement commencé puis abandonné : un email de rappel avec le lien de reprise (si le client l'a accepté). */
async function remindAbandonedCart(session: Stripe.Checkout.Session) {
  const email = session.customer_details?.email;
  const url = session.after_expiration?.recovery?.url;
  if (!email || !url || session.consent?.promotions !== 'opt_in' || !canEmailCustomers()) return;
  if (session.metadata?.type === 'giftcard') return;
  const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 10 });
  const lines = [
    'Bonjour,',
    'Vous avez laissé quelques pièces dans votre panier. Nous les avons gardées de côté pour vous :',
    ...items.data.map((li) => `• ${li.description}`),
    'Les pièces uniques peuvent partir vite : si l’une d’elles vous plaît, n’attendez pas trop.',
  ];
  await sendEmails([{
    to: email, subject: 'Votre panier vous attend',
    text: `${lines.join('\n')}\n\nReprendre ma commande : ${url}`,
    html: layout('Votre panier vous attend', lines, { label: 'Reprendre ma commande', url }),
  }]);
}

/**
 * Place de marché : chaque artisan reçoit ses ventes moins la commission, plus ses frais d'envoi.
 * Le paiement est encaissé par la boutique puis reversé via Stripe Connect (« charges et virements séparés »).
 */
async function paySellers(orderId: string, session: Stripe.Checkout.Session, items: { seller_id: string | null; name: string; quantity: number; unit_price_cents: number }[], shipping: Map<string, number>) {
  const sellerIds = [...new Set(items.map((i) => i.seller_id).filter((x): x is string => !!x))];
  if (!sellerIds.length) return;
  const [{ data: sellers }, { data: privs }, { data: settingsRow }] = await Promise.all([
    supabase.from('sellers').select('id,shop_name,commission_percent').in('id', sellerIds),
    supabase.from('seller_private').select('seller_id,email,stripe_account_id').in('seller_id', sellerIds),
    supabase.from('settings').select('data').eq('id', 1).maybeSingle(),
  ]);
  const defaultCommission = Number((settingsRow?.data as { marketplace_commission_percent?: number } | null)?.marketplace_commission_percent ?? 15);

  const pi = typeof session.payment_intent === 'string' ? await stripe.paymentIntents.retrieve(session.payment_intent) : session.payment_intent;
  const chargeId = typeof pi?.latest_charge === 'string' ? pi.latest_charge : pi?.latest_charge?.id;

  for (const sellerId of sellerIds) {
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
      try {
        const t = await stripe.transfers.create({
          amount, currency: 'eur', destination: priv.stripe_account_id, transfer_group: session.id,
          ...(chargeId ? { source_transaction: chargeId } : {}),
          description: `Commande ${orderId.slice(0, 8).toUpperCase()} — ${seller?.shop_name ?? ''}`,
          metadata: { order_id: orderId, seller_id: sellerId },
        });
        transferId = t.id;
      } catch (e) { console.error('Virement artisan', sellerId, e); }
    }
    await supabase.from('seller_transfers').insert({ order_id: orderId, seller_id: sellerId, sales_cents: sales, shipping_cents: ship, commission_cents: commission, amount_cents: amount, stripe_transfer_id: transferId });

    // Prévenir l'artisan qu'il a une commande à expédier
    if (priv?.email && process.env.RESEND_API_KEY) {
      const lines = ['Bonne nouvelle : une de vos créations vient d’être achetée.', ...mine.map((i) => `• ${i.quantity} × ${i.name}`),
        `Vous recevrez ${(amount / 100).toFixed(2).replace('.', ',')} € (commission et frais d’envoi compris) sur votre compte Stripe.`, 'Retrouvez l’adresse de livraison dans votre espace artisan.'];
      try {
        await sendEmails([{ to: priv.email, subject: 'Nouvelle commande à expédier', text: lines.join('\n'),
          html: layout('Nouvelle commande à expédier', lines, { label: 'Ouvrir mon espace artisan', url: absoluteUrl('/compte?onglet=atelier') }) }],
        process.env.EMAIL_FROM ?? 'Boutique <onboarding@resend.dev>');
      } catch (e) { console.error('Email artisan', e); }
    }
  }
}
