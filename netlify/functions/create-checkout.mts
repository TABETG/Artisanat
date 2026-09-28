// Crée une page de paiement Stripe à partir du panier.
// Les prix sont TOUJOURS relus en base : le navigateur n'envoie que des identifiants et des quantités.
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { SHIPPING, shippingFor } from '../../src/shipping';
import { loadSettings } from '../shared/settings';
import { applyPromoExpiry } from '../../src/pricing';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

interface CartLine { id: string; quantity: number }

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);

  let body: { items?: unknown };
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
    .from('products').select('id,name,price_cents,compare_at_price_cents,promo_ends_at,stock,images,active')
    .in('id', [...new Set(lines.map((l) => l.id))]);
  if (error || !products) return json({ error: 'Service momentanément indisponible.' }, 500);

  let subtotal = 0;
  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  for (const line of lines) {
    const found = products.find((x) => x.id === line.id);
    // Promotion terminée : on facture le prix d'origine
    const p = found ? applyPromoExpiry(found) : undefined;
    if (!p || !p.active) return json({ error: 'Un article de votre panier n’est plus en vente. Retirez-le pour continuer.' }, 409);
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
          metadata: { product_id: p.id },
        },
      },
    });
  }

  const settings = await loadSettings(supabase);
  const shipping = shippingFor(subtotal, settings);
  const origin = process.env.URL ?? new URL(req.url).origin;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      locale: 'fr',
      line_items,
      // Moyens de paiement gérés depuis le tableau de bord Stripe (Visa, Mastercard, CB, Apple Pay, Google Pay, PayPal…)
      shipping_address_collection: { allowed_countries: [...SHIPPING.countries] },
      phone_number_collection: { enabled: true },
      // Codes promo créés dans Stripe → Catalogue de produits → Coupons
      allow_promotion_codes: true,
      ...(settings.gift_message_enabled ? {
        custom_fields: [{
          key: 'message',
          label: { type: 'custom' as const, custom: 'Message cadeau ou précisions (facultatif)' },
          type: 'text' as const,
          optional: true,
          text: { maximum_length: 255 },
        }],
      } : {}),
      shipping_options: shippingOptions(settings, shipping),
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

type Settings = Awaited<ReturnType<typeof loadSettings>>;

/** Livraison suivie (toujours), express et retrait à l'atelier (si activés dans les réglages). */
function shippingOptions(settings: Settings, standardCents: number): Stripe.Checkout.SessionCreateParams.ShippingOption[] {
  const rate = (name: string, amount: number, min?: number, max?: number): Stripe.Checkout.SessionCreateParams.ShippingOption => ({
    shipping_rate_data: {
      type: 'fixed_amount',
      display_name: name,
      fixed_amount: { amount, currency: 'eur' },
      ...(min && max ? { delivery_estimate: { minimum: { unit: 'business_day', value: min }, maximum: { unit: 'business_day', value: max } } } : {}),
    },
  });
  const options = [rate(standardCents === 0 ? 'Livraison suivie offerte' : 'Livraison suivie', standardCents, settings.shipping_min_days, settings.shipping_max_days)];
  if (settings.express_enabled) options.push(rate('Livraison express', settings.express_cents, settings.express_min_days, settings.express_max_days));
  if (settings.pickup_enabled) options.push(rate('Retrait gratuit à l’atelier', 0));
  return options;
}
