// Codes promo gérés depuis l'espace vendeur (créés dans Stripe, utilisables à la page de paiement).
import Stripe from 'stripe';
import { json, requireAdmin } from '../shared/admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type Body = {
  action?: 'list' | 'create' | 'deactivate';
  id?: string;
  input?: { code: string; kind: 'percent' | 'amount'; value: number; expires_at: string | null; max_redemptions: number | null; minimum_amount_cents: number | null };
};

function toDto(p: Stripe.PromotionCode) {
  const coupon = p.coupon as Stripe.Coupon;
  return {
    id: p.id, code: p.code, active: p.active, times_redeemed: p.times_redeemed,
    percent_off: coupon.percent_off ?? null, amount_off_cents: coupon.amount_off ?? null,
    max_redemptions: p.max_redemptions ?? null,
    expires_at: p.expires_at ? new Date(p.expires_at * 1000).toISOString() : null,
    minimum_amount_cents: p.restrictions?.minimum_amount ?? null,
    created_at: new Date(p.created * 1000).toISOString(),
  };
}

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);
  const denied = await requireAdmin(req);
  if (denied) return denied;

  let body: Body;
  try { body = await req.json(); } catch { return json({ error: 'Requête invalide' }, 400); }

  try {
    if (body.action === 'list') {
      const list = await stripe.promotionCodes.list({ limit: 100, expand: ['data.coupon'] });
      return json({ codes: list.data.map(toDto) });
    }

    if (body.action === 'create' && body.input) {
      const i = body.input;
      const code = String(i.code).trim().toUpperCase();
      if (!/^[A-Z0-9-]{3,30}$/.test(code)) return json({ error: 'Le code doit faire 3 à 30 caractères : lettres, chiffres ou tirets.' }, 400);
      if (i.kind === 'percent' && !(i.value >= 1 && i.value <= 90)) return json({ error: 'Pourcentage entre 1 et 90.' }, 400);
      if (i.kind === 'amount' && !(i.value >= 100)) return json({ error: 'Montant minimum : 1 €.' }, 400);

      const coupon = await stripe.coupons.create({
        duration: 'once',
        name: code,
        ...(i.kind === 'percent' ? { percent_off: i.value } : { amount_off: Math.round(i.value), currency: 'eur' }),
      });
      const promo = await stripe.promotionCodes.create({
        coupon: coupon.id,
        code,
        ...(i.expires_at ? { expires_at: Math.floor(new Date(i.expires_at).getTime() / 1000) } : {}),
        ...(i.max_redemptions ? { max_redemptions: i.max_redemptions } : {}),
        ...(i.minimum_amount_cents ? { restrictions: { minimum_amount: i.minimum_amount_cents, minimum_amount_currency: 'eur' } } : {}),
      });
      return json({ code: toDto({ ...promo, coupon }) });
    }

    if (body.action === 'deactivate' && body.id) {
      await stripe.promotionCodes.update(body.id, { active: false });
      return json({ ok: true });
    }
  } catch (e) {
    const message = e instanceof Stripe.errors.StripeError ? e.message : 'Erreur Stripe';
    console.error('admin-promo', e);
    return json({ error: message.includes('already exists') ? 'Ce code existe déjà.' : message }, 400);
  }
  return json({ error: 'Action inconnue' }, 400);
};
