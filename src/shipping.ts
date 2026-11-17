// ==========================================================================
// Livraison : zones, modes et calcul des frais.
// Partagé entre la boutique (estimation dans le panier) et le serveur de paiement (montant facturé).
// ==========================================================================

/** Valeurs par défaut historiques (réglages avant la version 12). */
export const SHIPPING = { priceCents: 1500, freeFromCents: 30000, minDays: 3, maxDays: 7 };

/** Pays proposés dans les réglages et le panier (codes ISO acceptés par Stripe). */
export const COUNTRIES: { code: string; name: string }[] = [
  { code: 'FR', name: 'France' }, { code: 'MC', name: 'Monaco' }, { code: 'BE', name: 'Belgique' }, { code: 'LU', name: 'Luxembourg' },
  { code: 'CH', name: 'Suisse' }, { code: 'DE', name: 'Allemagne' }, { code: 'NL', name: 'Pays-Bas' }, { code: 'ES', name: 'Espagne' },
  { code: 'IT', name: 'Italie' }, { code: 'PT', name: 'Portugal' }, { code: 'AT', name: 'Autriche' }, { code: 'IE', name: 'Irlande' },
  { code: 'DK', name: 'Danemark' }, { code: 'SE', name: 'Suède' }, { code: 'FI', name: 'Finlande' }, { code: 'PL', name: 'Pologne' },
  { code: 'GR', name: 'Grèce' }, { code: 'GB', name: 'Royaume-Uni' }, { code: 'NO', name: 'Norvège' }, { code: 'US', name: 'États-Unis' },
  { code: 'CA', name: 'Canada' }, { code: 'AE', name: 'Émirats arabes unis' }, { code: 'MA', name: 'Maroc' }, { code: 'DZ', name: 'Algérie' },
  { code: 'TN', name: 'Tunisie' }, { code: 'AU', name: 'Australie' }, { code: 'JP', name: 'Japon' },
];
export const countryName = (code: string) => COUNTRIES.find((c) => c.code === code)?.name ?? code;

export interface ShippingZone { id: string; label: string; countries: string[] }

export type ShippingKind = 'domicile' | 'relais' | 'express' | 'retrait' | 'transporteur';

export interface ShippingMethod {
  id: string;
  name: string;                        // « Colissimo à domicile »
  description: string;                 // affiché dans le panier
  kind: ShippingKind;
  active: boolean;
  prices: Record<string, number | null>;  // prix par zone (centimes) ; null = non proposé dans cette zone
  free_from_cents: number | null;      // offerte à partir de ce montant (null = jamais)
  oversize_cents: number;              // supplément par grand tapis (plus de 3 m²)
  allow_oversize?: boolean;            // false = mode refusé pour les grands tapis (ex. point relais)
  min_days: number;
  max_days: number;
}

export const KIND_LABELS: Record<ShippingKind, string> = {
  domicile: 'À domicile',
  relais: 'Point relais',
  express: 'Express',
  retrait: 'Retrait sur place',
  transporteur: 'Transporteur (grands tapis)',
};

export const DEFAULT_ZONES: ShippingZone[] = [
  { id: 'france', label: 'France métropolitaine', countries: ['FR', 'MC'] },
  { id: 'europe', label: 'Europe', countries: ['BE', 'LU', 'DE', 'NL', 'ES', 'IT', 'PT', 'AT', 'IE', 'DK', 'SE', 'FI'] },
  { id: 'proche', label: 'Suisse et Royaume-Uni', countries: ['CH', 'GB'] },
  { id: 'monde', label: 'Reste du monde', countries: ['US', 'CA', 'AE', 'MA'] },
];

export const DEFAULT_METHODS: ShippingMethod[] = [
  { id: 'relais', name: 'Point relais', description: 'Mondial Relay : retrait dans un commerce près de chez vous. Nous vous écrivons pour choisir le point.', kind: 'relais', active: true,
    prices: { france: 690, europe: 1290, proche: null, monde: null }, free_from_cents: 15000, oversize_cents: 0, allow_oversize: false, min_days: 3, max_days: 6 },
  { id: 'domicile', name: 'Colissimo à domicile', description: 'Livraison suivie, remise contre signature.', kind: 'domicile', active: true,
    prices: { france: 1500, europe: 2900, proche: 3900, monde: 6900 }, free_from_cents: 30000, oversize_cents: 2000, min_days: 3, max_days: 7 },
  { id: 'express', name: 'Chronopost express', description: 'Livré en 24 à 48 heures ouvrées.', kind: 'express', active: false,
    prices: { france: 2900, europe: 4900, proche: null, monde: null }, free_from_cents: null, oversize_cents: 3000, min_days: 1, max_days: 2 },
  { id: 'retrait', name: 'Retrait à l’atelier', description: 'Gratuit, sur rendez-vous.', kind: 'retrait', active: false,
    prices: { france: 0, europe: null, proche: null, monde: null }, free_from_cents: null, oversize_cents: 0, min_days: 1, max_days: 3 },
];

/** Un article est « volumineux » au-delà de 3 m² (supplément de transport). */
export const OVERSIZE_M2 = 3;
export interface ShippedLine { quantity: number; price_cents: number; width_cm?: number | null; length_cm?: number | null }
export const isOversize = (l: { width_cm?: number | null; length_cm?: number | null }) =>
  !!l.width_cm && !!l.length_cm && (l.width_cm * l.length_cm) / 10000 > OVERSIZE_M2;

export function zoneFor(country: string, zones: ShippingZone[]): ShippingZone | null {
  return zones.find((z) => z.countries.includes(country)) ?? null;
}

export interface ShippingQuote { method: ShippingMethod; cents: number; free: boolean; oversizeCount: number }

/** Prix de chaque mode disponible pour ce pays et ce panier, du moins cher au plus cher. */
export function quoteShipping(country: string, lines: ShippedLine[], zones: ShippingZone[], methods: ShippingMethod[]): ShippingQuote[] {
  const zone = zoneFor(country, zones);
  if (!zone) return [];
  const subtotal = lines.reduce((n, l) => n + l.price_cents * l.quantity, 0);
  const oversizeCount = lines.reduce((n, l) => n + (isOversize(l) ? l.quantity : 0), 0);
  return methods
    .filter((m) => m.active && m.prices[zone.id] != null && (oversizeCount === 0 || m.allow_oversize !== false))
    .map((m) => {
      const free = m.free_from_cents != null && m.free_from_cents > 0 && subtotal >= m.free_from_cents;
      const base = free ? 0 : (m.prices[zone.id] as number);
      const cents = base + (m.kind === 'retrait' ? 0 : oversizeCount * m.oversize_cents);
      return { method: m, cents, free, oversizeCount };
    })
    // Livraisons d'abord (de la moins chère à la plus chère), retrait sur place en dernier
    .sort((a, b) => Number(a.method.kind === 'retrait') - Number(b.method.kind === 'retrait') || a.cents - b.cents || a.method.max_days - b.method.max_days);
}

/** Tous les pays desservis par au moins un mode actif. */
export function servedCountries(zones: ShippingZone[], methods: ShippingMethod[]): string[] {
  const active = methods.filter((m) => m.active);
  return zones.filter((z) => active.some((m) => m.prices[z.id] != null)).flatMap((z) => z.countries);
}

/** Date de livraison estimée : ajoute des jours ouvrés (hors samedi et dimanche). */
export function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from);
  let left = days;
  while (left > 0) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) left--; }
  return d;
}

/** Compatibilité : ancien calcul simple (frais uniques) utilisé si aucun mode n'est configuré. */
export interface ShippingRules { shipping_cents: number; free_shipping_from_cents: number }
export function shippingFor(subtotalCents: number, rules?: ShippingRules): number {
  const price = rules?.shipping_cents ?? SHIPPING.priceCents;
  const free = rules?.free_shipping_from_cents ?? SHIPPING.freeFromCents;
  return free > 0 && subtotalCents >= free ? 0 : price;
}
