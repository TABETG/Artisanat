// Achat d'une carte cadeau : paiement Stripe, puis code envoyé après paiement (voir stripe-webhook).
import Stripe from 'stripe';
import { json } from '../shared/admin';
import { SHOP } from '../../src/config';

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);
  let b: { amount_cents?: unknown; buyer_name?: unknown; recipient_name?: unknown; recipient_email?: unknown; message?: unknown };
  try { b = await req.json(); } catch { return json({ error: 'Requête invalide' }, 400); }

  const amount = Math.round(Number(b.amount_cents));
  if (!(amount >= 2000 && amount <= 200000)) return json({ error: 'Montant entre 20 € et 2 000 €.' }, 400);
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const recipientEmail = str(b.recipient_email, 200).toLowerCase();
  if (recipientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(recipientEmail)) return json({ error: 'Email du destinataire invalide.' }, 400);

  const origin = process.env.URL ?? new URL(req.url).origin;
  const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount / 100);
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      locale: 'fr',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'eur', unit_amount: amount,
          product_data: { name: `Carte cadeau ${SHOP.name} — ${euros}`, description: 'Valable 1 an sur toute la boutique. Code envoyé par email après le paiement.' },
        },
      }],
      metadata: {
        type: 'giftcard',
        buyer_name: str(b.buyer_name, 100),
        recipient_name: str(b.recipient_name, 100),
        recipient_email: recipientEmail,
        message: str(b.message, 450),
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      success_url: `${origin}/merci?carte_cadeau={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/carte-cadeau`,
    });
    return json({ url: session.url });
  } catch (e) {
    console.error('giftcard checkout', e);
    return json({ error: 'Le paiement n’a pas pu démarrer. Réessayez dans un instant.' }, 502);
  }
};
