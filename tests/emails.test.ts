// Emails envoyés au client lors d'une annulation ou d'un remboursement.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cancelledEmail, refundEmail, type MailTools } from '../netlify/shared/order-emails';

const mail: MailTools = { layout: (t, p) => `<h1>${t}</h1>${p.join('|')}`, url: (p) => `https://boutique.test${p}`, shopName: 'Artisanat' };
const order = { id: 'abcdef12-0000-0000-0000-000000000000', email: 'client@exemple.fr', shipping_name: 'Marie Durand' };

test('annulation : numéro de commande, remboursement sous 14 jours', () => {
  const e = cancelledEmail(order, mail);
  assert.equal(e.to, 'client@exemple.fr');
  assert.equal(e.subject, 'Commande n° ABCDEF12 annulée');
  assert.match(e.text, /Bonjour Marie Durand,/);
  assert.match(e.text, /intégralement remboursé.*14 jours/);
});

test('remboursement total : montant et frais de livraison', () => {
  const e = refundEmail(order, { amountCents: 5190, shippingCents: 690, full: true }, mail);
  assert.equal(e.subject, 'Remboursement de 51,90 € — commande n° ABCDEF12');
  assert.match(e.text, /Nous avons remboursé votre commande n° ABCDEF12 : 51,90 €/);
  assert.match(e.text, /6,90 € de frais de livraison/);
  assert.match(e.text, /5 à 10 jours ouvrés/);
});

test('remboursement partiel, sans frais de livraison, client sans nom', () => {
  const e = refundEmail({ ...order, shipping_name: null }, { amountCents: 1000, shippingCents: 0, full: false }, mail);
  assert.match(e.text, /^Bonjour,/);
  assert.match(e.text, /remboursement partiel de 10,00 €/);
  assert.doesNotMatch(e.text, /frais de livraison/);
});

test('message client : point relais et message cadeau regroupés', async () => {
  const { customerMessage } = await import('../netlify/shared/stripe-processing');
  const field = (key: string, value: string) => ({ key, type: 'text', text: { value } });
  const s = (fields: unknown[]) => ({ custom_fields: fields }) as never;
  assert.equal(customerMessage(s([])), null);
  assert.equal(customerMessage(s([field('relais', ' Tabac du centre, Lyon ')])), 'Point relais souhaité : Tabac du centre, Lyon');
  assert.equal(customerMessage(s([field('message', 'Joyeux anniversaire'), field('relais', 'Lyon 3')])), 'Joyeux anniversaire\nPoint relais souhaité : Lyon 3');
});
