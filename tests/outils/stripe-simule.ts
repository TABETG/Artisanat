// Stripe simulé pour les tests : la vérification de signature est celle de la VRAIE bibliothèque Stripe,
// seules les réponses de l'API (sessions, lignes, remboursements…) sont simulées.
import Stripe from 'stripe';
import type { Deps, Mailer } from '../../netlify/shared/stripe-processing';
import type { Email } from '../../netlify/shared/email';

export const WEBHOOK_SECRET = 'whsec_test_secret_artisanat';
const real = new Stripe('sk_test_simulation');

export interface FakeLine { product_id: string; name: string; unit: number; qty: number }

export class FakeStripe {
  sessions = new Map<string, Record<string, unknown>>();
  lines = new Map<string, FakeLine[]>();
  refunds: Record<string, unknown>[] = [];
  coupons = 0;
  promoCodes = 0;
  idempotency = new Set<string>();
  /** Nombre d'appels qui doivent échouer (panne réseau simulée). */
  failRetrieve = 0;

  addSession(id: string, opts: { paid?: boolean; lines?: FakeLine[]; shipping?: number; email?: string; giftcard?: boolean; amount?: number; optIn?: boolean; pi?: string }) {
    const lines = opts.lines ?? [];
    const subtotal = opts.amount ?? lines.reduce((n, l) => n + l.unit * l.qty, 0);
    const shipping = opts.shipping ?? 0;
    this.lines.set(id, lines);
    this.sessions.set(id, {
      id, object: 'checkout.session', created: Math.floor(Date.now() / 1000),
      payment_status: opts.paid === false ? 'unpaid' : 'paid',
      payment_intent: opts.pi ?? `pi_${id}`,
      amount_subtotal: subtotal, amount_total: subtotal + shipping,
      customer_details: { email: opts.email ?? 'client@exemple.fr', name: 'Claire Martin', phone: '+33600000000', address: { country: 'FR' } },
      collected_information: { shipping_details: { name: 'Claire Martin', address: { line1: '1 rue des Lilas', postal_code: '69001', city: 'Lyon', country: 'FR' } } },
      shipping_cost: { amount_total: shipping, shipping_rate: { display_name: 'Colissimo à domicile', metadata: { method_id: 'domicile' } } },
      total_details: { amount_discount: 0, breakdown: { discounts: [] } },
      metadata: opts.giftcard ? { type: 'giftcard', recipient_email: 'ami@exemple.fr', buyer_name: 'Claire' } : {},
      consent: { promotions: opts.optIn ? 'opt_in' : null },
      after_expiration: { recovery: { url: 'https://exemple.fr/reprise' } },
      custom_fields: [],
    });
  }

  setPaid(id: string, paid: boolean) { (this.sessions.get(id)!).payment_status = paid ? 'paid' : 'unpaid'; }

  api(): Stripe {
    const self = this;
    const remember = (o?: { idempotencyKey?: string }) => { if (o?.idempotencyKey) self.idempotency.add(o.idempotencyKey); };
    return {
      checkout: { sessions: {
        retrieve: async (id: string) => {
          if (self.failRetrieve > 0) { self.failRetrieve--; throw new Error('Stripe injoignable (simulation)'); }
          const s = self.sessions.get(id); if (!s) throw new Error('session inconnue'); return structuredClone(s);
        },
        listLineItems: async (id: string) => ({ data: (self.lines.get(id) ?? []).map((l) => ({
          description: l.name, quantity: l.qty, amount_total: l.unit * l.qty,
          price: { unit_amount: l.unit, product: { name: l.name, metadata: { product_id: l.product_id } } },
        })) }),
      } },
      refunds: {
        list: async ({ charge }: { charge: string }) => ({ data: self.refunds.filter((r) => r.charge === charge) }),
      },
      promotionCodes: {
        retrieve: async () => ({ code: 'BIENVENUE' }),
        create: async (_p: unknown, o?: { idempotencyKey?: string }) => { const fresh = !self.idempotency.has(o?.idempotencyKey ?? ''); remember(o); if (fresh) self.promoCodes++; return { id: `promo_${o?.idempotencyKey}` }; },
      },
      coupons: {
        create: async (_p: unknown, o?: { idempotencyKey?: string }) => { const fresh = !self.idempotency.has(o?.idempotencyKey ?? ''); remember(o); if (fresh) self.coupons++; return { id: `coupon_${o?.idempotencyKey}` }; },
      },
      webhooks: real.webhooks,
    } as unknown as Stripe;
  }
}

/** Requête signée comme celles qu'envoie Stripe. */
export function signedRequest(event: { id: string; type: string; data: { object: unknown } }, secret = WEBHOOK_SECRET): Request {
  const payload = JSON.stringify({ object: 'event', api_version: '2024-06-20', created: Math.floor(Date.now() / 1000), livemode: false, ...event });
  const header = real.webhooks.generateTestHeaderString({ payload, secret });
  return new Request('https://exemple.fr/.netlify/functions/stripe-webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': header } });
}

export class FakeMail implements Mailer {
  sent: Email[] = [];
  failNext = 0;
  canEmailCustomers = () => true;
  layout = (title: string) => `<h1>${title}</h1>`;
  url = (p: string) => `https://exemple.fr${p}`;
  send = async (emails: Email[]) => {
    if (this.failNext > 0) { this.failNext--; throw new Error('Resend 503 (simulation)'); }
    this.sent.push(...emails);
    return emails.length;
  };
}

export function deps(stripe: FakeStripe, mail: FakeMail, rpc: Deps['rpc'], logs: string[] = []): Deps {
  const api = stripe.api();
  return {
    stripe: api, webhooks: real.webhooks, webhookSecret: WEBHOOK_SECRET, rpc, mail,
    ownerEmail: 'atelier@exemple.fr', giftCardSecret: 'secret-de-test',
    log: (m, d) => logs.push(`${m} ${JSON.stringify(d ?? {})}`),
  };
}
