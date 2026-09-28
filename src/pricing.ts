// Règles de prix partagées entre la boutique et le serveur de paiement.
export interface Priced { price_cents: number; compare_at_price_cents: number | null; promo_ends_at?: string | null }

export function isPromoExpired(p: Priced, now = Date.now()): boolean {
  return !!p.promo_ends_at && new Date(p.promo_ends_at).getTime() < now;
}

/** Promotion terminée → le prix d'origine revient tout seul, sans action du vendeur. */
export function applyPromoExpiry<T extends Priced>(p: T, now = Date.now()): T {
  if (!isPromoExpired(p, now) || !p.compare_at_price_cents || p.compare_at_price_cents <= p.price_cents) return p;
  return { ...p, price_cents: p.compare_at_price_cents, compare_at_price_cents: null, promo_ends_at: null };
}

export function effectivePrice(p: Priced, now = Date.now()): number {
  return applyPromoExpiry(p, now).price_cents;
}
