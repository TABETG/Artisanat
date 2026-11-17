// Artisan : ouverture de son compte de paiement Stripe (identité, IBAN) et accès à son tableau de bord Stripe.
import Stripe from 'stripe';
import { json, serviceClient } from '../shared/admin';

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Non connecté' }, 401);
  const supabase = serviceClient();
  const { data: auth } = await supabase.auth.getUser(token);
  if (!auth.user) return json({ error: 'Session expirée' }, 401);

  const { data: seller } = await supabase.from('sellers').select('*').eq('user_id', auth.user.id).maybeSingle();
  if (!seller || seller.status !== 'approved') return json({ error: 'Votre boutique doit d’abord être validée.' }, 403);
  const { data: priv } = await supabase.from('seller_private').select('*').eq('seller_id', seller.id).maybeSingle();

  let body: { action?: string };
  try { body = await req.json(); } catch { body = {}; }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const origin = process.env.URL ?? new URL(req.url).origin;

  try {
    let accountId = priv?.stripe_account_id as string | null;
    if (body.action === 'onboard') {
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: 'express', country: seller.country, email: priv?.email ?? auth.user.email,
          business_type: seller.legal_status === 'particulier' ? 'individual' : undefined,
          capabilities: { transfers: { requested: true } },
          business_profile: { name: seller.shop_name, product_description: seller.craft, url: `${origin}/artisans/${seller.slug}` },
          metadata: { seller_id: seller.id },
        });
        accountId = account.id;
        await supabase.from('seller_private').update({ stripe_account_id: accountId }).eq('seller_id', seller.id);
      }
      const link = await stripe.accountLinks.create({
        account: accountId, type: 'account_onboarding',
        refresh_url: `${origin}/compte?onglet=atelier`, return_url: `${origin}/compte?onglet=atelier&stripe=retour`,
      });
      return json({ url: link.url });
    }
    if (!accountId) return json({ payouts_enabled: false });
    if (body.action === 'status') {
      const account = await stripe.accounts.retrieve(accountId);
      const enabled = !!account.payouts_enabled && account.capabilities?.transfers === 'active';
      await supabase.from('sellers').update({ payouts_enabled: enabled }).eq('id', seller.id);
      return json({ payouts_enabled: enabled });
    }
    if (body.action === 'dashboard') {
      const link = await stripe.accounts.createLoginLink(accountId);
      return json({ url: link.url });
    }
  } catch (e) {
    console.error('seller-stripe', e);
    return json({ error: e instanceof Stripe.errors.StripeError ? e.message : 'Stripe indisponible' }, 400);
  }
  return json({ error: 'Action inconnue' }, 400);
};
