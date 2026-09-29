// Crée une page de paiement Stripe à partir du panier.
// Les prix sont TOUJOURS relus en base : le navigateur n'envoie que des identifiants et des quantités.
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { quoteShipping, type ShippingQuote } from '../../src/shipping';
import { loadSettings } from '../shared/settings';
import { applyPromoExpiry } from '../../src/pricing';
import { sellerShippingCents } from '../../src/sellerShipping';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

interface CartLine { id: string; quantity: number }

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);

  let body: { items?: unknown; country?: unknown; methodId?: unknown };
  try { body = await req.json(); } catch { return json({ error: 'Requête invalide' }, 400); }

  const raw = Array.isArray(body.items) ? body.items : [];
  const lines: CartLine[] = raw
    .filter((i): i is CartLine =>
      typeof i?.id === 'string' && /^[0-9a-f-]{36}$/i.test(i.id) &&
      Number.isInteger(i?.quantity) && i.quantity > 0 && i.quantity <= 20)
    .slice(0, 30);
  if (lines.length === 0) return json({ error: 'Votre panier est vide.' }, 400);

  const supabase = createClient(
    process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data: products, error } = await supabase
    .from('products').select('id,name,price_cents,compare_at_price_cents,promo_ends_at,stock,images,active,width_cm,length_cm,seller_id,moderation')
    .in('id', [...new Set(lines.map((l) => l.id))]);
  if (error || !products) return json({ error: 'Service momentanément indisponible.' }, 500);

  let subtotal = 0;
  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  for (const line of lines) {
    const found = products.find((x) => x.id === line.id);
    // Promotion terminée : on facture le prix d'origine
    const p = found ? applyPromoExpiry(found) : undefined;
    if (!p || !p.active || p.moderation !== 'approved') return json({ error: 'Un article de votre panier n’est plus en vente. Retirez-le pour continuer.' }, 409);
    if (p.stock < line.quantity) {
      return json({ error: p.stock === 0
        ? `« ${p.name} » vient d’être vendu. Retirez-le du panier pour continuer.`
        : `« ${p.name} » : il n’en reste que ${p.stock}.` }, 409);
    }
    subtotal += p.price_cents * line.quantity;
    line_items.push({
      quantity: line.quantity,
      price_data: {
        currency: 'eur',
        unit_amount: p.price_cents,
        product_data: {
          name: p.name,
          images: (p.images ?? []).slice(0, 1),
          metadata: { product_id: p.id, ...(p.seller_id ? { seller_id: p.seller_id } : {}) },
        },
      },
    });
  }

  const settings = await loadSettings(supabase);
  // Frais de livraison recalculés ici, à partir des réglages et des dimensions réelles des produits
  const country = typeof body.country === 'string' && /^[A-Z]{2}$/.test(body.country) ? body.country : 'FR';
  const priced = lines.map((l) => ({ line: l, p: applyPromoExpiry(products.find((x) => x.id === l.id)!) }));
  const own = priced.filter((x) => !x.p.seller_id);
  const bySeller = new Map<string, typeof priced>();
  priced.filter((x) => x.p.seller_id).forEach((x) => bySeller.set(x.p.seller_id!, [...(bySeller.get(x.p.seller_id!) ?? []), x]));

  // Pièces des artisans : chaque artisan doit être validé et avoir activé ses paiements ; il expédie à son tarif
  if (bySeller.size) {
    const { data: sellers } = await supabase.from('sellers').select('id,shop_name,status,payouts_enabled,shipping_france_cents,shipping_europe_cents,free_shipping_from_cents').in('id', [...bySeller.keys()]);
    for (const [sellerId, group] of bySeller) {
      const seller = sellers?.find((s) => s.id === sellerId);
      if (!seller || seller.status !== 'approved' || !seller.payouts_enabled) return json({ error: 'Un artisan de votre panier ne peut pas encore encaisser de paiement. Retirez sa pièce pour continuer.' }, 409);
      const groupTotal = group.reduce((n, x) => n + x.p.price_cents * x.line.quantity, 0);
      const cents = sellerShippingCents(seller, country, groupTotal, settings.shipping_zones);
      if (cents == null) return json({ error: `${seller.shop_name} ne livre pas encore ce pays. Retirez sa pièce ou choisissez un autre pays.` }, 400);
      if (cents > 0) line_items.push({ quantity: 1, price_data: { currency: 'eur', unit_amount: cents, product_data: { name: `Livraison — ${seller.shop_name}`, metadata: { seller_shipping: sellerId } } } });
    }
  }

  // Pièces de l'atelier : modes de livraison de la boutique
  let ordered: ShippingQuote[] = [];
  if (own.length) {
    const quotes = quoteShipping(country, own.map((x) => ({ quantity: x.line.quantity, price_cents: x.p.price_cents, width_cm: x.p.width_cm, length_cm: x.p.length_cm })), settings.shipping_zones, settings.shipping_methods);
    if (!quotes.length) return json({ error: 'Nous ne livrons pas encore ce pays en ligne. Écrivez-nous pour une solution.' }, 400);
    const chosen = quotes.find((q) => q.method.id === body.methodId) ?? quotes[0];
    // Le mode choisi dans le panier apparaît en premier ; les autres restent possibles sur la page de paiement
    ordered = [chosen, ...quotes.filter((q) => q !== chosen)].slice(0, 5);
  }
  const shippingOptions = ordered.length ? ordered.map(toStripeRate(settings.preparation_days))
    : [{ shipping_rate_data: { type: 'fixed_amount' as const, display_name: 'Expédié par les artisans', fixed_amount: { amount: 0, currency: 'eur' } } }];
  const origin = process.env.URL ?? new URL(req.url).origin;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      locale: 'fr',
      line_items,
      // Moyens de paiement gérés depuis le tableau de bord Stripe (Visa, Mastercard, CB, Apple Pay, Google Pay, PayPal…)
      // Adresse limitée au pays choisi : les frais affichés correspondent bien à la destination
      shipping_address_collection: { allowed_countries: [country as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry] },
      phone_number_collection: { enabled: true },
      // Codes promo créés dans Stripe → Catalogue de produits → Coupons
      allow_promotion_codes: true,
      // Relance du panier abandonné : Stripe garde un lien de reprise ; l'email n'est envoyé qu'avec l'accord du client
      consent_collection: { promotions: 'auto' },
      after_expiration: { recovery: { enabled: true, allow_promotion_codes: true } },
      ...(settings.gift_message_enabled ? {
        custom_fields: [{
          key: 'message',
          label: { type: 'custom' as const, custom: 'Message cadeau ou précisions (facultatif)' },
          type: 'text' as const,
          optional: true,
          text: { maximum_length: 255 },
        }],
      } : {}),
      shipping_options: shippingOptions,
      // La page de paiement expire vite : limite le risque de vendre deux fois une pièce unique
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      success_url: `${origin}/merci?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/commande-annulee`,
    });
    return json({ url: session.url });
  } catch (e) {
    console.error('Stripe checkout error', e);
    return json({ error: 'Le paiement n’a pas pu démarrer. Réessayez dans un instant.' }, 502);
  }
};

/** Un mode de livraison au format Stripe (délai = préparation + transport). */
function toStripeRate(preparationDays: number) {
  return (q: ShippingQuote): Stripe.Checkout.SessionCreateParams.ShippingOption => ({
    shipping_rate_data: {
      type: 'fixed_amount',
      display_name: q.cents === 0 && q.method.kind !== 'retrait' ? `${q.method.name} (offerte)` : q.method.name,
      fixed_amount: { amount: q.cents, currency: 'eur' },
      delivery_estimate: {
        minimum: { unit: 'business_day', value: preparationDays + q.method.min_days },
        maximum: { unit: 'business_day', value: preparationDays + q.method.max_days },
      },
      metadata: { method_id: q.method.id },
    },
  });
}
