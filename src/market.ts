// Deux boutiques dans un seul site : France (euros, paiement Stripe) et Algérie (dinars, paiement à la livraison).
export type Market = 'fr' | 'dz';

export const MARKETS: Record<Market, { label: string; currency: 'EUR' | 'DZD'; payment: string }> = {
  fr: { label: 'France', currency: 'EUR', payment: 'Paiement sécurisé par carte' },
  dz: { label: 'Algérie', currency: 'DZD', payment: 'Paiement à la livraison' },
};

const KEY = 'artisanat-boutique';
let current: Market = 'fr';
try {
  const fromUrl = new URLSearchParams(window.location.search).get('boutique');
  const saved = localStorage.getItem(KEY);
  current = fromUrl === 'dz' || fromUrl === 'fr' ? fromUrl : saved === 'dz' ? 'dz' : 'fr';
} catch { /* navigation privée */ }

/** Boutique choisie par le visiteur (lue par l'API et par le format des prix). */
export const currentMarket = (): Market => current;
export const hasChosenMarket = (): boolean => { try { return !!localStorage.getItem(KEY) || !!new URLSearchParams(window.location.search).get('boutique'); } catch { return true; } };

export function setCurrentMarket(m: Market): void {
  current = m;
  try { localStorage.setItem(KEY, m); } catch { /* ignoré */ }
  window.dispatchEvent(new Event('artisanat-boutique'));
}

/** Tarif de livraison d'une wilaya (centimes de dinar ; null = non desservi). */
export interface DzRate { code: number; name: string; home_cents: number | null; desk_cents: number | null; active: boolean }

/** Numéro mobile algérien : 05, 06 ou 07 suivi de 8 chiffres (ou +213). */
export const isDzPhone = (v: string) => /^(?:\+213|00213|0)(5|6|7)\d{8}$/.test(v.replace(/[\s.-]/g, ''));
