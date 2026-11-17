import { CATEGORIES, guessKind, SHOP } from './config';
import { DEFAULT_METHODS, DEFAULT_ZONES, SHIPPING } from './shipping';
import { ShopSettings } from './types';

export const DEFAULT_SETTINGS: ShopSettings = {
  announcement: '',
  announcement_active: false,
  shipping_cents: SHIPPING.priceCents,
  free_shipping_from_cents: SHIPPING.freeFromCents,
  shipping_min_days: SHIPPING.minDays,
  shipping_max_days: SHIPPING.maxDays,
  email: SHOP.email,
  phone: SHOP.phone,
  whatsapp: SHOP.whatsapp,
  address: SHOP.address,
  instagram: SHOP.instagram,
  facebook: SHOP.facebook,
  categories: CATEGORIES.map((c) => ({ ...c })),
  hero_title: 'L’artisanat berbère, fait main, pièce après pièce.',
  hero_subtitle: `Tapis en pure laine, bijoux kabyles, khôl et rouge traditionnel : des créations faites à la main depuis ${SHOP.since}, livrées chez vous.`,
  story: `Tout commence en ${SHOP.since}, autour d’un métier à tisser familial. Depuis, le geste n’a pas changé : la laine de mouton est lavée, cardée, filée puis teinte avant d’être nouée fil à fil.

Nos tapis reprennent les motifs transmis de génération en génération : losanges, chevrons, lignes brisées. Chaque tisserande y laisse sa marque, si bien qu’aucune pièce n’est la copie d’une autre.

Texte à personnaliser dans Espace vendeur → Réglages : racontez ici l’histoire de votre famille et de votre atelier.`,
  gift_message_enabled: true,
  new_days: 30,
  express_enabled: false,
  express_cents: 2900,
  express_min_days: 1,
  express_max_days: 2,
  pickup_enabled: false,
  pickup_details: 'Sur rendez-vous à l’atelier.',
  installments_enabled: false,
  installments_min_cents: 10000,
  announcement_ends_at: null,
  shipping_zones: DEFAULT_ZONES,
  shipping_methods: DEFAULT_METHODS,
  preparation_days: 2,
  marketplace_enabled: true,
  marketplace_commission_percent: 15,
  mediator: '',
};

/** Transforme un libellé en identifiant d'adresse : « Poufs & galettes » → « poufs-galettes ». */
export function slugify(label: string): string {
  return label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

/** Complète les réglages enregistrés avec les valeurs par défaut (champs ajoutés plus tard). */
export function withDefaults(data: Partial<ShopSettings> | null | undefined): ShopSettings {
  const merged = { ...DEFAULT_SETTINGS, ...(data ?? {}) };
  // Catégories enregistrées avant l'ajout des types : type deviné, et nouvelles catégories Bijoux / Beauté ajoutées
  merged.categories = merged.categories.map((c) => ({ ...c, kind: c.kind ?? guessKind(c.id) }));
  for (const extra of CATEGORIES.filter((c) => c.kind === 'bijou' || c.kind === 'cosmetique')) {
    if (!merged.categories.some((c) => c.id === extra.id || c.kind === extra.kind)) merged.categories.push({ ...extra });
  }
  // Réglages d'avant la version 12 : on reprend l'ancien tarif unique, l'express et le retrait
  if (data && !data.shipping_methods) {
    merged.shipping_methods = DEFAULT_METHODS.map((m) => {
      if (m.id === 'domicile') return { ...m, prices: { ...m.prices, france: merged.shipping_cents }, free_from_cents: merged.free_shipping_from_cents || null, min_days: merged.shipping_min_days, max_days: merged.shipping_max_days };
      if (m.id === 'express') return { ...m, active: merged.express_enabled, prices: { ...m.prices, france: merged.express_cents }, min_days: merged.express_min_days, max_days: merged.express_max_days };
      if (m.id === 'retrait') return { ...m, active: merged.pickup_enabled, description: merged.pickup_details || m.description };
      return m;
    });
  }
  return merged;
}

/** Montant le plus bas qui donne la livraison offerte en France (pour les messages « offerte dès … »). */
export function freeShippingThreshold(s: ShopSettings, zoneId = 'france'): number | null {
  const values = s.shipping_methods.filter((m) => m.active && m.prices[zoneId] != null && m.free_from_cents).map((m) => m.free_from_cents as number);
  return values.length ? Math.min(...values) : null;
}

/** Prix le plus bas d'un envoi en France (pour « livraison dès … »). */
export function cheapestShipping(s: ShopSettings, zoneId = 'france'): number | null {
  const values = s.shipping_methods.filter((m) => m.active && m.prices[zoneId] != null).map((m) => m.prices[zoneId] as number);
  return values.length ? Math.min(...values) : null;
}
