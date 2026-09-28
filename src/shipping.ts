// Valeurs par défaut — le propriétaire les modifie ensuite dans Espace vendeur → Réglages.
export const SHIPPING = {
  priceCents: 1500,          // 15 € de livraison suivie
  freeFromCents: 30000,      // offerte dès 300 € d'achat
  minDays: 3,
  maxDays: 7,
  // Pays où vous acceptez de livrer (codes ISO)
  countries: ['FR', 'BE', 'LU', 'CH', 'MC', 'DE', 'NL', 'ES', 'IT', 'PT'] as const,
};

export interface ShippingRules { shipping_cents: number; free_shipping_from_cents: number }

export function shippingFor(subtotalCents: number, rules?: ShippingRules): number {
  const price = rules?.shipping_cents ?? SHIPPING.priceCents;
  const free = rules?.free_shipping_from_cents ?? SHIPPING.freeFromCents;
  return free > 0 && subtotalCents >= free ? 0 : price;
}
