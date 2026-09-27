// Mode démonstration : une fausse base de données enregistrée dans le navigateur.
// Permet de tester la boutique ET l'espace vendeur sans rien configurer.
import { Order, Product, StockAlert } from '../types';
import { DEMO_ALERTS, DEMO_ORDERS, DEMO_PRODUCTS } from './demo';

const KEY = 'tamurt-demo-v2';
const AUTH_KEY = 'tamurt-demo-connecte';

export interface DemoDB { products: Product[]; orders: Order[]; alerts: StockAlert[] }

let cache: DemoDB | null = null;

function seed(): DemoDB {
  return structuredClone({ products: DEMO_PRODUCTS, orders: DEMO_ORDERS, alerts: DEMO_ALERTS });
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
    window.dispatchEvent(new Event('tamurt-demo-auth'));
  },
};

export const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));
