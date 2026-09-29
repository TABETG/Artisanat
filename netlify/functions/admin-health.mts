// Contrôle avant ouverture : les clés et services indispensables sont-ils en place ? (réservé aux administrateurs)
import Stripe from 'stripe';
import { json, requireAdmin } from '../shared/admin';

export default async (req: Request) => {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const env = (k: string) => !!process.env[k];
  const key = process.env.STRIPE_SECRET_KEY ?? '';
  const site = process.env.URL ?? new URL(req.url).origin;

  let webhook: 'ok' | 'absent' | 'incomplet' | 'inconnu' = 'inconnu';
  let connect = false;
  if (key) {
    try {
      const stripe = new Stripe(key);
      const hooks = await stripe.webhookEndpoints.list({ limit: 20 });
      const mine = hooks.data.find((h) => h.url.includes('/.netlify/functions/stripe-webhook') && h.status === 'enabled');
      const needed = ['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.expired'];
      webhook = !mine ? 'absent' : needed.every((e) => mine.enabled_events.includes(e as never) || mine.enabled_events.includes('*' as never)) ? 'ok' : 'incomplet';
      try { await stripe.accounts.list({ limit: 1 }); connect = true; } catch { connect = false; }
    } catch { webhook = 'inconnu'; }
  }

  return json({
    site,
    stripe_key: !!key,
    stripe_live: key.startsWith('sk_live_') || key.startsWith('rk_live_'),
    stripe_webhook_secret: env('STRIPE_WEBHOOK_SECRET'),
    stripe_webhook: webhook,
    stripe_connect: connect,
    supabase_service: env('SUPABASE_SERVICE_ROLE_KEY'),
    emails: env('RESEND_API_KEY') && env('EMAIL_FROM'),
    owner_email: env('OWNER_EMAIL'),
    custom_domain: !/\.netlify\.app$/.test(new URL(site).hostname),
  });
};
