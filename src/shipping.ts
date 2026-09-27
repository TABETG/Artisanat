// Partagé entre le site et le serveur de paiement : une seule source de vérité.
export const SHIPPING = {
  priceCents: 1500,          // 15 € de livraison suivie
  freeFromCents: 30000,      // offerte dès 300 € d'achat
  minDays: 3,
  maxDays: 7,
  // Pays où vous acceptez de livrer (codes ISO)
  countries: ['FR', 'BE', 'LU', 'CH', 'MC', 'DE', 'NL', 'ES', 'IT', 'PT'] as const,
};

export function shippingFor(subtotalCents: number): number {
  return subtotalCents >= SHIPPING.freeFromCents ? 0 : SHIPPING.priceCents;
}
