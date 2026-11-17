// Tests du paiement : webhook Stripe, commandes, stock, réservations, remboursements — sur un vrai PostgreSQL.
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { freshDatabase, type TestDb } from './outils/base';
import { FakeMail, FakeStripe, deps, signedRequest } from './outils/stripe-simule';
import { processStripeWebhook, giftCardCode } from '../netlify/shared/stripe-processing';

let db: TestDb;
const stripe = new FakeStripe();
const mail = new FakeMail();
const logs: string[] = [];
let n = 0;
const uid = () => `${Date.now().toString(36)}${(n++).toString(36)}`;

before(async () => { db = await freshDatabase('test_paiement'); });
after(async () => { await db?.close(); });

async function product(name: string, stock: number, price = 4500): Promise<string> {
  const [r] = await db.q<{ id: string }>(`insert into products (name, price_cents, stock, category) values ($1, $2, $3, 'bijoux') returning id`, [name, price, stock]);
  return r.id;
}
const stockOf = async (id: string) => (await db.q<{ stock: number }>('select stock from products where id = $1', [id]))[0].stock;
const ordersFor = (session: string) => db.q<{ id: string; status: string; invoice_number: number | null; total_cents: number; refunded_cents: number }>('select * from orders where stripe_session_id = $1', [session]);
const run = (event: { id: string; type: string; data: { object: unknown } }) => processStripeWebhook(signedRequest(event), deps(stripe, mail, db.rpc, logs));
const completed = (session: string, id = `evt_${uid()}`) => ({ id, type: 'checkout.session.completed', data: { object: { id: session } } });
const emailsTo = (to: string, session?: string) => mail.sent.filter((e) => e.to === to && (!session || e.text.includes(session) || true));

/** Simule create-checkout : réservation, puis rattachement à la session Stripe. */
async function checkout(session: string, items: { product_id: string; quantity: number }[], minutes = 35) {
  const ref = crypto.randomUUID();
  await db.rpc('reserve_stock', { p_ref: ref, p_items: items, p_minutes: minutes });
  await db.rpc('attach_reservation', { p_ref: ref, p_session_id: session, p_expires_at: new Date(Date.now() + minutes * 60000).toISOString() });
  return ref;
}

describe('Webhook Stripe', () => {
  test('signature invalide : refusée (400) et rien n’est écrit', async () => {
    const req = signedRequest(completed('cs_pirate'), 'whsec_mauvais_secret');
    const res = await processStripeWebhook(req, deps(stripe, mail, db.rpc));
    assert.equal(res.status, 400);
    assert.equal((await db.q('select 1 from stripe_events where object_id = $1', ['cs_pirate'])).length, 0);
  });

  test('achat réussi avec plusieurs produits : commande, lignes, stock, facture, emails', async () => {
    const a = await product('Collier perles', 3, 4500), b = await product('Vase grès', 2, 3000);
    const s = `cs_${uid()}`;
    stripe.addSession(s, { lines: [{ product_id: a, name: 'Collier perles', unit: 4500, qty: 2 }, { product_id: b, name: 'Vase grès', unit: 3000, qty: 1 }], shipping: 690, email: `${s}@exemple.fr` });
    await checkout(s, [{ product_id: a, quantity: 2 }, { product_id: b, quantity: 1 }]);
    const before = mail.sent.length;
    const res = await run(completed(s));
    assert.equal(res.status, 200);
    const [o] = await ordersFor(s);
    assert.equal(o.status, 'paid');
    assert.equal(o.total_cents, 12690);
    assert.ok(o.invoice_number, 'numéro de facture attribué');
    assert.equal((await db.q('select * from order_items where order_id = $1', [o.id])).length, 2);
    assert.equal(await stockOf(a), 1);
    assert.equal(await stockOf(b), 1);
    assert.deepEqual((await db.q<{ status: string }>('select status from stock_reservations where stripe_session_id = $1', [s])).map((r) => r.status), ['converted', 'converted']);
    assert.equal(mail.sent.length - before, 2, 'confirmation client + alerte atelier');
    assert.equal(emailsTo(`${s}@exemple.fr`).length, 1);
  });

  test('même événement reçu plusieurs fois : une seule commande, un seul email, stock baissé une fois', async () => {
    const a = await product('Bague argent', 5);
    const s = `cs_${uid()}`;
    stripe.addSession(s, { lines: [{ product_id: a, name: 'Bague argent', unit: 4500, qty: 1 }], email: `${s}@exemple.fr` });
    const ev = completed(s);
    const results = await Promise.all([run(ev), run(ev), run(ev)]); // livraisons simultanées
    results.push(await run(ev));                                    // et une livraison tardive
    assert.ok(results.every((r) => r.status === 200));
    assert.equal((await ordersFor(s)).length, 1);
    assert.equal(await stockOf(a), 4);
    assert.equal(emailsTo(`${s}@exemple.fr`).length, 1);
  });

  test('événements différents pour la même session (completed + async_payment_succeeded) : pas de doublon', async () => {
    const a = await product('Broche laiton', 5);
    const s = `cs_${uid()}`;
    stripe.addSession(s, { lines: [{ product_id: a, name: 'Broche laiton', unit: 2500, qty: 1 }], email: `${s}@exemple.fr` });
    await run(completed(s));
    await run({ id: `evt_${uid()}`, type: 'checkout.session.async_payment_succeeded', data: { object: { id: s } } });
    assert.equal((await ordersFor(s)).length, 1);
    assert.equal(await stockOf(a), 4);
    assert.equal(emailsTo(`${s}@exemple.fr`).length, 1);
  });

  test('webhook interrompu (email en panne) puis relancé par Stripe : reprise sans doublon', async () => {
    const a = await product('Boucles d’oreilles', 2);
    const s = `cs_${uid()}`;
    stripe.addSession(s, { lines: [{ product_id: a, name: 'Boucles d’oreilles', unit: 3900, qty: 1 }], email: `${s}@exemple.fr` });
    const ev = completed(s);
    mail.failNext = 1;
    const first = await run(ev);
    assert.equal(first.status, 500, 'Stripe doit réessayer');
    const [evRow] = await db.q<{ status: string; last_error: string }>('select status, last_error from stripe_events where id = $1', [ev.id]);
    assert.equal(evRow.status, 'failed');
    assert.match(evRow.last_error, /Resend 503/);
    assert.ok(logs.some((l) => l.includes(ev.id)), 'erreur journalisée avec l’identifiant de l’événement');
    assert.ok(!logs.some((l) => l.includes(`${s}@exemple.fr`)), 'aucune adresse email dans les journaux');
    const second = await run(ev);
    assert.equal(second.status, 200);
    assert.equal((await ordersFor(s)).length, 1);
    assert.equal(await stockOf(a), 1, 'stock baissé une seule fois');
    assert.equal(emailsTo(`${s}@exemple.fr`).length, 1, 'confirmation envoyée une seule fois');
    assert.equal((await db.q<{ status: string }>('select status from stripe_events where id = $1', [ev.id]))[0].status, 'done');
  });

  test('panne avant la création (Stripe injoignable) : aucune commande partielle, puis reprise', async () => {
    const a = await product('Miroir rotin', 1);
    const s = `cs_${uid()}`;
    stripe.addSession(s, { lines: [{ product_id: a, name: 'Miroir rotin', unit: 8900, qty: 1 }] });
    const ev = completed(s);
    stripe.failRetrieve = 1;
    assert.equal((await run(ev)).status, 500);
    assert.equal((await ordersFor(s)).length, 0);
    assert.equal(await stockOf(a), 1);
    assert.equal((await run(ev)).status, 200);
    assert.equal((await ordersFor(s)).length, 1);
    assert.equal(await stockOf(a), 0);
  });

  test('panne au milieu de la transaction : tout est annulé (atomicité)', async () => {
    const a = await product('Lampe céramique', 3);
    const s = `cs_${uid()}`;
    // Ligne invalide (quantité nulle refusée par la base) APRÈS une ligne valide
    await assert.rejects(db.rpc('create_order_from_checkout', {
      p_order: { stripe_session_id: s, email: 'x@exemple.fr', total_cents: 100 },
      p_items: [{ product_id: a, name: 'Lampe céramique', unit_price_cents: 100, quantity: 1 }, { product_id: a, name: 'Lampe céramique', unit_price_cents: 100, quantity: null }],
    }));
    assert.equal((await ordersFor(s)).length, 0, 'pas de commande sans ses lignes');
    assert.equal(await stockOf(a), 3, 'stock intact');
  });

  test('événements dans le désordre : l’état est relu chez Stripe', async () => {
    const a = await product('Plaid lin', 4);
    const s = `cs_${uid()}`;
    // Paiement différé : « completed » (non payé) arrive APRÈS « async_payment_succeeded »
    stripe.addSession(s, { lines: [{ product_id: a, name: 'Plaid lin', unit: 6900, qty: 1 }] });
    await run({ id: `evt_${uid()}`, type: 'checkout.session.async_payment_succeeded', data: { object: { id: s } } });
    await run({ id: `evt_${uid()}`, type: 'checkout.session.completed', data: { object: { id: s, payment_status: 'unpaid' } } });
    assert.equal((await ordersFor(s)).length, 1);
    assert.equal(await stockOf(a), 3);
  });

  test('paiement différé puis échoué : pièce gardée de côté, puis libérée, aucune commande', async () => {
    const a = await product('Coupe unique', 1);
    const s = `cs_${uid()}`;
    stripe.addSession(s, { paid: false, lines: [{ product_id: a, name: 'Coupe unique', unit: 5000, qty: 1 }] });
    await checkout(s, [{ product_id: a, quantity: 1 }]);
    await run(completed(s));
    const [r] = await db.q<{ status: string; days: number }>(`select status, extract(day from expires_at - now())::int as days from stock_reservations where stripe_session_id = $1`, [s]);
    assert.equal(r.status, 'active');
    assert.ok(r.days >= 6, 'réservation prolongée pendant le paiement différé');
    assert.equal(Number((await db.q<{ v: number }>('select public.available_stock($1) as v', [a]))[0].v), 0, 'personne d’autre ne peut l’acheter');
    await run({ id: `evt_${uid()}`, type: 'checkout.session.async_payment_failed', data: { object: { id: s } } });
    assert.equal((await ordersFor(s)).length, 0);
    assert.equal(Number((await db.q<{ v: number }>('select public.available_stock($1) as v', [a]))[0].v), 1, 'pièce remise en vente');
  });

  test('session expirée : réservation libérée, relance seulement si le client l’a acceptée', async () => {
    const a = await product('Bracelet tissé', 1);
    const s1 = `cs_${uid()}`, s2 = `cs_${uid()}`;
    stripe.addSession(s1, { paid: false, lines: [{ product_id: a, name: 'Bracelet tissé', unit: 1900, qty: 1 }], email: `${s1}@exemple.fr`, optIn: false });
    await checkout(s1, [{ product_id: a, quantity: 1 }]);
    await run({ id: `evt_${uid()}`, type: 'checkout.session.expired', data: { object: stripe.sessions.get(s1) } });
    assert.equal(Number((await db.q<{ v: number }>('select public.available_stock($1) as v', [a]))[0].v), 1);
    assert.equal(emailsTo(`${s1}@exemple.fr`).length, 0, 'pas de relance sans accord');
    stripe.addSession(s2, { paid: false, lines: [{ product_id: a, name: 'Bracelet tissé', unit: 1900, qty: 1 }], email: `${s2}@exemple.fr`, optIn: true });
    await run({ id: `evt_${uid()}`, type: 'checkout.session.expired', data: { object: stripe.sessions.get(s2) } });
    assert.equal(emailsTo(`${s2}@exemple.fr`).length, 1, 'relance avec accord');
  });

  test('pièce vendue sans réservation valable (cas limite) : commande marquée « stock à vérifier »', async () => {
    const a = await product('Pièce unique', 1);
    const s1 = `cs_${uid()}`, s2 = `cs_${uid()}`;
    for (const s of [s1, s2]) stripe.addSession(s, { lines: [{ product_id: a, name: 'Pièce unique', unit: 12000, qty: 1 }] });
    await run(completed(s1));
    await run(completed(s2));
    assert.equal((await ordersFor(s1))[0].status, 'paid');
    assert.equal((await ordersFor(s2))[0].status, 'check_stock');
    assert.equal(await stockOf(a), 0, 'le stock ne devient jamais négatif');
  });

  test('carte cadeau : un seul code, un seul coupon Stripe, un seul envoi même si l’événement est rejoué', async () => {
    const s = `cs_${uid()}`;
    stripe.addSession(s, { giftcard: true, amount: 5000, email: `${s}@exemple.fr` });
    const ev = completed(s);
    await run(ev); await run(completed(s)); await run(ev);
    const cards = await db.q<{ code: string }>('select code from gift_cards where stripe_session_id = $1', [s]);
    assert.equal(cards.length, 1);
    assert.equal(cards[0].code, giftCardCode(s, 'secret-de-test'));
    assert.ok(stripe.idempotency.has(`carte-cadeau-coupon-${s}`));
    assert.equal(emailsTo(`${s}@exemple.fr`).length, 1);
  });

  test('événement non géré : accepté et marqué « ignoré »', async () => {
    const id = `evt_${uid()}`;
    const res = await run({ id, type: 'customer.created', data: { object: { id: 'cus_1' } } });
    assert.equal(res.status, 200);
    assert.equal((await db.q<{ status: string }>('select status from stripe_events where id = $1', [id]))[0].status, 'ignored');
  });
});

describe('Réservation du stock', () => {
  test('rupture de stock : refusée avec la quantité disponible', async () => {
    const a = await product('Tasse', 2);
    await assert.rejects(db.rpc('reserve_stock', { p_ref: crypto.randomUUID(), p_items: [{ product_id: a, quantity: 3 }], p_minutes: 35 }), new RegExp(`STOCK:${a}:2`));
  });

  test('deux clients achètent la même pièce unique au même instant : un seul obtient la réservation', async () => {
    const a = await product('Sculpture unique', 1);
    const tries = await Promise.allSettled(Array.from({ length: 6 }, () =>
      db.rpc('reserve_stock', { p_ref: crypto.randomUUID(), p_items: [{ product_id: a, quantity: 1 }], p_minutes: 35 })));
    assert.equal(tries.filter((t) => t.status === 'fulfilled').length, 1);
    assert.equal(tries.filter((t) => t.status === 'rejected' && /STOCK:/.test(String((t as PromiseRejectedResult).reason))).length, 5);
  });

  test('paniers croisés en parallèle (A+B et B+A) : pas de blocage mutuel', async () => {
    const a = await product('Pièce A', 1), b = await product('Pièce B', 1);
    const tries = await Promise.allSettled([
      db.rpc('reserve_stock', { p_ref: crypto.randomUUID(), p_items: [{ product_id: a, quantity: 1 }, { product_id: b, quantity: 1 }], p_minutes: 35 }),
      db.rpc('reserve_stock', { p_ref: crypto.randomUUID(), p_items: [{ product_id: b, quantity: 1 }, { product_id: a, quantity: 1 }], p_minutes: 35 }),
    ]);
    assert.equal(tries.filter((t) => t.status === 'fulfilled').length, 1);
  });

  test('réservation expirée : la pièce redevient disponible', async () => {
    const a = await product('Bol', 1);
    await db.rpc('reserve_stock', { p_ref: crypto.randomUUID(), p_items: [{ product_id: a, quantity: 1 }], p_minutes: 0 });
    await db.rpc('reserve_stock', { p_ref: crypto.randomUUID(), p_items: [{ product_id: a, quantity: 1 }], p_minutes: 35 });
  });

  test('échec de création de la session Stripe : la réservation est libérée', async () => {
    const a = await product('Assiette', 1);
    const ref = crypto.randomUUID();
    await db.rpc('reserve_stock', { p_ref: ref, p_items: [{ product_id: a, quantity: 1 }], p_minutes: 35 });
    assert.equal(await db.rpc('release_reservation', { p_ref: ref, p_session_id: null }), 1);
    assert.equal(Number((await db.q<{ v: number }>('select public.available_stock($1) as v', [a]))[0].v), 1);
  });
});

describe('Remboursements', () => {
  async function paidOrder(stock = 1, qty = 1) {
    const a = await product('Vase', stock, 4000);
    const s = `cs_${uid()}`;
    stripe.addSession(s, { lines: [{ product_id: a, name: 'Vase', unit: 4000, qty }], shipping: 690, pi: `pi_${s}` });
    await run(completed(s));
    const [o] = await ordersFor(s);
    return { a, s, o, pi: `pi_${s}` };
  }
  const begin = (order: string, amount: number, extra: Record<string, unknown> = {}) => db.rpc<number>('begin_refund', {
    p_order_id: order, p_amount: amount, p_shipping: 0, p_reason: 'test', p_restock: false, p_restock_items: null, p_return_id: null, p_by: 'admin@exemple.fr', ...extra });

  test('remboursement total (articles + livraison) : commande « remboursée », second remboursement impossible', async () => {
    const { o } = await paidOrder();
    const id = await begin(o.id, 4690, { p_shipping: 690, p_restock: true });
    await db.rpc('finish_refund', { p_refund_id: id, p_status: 'succeeded', p_stripe_refund_id: `re_${id}` });
    const [after1] = await db.q<{ status: string; refunded_cents: number }>('select status, refunded_cents from orders where id = $1', [o.id]);
    assert.equal(after1.status, 'refunded');
    assert.equal(after1.refunded_cents, 4690);
    await assert.rejects(begin(o.id, 1), /MONTANT_INVALIDE:0/);
  });

  test('remboursement partiel + remise en stock des seuls articles retournés, une seule fois', async () => {
    const { a, o } = await paidOrder(3, 2);
    assert.equal(await stockOf(a), 1);
    const id = await begin(o.id, 4000, { p_restock: true, p_restock_items: [{ product_id: a, quantity: 1 }] });
    await db.rpc('finish_refund', { p_refund_id: id, p_status: 'succeeded', p_stripe_refund_id: `re_${id}` });
    await db.rpc('sync_stripe_refund', { p_stripe_refund_id: `re_${id}`, p_payment_intent: 'x', p_amount: 4000, p_status: 'succeeded', p_refund_id: id }); // webhook qui suit
    assert.equal(await stockOf(a), 2, 'une seule remise en stock');
    const [r] = await db.q<{ status: string; refunded_cents: number }>('select status, refunded_cents from orders where id = $1', [o.id]);
    assert.equal(r.refunded_cents, 4000);
    assert.equal(r.status, 'paid', 'commande partiellement remboursée, toujours à traiter');
  });

  test('double clic sur « Rembourser » (simultané) : un seul remboursement engagé', async () => {
    const { o } = await paidOrder();
    const tries = await Promise.allSettled([begin(o.id, 4690), begin(o.id, 4690), begin(o.id, 4690)]);
    assert.equal(tries.filter((t) => t.status === 'fulfilled').length, 1);
  });

  test('remboursement refusé par Stripe : montant à nouveau disponible', async () => {
    const { o } = await paidOrder();
    const id = await begin(o.id, 4690);
    await db.rpc('finish_refund', { p_refund_id: id, p_status: 'failed', p_stripe_refund_id: null, p_error: 'carte expirée' });
    assert.ok(await begin(o.id, 4690));
  });

  test('remboursement fait depuis le tableau de bord Stripe : repris dans l’historique, sans doublon', async () => {
    const { o, pi } = await paidOrder();
    const refund = { id: `re_${uid()}`, object: 'refund', amount: 1000, status: 'succeeded', payment_intent: pi, charge: `ch_${pi}`, metadata: {} };
    stripe.refunds.push(refund);
    const ev = { id: `evt_${uid()}`, type: 'charge.refunded', data: { object: { id: `ch_${pi}` } } };
    await run(ev); await run(ev);
    await run({ id: `evt_${uid()}`, type: 'refund.updated', data: { object: refund } });
    const rows = await db.q<{ source: string; amount_cents: number }>('select source, amount_cents from refunds where order_id = $1', [o.id]);
    assert.deepEqual(rows, [{ source: 'stripe', amount_cents: 1000 }]);
    assert.equal((await db.q<{ refunded_cents: number }>('select refunded_cents from orders where id = $1', [o.id]))[0].refunded_cents, 1000);
    // Puis Stripe signale l'échec du remboursement
    await run({ id: `evt_${uid()}`, type: 'refund.failed', data: { object: { ...refund, status: 'failed' } } });
    assert.equal((await db.q<{ refunded_cents: number }>('select refunded_cents from orders where id = $1', [o.id]))[0].refunded_cents, 0);
  });

  test('un retour ne peut être remboursé qu’une fois', async () => {
    const { o } = await paidOrder();
    const [ret] = await db.q<{ id: number }>(`insert into returns (order_id, email, items, reason) values ($1, 'c@exemple.fr', '[]', 'Ne me convient pas') returning id`, [o.id]);
    const id = await begin(o.id, 2000, { p_return_id: ret.id });
    await db.rpc('finish_refund', { p_refund_id: id, p_status: 'succeeded', p_stripe_refund_id: `re_${id}` });
    assert.equal((await db.q<{ status: string }>('select status from returns where id = $1', [ret.id]))[0].status, 'refunded');
    await assert.rejects(begin(o.id, 1000, { p_return_id: ret.id }), /RETOUR_DEJA_REMBOURSE/);
  });
});

describe('Droits d’accès', () => {
  for (const [fn, call] of [
    ['create_order_from_checkout', `public.create_order_from_checkout('{"stripe_session_id":"cs_pirate"}', '[]')`],
    ['reserve_stock', `public.reserve_stock(gen_random_uuid(), '[]')`],
    ['begin_refund', `public.begin_refund(gen_random_uuid(), 1, 0, '', false, null, null, '')`],
    ['stripe_event_begin', `public.stripe_event_begin('evt_pirate', 'x', null)`],
  ] as const) {
    test(`un visiteur ne peut pas appeler ${fn}`, async () => {
      const c = await db.pool.connect();
      try { await c.query('set role anon'); await assert.rejects(c.query(`select ${call}`), /permission denied/); }
      finally { await c.query('reset role'); c.release(); }
    });
  }
  test('un visiteur peut connaître le stock disponible', async () => {
    const a = await product('Visible', 2);
    const c = await db.pool.connect();
    try { await c.query('set role anon'); const { rows } = await c.query('select public.available_stock($1) as v', [a]); assert.equal(Number(rows[0].v), 2); }
    finally { await c.query('reset role'); c.release(); }
  });
  test('un visiteur ne lit ni les événements Stripe ni les remboursements', async () => {
    const c = await db.pool.connect();
    try {
      await c.query('set role anon');
      for (const t of ['stripe_events', 'refunds', 'stock_reservations']) {
        const r = await c.query(`select count(*)::int as n from ${t}`).catch((e) => ({ rows: [{ n: `refus ${e.message}` }] }));
        assert.ok(r.rows[0].n === 0 || String(r.rows[0].n).startsWith('refus'), `${t} lisible : ${r.rows[0].n}`);
      }
    } finally { await c.query('reset role'); c.release(); }
  });
});
