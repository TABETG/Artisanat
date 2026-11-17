// Calcul des frais de livraison (même code côté panier et côté serveur).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_METHODS, DEFAULT_ZONES, quoteShipping } from '../src/shipping';

const line = (price_cents: number, quantity = 1) => ({ price_cents, quantity, width_cm: null, length_cm: null });

test('France : point relais et Colissimo proposés, du moins cher au plus cher', () => {
  const q = quoteShipping('FR', [line(4500)], DEFAULT_ZONES, DEFAULT_METHODS);
  assert.deepEqual(q.map((x) => [x.method.id, x.cents]), [['relais', 690], ['domicile', 1500]]);
});

test('livraison offerte au-delà du seuil configuré', () => {
  const q = quoteShipping('FR', [line(16000)], DEFAULT_ZONES, DEFAULT_METHODS);
  assert.equal(q.find((x) => x.method.id === 'relais')!.cents, 0);
  assert.equal(q.find((x) => x.method.id === 'domicile')!.cents, 1500, 'seuil Colissimo non atteint');
});

test('seuil calculé sur le panier entier (plusieurs articles)', () => {
  const q = quoteShipping('FR', [line(10000), line(10000, 2)], DEFAULT_ZONES, DEFAULT_METHODS);
  assert.ok(q.every((x) => x.cents === 0));
});

test('mode désactivé dans l’administration : non proposé', () => {
  const methods = DEFAULT_METHODS.map((m) => (m.id === 'relais' ? { ...m, active: false } : m));
  assert.deepEqual(quoteShipping('FR', [line(4500)], DEFAULT_ZONES, methods).map((x) => x.method.id), ['domicile']);
});

test('tarif modifié dans l’administration : pris en compte', () => {
  const methods = DEFAULT_METHODS.map((m) => (m.id === 'domicile' ? { ...m, prices: { ...m.prices, france: 990 } } : m));
  assert.equal(quoteShipping('FR', [line(4500)], DEFAULT_ZONES, methods).find((x) => x.method.id === 'domicile')!.cents, 990);
});

test('pays non desservi : aucun mode', () => {
  assert.deepEqual(quoteShipping('JP', [line(4500)], DEFAULT_ZONES, DEFAULT_METHODS), []);
});
