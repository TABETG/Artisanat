// Mode démonstration : une fausse base de données enregistrée dans le navigateur.
// Permet de tester la boutique ET l'espace vendeur sans rien configurer.
import { Order, Product, Review, ShopSettings, StockAlert } from '../types';
import { DEMO_ALERTS, DEMO_EXTRA_ORDERS, DEMO_ORDERS, DEMO_PRODUCTS, DEMO_REVIEWS } from './demo';
import { DEFAULT_SETTINGS } from '../settings';

const KEY = 'artisanat-demo-v4';
const AUTH_KEY = 'artisanat-demo-connecte';

export interface DemoDB { products: Product[]; orders: Order[]; alerts: StockAlert[]; reviews: Review[]; settings: ShopSettings }

let cache: DemoDB | null = null;

function seed(): DemoDB {
  return structuredClone({ products: DEMO_PRODUCTS, orders: [...DEMO_ORDERS, ...DEMO_EXTRA_ORDERS], alerts: DEMO_ALERTS, reviews: DEMO_REVIEWS,
    settings: { ...DEFAULT_SETTINGS, announcement: 'Livraison offerte dès 300 € — tapis tissés à la main depuis 1982', announcement_active: true } });
}

export function demoDB(): DemoDB {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as DemoDB) : seed();
  } catch {
    cache = seed();
  }
  return cache;
}

export function demoSave(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(demoDB()));
  } catch {
    throw new Error('Mémoire de démonstration pleine : supprimez un produit ou réinitialisez la démonstration.');
  }
}

export function demoReset(): void {
  cache = seed();
  try { localStorage.removeItem(KEY); } catch { /* ignoré */ }
}

export const demoAuth = {
  isLoggedIn: () => { try { return sessionStorage.getItem(AUTH_KEY) === '1'; } catch { return false; } },
  set: (value: boolean) => {
    try { if (value) sessionStorage.setItem(AUTH_KEY, '1'); else sessionStorage.removeItem(AUTH_KEY); } catch { /* ignoré */ }
    window.dispatchEvent(new Event('artisanat-demo-auth'));
  },
};

export const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));
