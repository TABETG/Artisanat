// Badges affichés sur les produits : certains sont automatiques, d'autres choisis par le vendeur.
import { Product } from './types';

export type BadgeTone = 'promo' | 'best' | 'new' | 'love' | 'dark' | 'light' | 'gold' | 'green';

export interface Badge { id: string; label: string; tone: BadgeTone; auto: boolean; hint?: string }

/** Badges que le vendeur peut cocher sur un produit. */
export const MANUAL_BADGES: { id: string; label: string; tone: BadgeTone; description: string }[] = [
  { id: 'coup-de-coeur', label: 'Coup de cœur', tone: 'love', description: 'Une pièce que vous aimez particulièrement.' },
  { id: 'meilleur-prix', label: 'Meilleur prix', tone: 'gold', description: 'Prix le plus bas pour ce type de pièce.' },
  { id: 'edition-limitee', label: 'Édition limitée', tone: 'dark', description: 'Série courte, ne sera pas refaite.' },
  { id: 'exclusivite', label: 'Exclusivité', tone: 'dark', description: 'Disponible uniquement sur ce site.' },
  { id: 'piece-ancienne', label: 'Pièce ancienne', tone: 'light', description: 'Tapis vintage ou de collection.' },
  { id: 'teinture-vegetale', label: 'Teintures végétales', tone: 'green', description: 'Couleurs obtenues avec des plantes.' },
  { id: 'prix-choc', label: 'Prix choc', tone: 'promo', description: 'Pour une vente flash ou un déstockage.' },
  { id: 'derniere-chance', label: 'Dernière chance', tone: 'promo', description: 'Bientôt retiré de la boutique.' },
];

export interface BadgeContext { bestSellerIds: Set<string>; newDays: number; now?: number }

export function discountOf(p: Product): number | null {
  return p.compare_at_price_cents && p.compare_at_price_cents > p.price_cents
    ? Math.round((1 - p.price_cents / p.compare_at_price_cents) * 100) : null;
}

export function isNew(p: Product, newDays: number, now = Date.now()): boolean {
  return newDays > 0 && now - new Date(p.created_at).getTime() < newDays * 86400000;
}

/** Les 3 produits les plus vendus (au moins 2 ventes) reçoivent « Meilleure vente ». */
export function bestSellers(products: Product[]): Set<string> {
  return new Set(products.filter((p) => (p.sales_count ?? 0) >= 2).sort((a, b) => b.sales_count - a.sales_count).slice(0, 3).map((p) => p.id));
}

/** Tous les badges d'un produit, du plus important au moins important. */
export function computeBadges(p: Product, ctx: BadgeContext): Badge[] {
  const now = ctx.now ?? Date.now();
  const out: Badge[] = [];
  const off = discountOf(p);
  if (p.stock === 0) out.push({ id: 'rupture', label: 'Rupture de stock', tone: 'dark', auto: true });
  if (off) out.push({ id: 'promo', label: `−${off} %`, tone: 'promo', auto: true, hint: 'Promotion' });
  if (off && p.promo_ends_at) {
    const days = Math.ceil((new Date(p.promo_ends_at).getTime() - now) / 86400000);
    if (days >= 0 && days <= 7) out.push({ id: 'fin-promo', label: days <= 1 ? 'Dernier jour' : `Fin dans ${days} jours`, tone: 'promo', auto: true });
  }
  if (ctx.bestSellerIds.has(p.id)) out.push({ id: 'meilleure-vente', label: 'Meilleure vente', tone: 'best', auto: true });
  for (const id of p.badges ?? []) {
    const b = MANUAL_BADGES.find((x) => x.id === id);
    if (b) out.push({ id: b.id, label: b.label, tone: b.tone, auto: false });
  }
  if (isNew(p, ctx.newDays, now)) out.push({ id: 'nouveau', label: 'Nouveauté', tone: 'new', auto: true });
  if (p.made_to_order) out.push({ id: 'sur-mesure', label: 'Sur mesure possible', tone: 'light', auto: true });
  if (p.stock === 1) out.push({ id: 'unique', label: 'Pièce unique', tone: 'light', auto: true });
  else if (p.stock > 1 && p.stock <= (p.low_stock_threshold || 2)) out.push({ id: 'stock-bas', label: `Plus que ${p.stock}`, tone: 'light', auto: true });
  return out;
}

export const BADGE_TONES: Record<BadgeTone, string> = {
  promo: 'bg-garance text-laine',
  best: 'bg-safran text-nuit',
  new: 'bg-menthe text-laine',
  love: 'bg-[#F4D9D6] text-garance',
  dark: 'bg-nuit text-laine',
  light: 'bg-laine text-nuit',
  gold: 'bg-[#FBEBC5] text-nuit',
  green: 'bg-[#DCEBE2] text-menthe',
};
