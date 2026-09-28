import { CATEGORIES, SHOP } from './config';
import { SHIPPING } from './shipping';
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
  categories: CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
  hero_title: 'Des tapis tissés à la main, nœud après nœud.',
  hero_subtitle: `Tapis berbères, coussins et plaids en pure laine. Des pièces faites à la main depuis ${SHOP.since}, livrées chez vous.`,
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
};

/** Transforme un libellé en identifiant d'adresse : « Poufs & galettes » → « poufs-galettes ». */
export function slugify(label: string): string {
  return label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

/** Complète les réglages enregistrés avec les valeurs par défaut (champs ajoutés plus tard). */
export function withDefaults(data: Partial<ShopSettings> | null | undefined): ShopSettings {
  return { ...DEFAULT_SETTINGS, ...(data ?? {}) };
}
