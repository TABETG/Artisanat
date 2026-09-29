// Frais d'envoi des artisans : chacun expédie ses propres pièces, à son tarif.
import { zoneFor, type ShippingZone } from './shipping';

export interface SellerShippingRules {
  shipping_france_cents: number;
  shipping_europe_cents: number | null;   // hors France ; null = ne livre qu'en France
  free_shipping_from_cents: number | null;
}

/** Prix d'envoi d'un artisan pour ce pays ; null s'il ne livre pas ce pays. */
export function sellerShippingCents(s: SellerShippingRules, country: string, subtotalCents: number, zones: ShippingZone[]): number | null {
  const zone = zoneFor(country, zones);
  if (!zone) return null;
  const base = zone.id === 'france' ? s.shipping_france_cents : s.shipping_europe_cents;
  if (base == null) return null;
  if (s.free_shipping_from_cents && subtotalCents >= s.free_shipping_from_cents) return 0;
  return base;
}
