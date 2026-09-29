// Mode démonstration : une fausse base de données enregistrée dans le navigateur.
// Permet de tester la boutique ET l'espace vendeur sans rien configurer.
import { Seller, SellerPrivate, SellerTransfer, ContactMessage, Campaign, ReturnRequest, CustomRequest, GiftCard, Order, Product, PromoCode, Review, ShopSettings, StockAlert, Subscriber } from '../types';
import { DEMO_ALERTS, DEMO_EXTRA_ORDERS, DEMO_ORDERS, DEMO_PRODUCTS, DEMO_REVIEWS, DEMO_SELLERS, DEMO_SELLER_PRIVATE, DEMO_SELLER_PRODUCTS, DEMO_SELLER_ORDER } from './demo';
import { DEFAULT_SETTINGS } from '../settings';

const KEY = 'artisanat-demo-v15';
const AUTH_KEY = 'artisanat-demo-connecte';

export interface DemoDB { products: Product[]; orders: Order[]; alerts: StockAlert[]; reviews: Review[]; settings: ShopSettings; subscribers: Subscriber[]; promoCodes: PromoCode[]; customRequests: CustomRequest[]; giftCards: GiftCard[]; returns: ReturnRequest[]; campaigns: Campaign[]; messages: ContactMessage[];
  sellers: Seller[]; sellerPrivate: SellerPrivate[];
  shipments: { order_id: string; seller_id: string; shipping_cents: number; status: 'to_ship' | 'shipped' | 'delivered'; carrier: string | null; tracking_number: string | null; shipped_at: string | null }[];
  transfers: SellerTransfer[];
  team?: { user_id: string; email: string; last_sign_in_at: string | null; me: boolean }[]; activity?: { id: number; user_email: string | null; action: string; created_at: string }[] }

let cache: DemoDB | null = null;

function seed(): DemoDB {
  return structuredClone({ products: [...DEMO_PRODUCTS, ...DEMO_SELLER_PRODUCTS], orders: [DEMO_SELLER_ORDER, ...DEMO_ORDERS, ...DEMO_EXTRA_ORDERS],
    sellers: DEMO_SELLERS, sellerPrivate: DEMO_SELLER_PRIVATE,
    shipments: [{ order_id: DEMO_SELLER_ORDER.id, seller_id: 'seller-fatima', shipping_cents: 900, status: 'to_ship' as const, carrier: null, tracking_number: null, shipped_at: null }],
    transfers: [{ id: 1, order_id: DEMO_SELLER_ORDER.id, seller_id: 'seller-fatima', sales_cents: 7800, shipping_cents: 900, commission_cents: 1170, amount_cents: 7530, stripe_transfer_id: 'tr_demo', created_at: DEMO_SELLER_ORDER.created_at }], alerts: DEMO_ALERTS, reviews: DEMO_REVIEWS,
    returns: [
      { id: 1, order_id: 'demo-cmd-2', email: 'thomas.dubois@exemple.fr', items: [{ name: 'Coussin en laine tissée', quantity: 1 }],
        reason: 'Ne me convient pas (couleurs, taille…)', comment: 'Le rouge est plus vif que je pensais pour mon salon.', status: 'new', note: null,
        created_at: new Date(Date.now() - 2 * 3600000).toISOString() },
    ],
    messages: [{ id: 1, name: 'Inès M.', email: 'ines.m@exemple.fr', subject: 'Question sur le Beni Ouarain', message: 'Bonjour, le tapis perd-il ses poils les premières semaines ? Merci !', handled: false, created_at: new Date(Date.now() - 5 * 3600000).toISOString() }],
    campaigns: [{ id: 1, subject: 'Nouvelle collection de kilims', sent_count: 2, created_at: '2026-09-05T09:00:00Z' }],
    customRequests: [
      { id: 1, name: 'Hélène Garnier', email: 'helene.g@exemple.fr', phone: '+33 6 22 33 44 55', product_id: 'demo-2', room: 'Salon', width_cm: 250, length_cm: 350,
        colors: 'Écru et brun, comme le Beni Ouarain', budget: '1 500 à 2 000 €', message: 'Bonjour, j’adore le Beni Ouarain mais il me faudrait plus grand pour mon salon. Quel délai ?',
        status: 'new', note: null, created_at: new Date(Date.now() - 86400000).toISOString() },
    ],
    giftCards: [
      { id: 'gc-1', code: 'CADEAU-7K2P-Q9XM', amount_cents: 10000, buyer_name: 'Julien Perrin', buyer_email: 'julien.p@exemple.fr', recipient_name: 'Camille',
        recipient_email: 'camille@exemple.fr', message: 'Joyeux anniversaire !', expires_at: new Date(Date.now() + 330 * 86400000).toISOString(), created_at: '2026-09-10T10:00:00Z', used: false },
    ],
    promoCodes: [
      { id: 'promo_demo_1', code: 'BIENVENUE10', percent_off: 10, amount_off_cents: null, active: true, times_redeemed: 4, max_redemptions: null, expires_at: null, minimum_amount_cents: null, created_at: '2026-09-01T10:00:00Z' },
      { id: 'promo_demo_2', code: 'TAPIS50', percent_off: null, amount_off_cents: 5000, active: true, times_redeemed: 1, max_redemptions: 20, expires_at: new Date(Date.now() + 20 * 86400000).toISOString(), minimum_amount_cents: 40000, created_at: '2026-09-15T10:00:00Z' },
    ],
    subscribers: [{ id: 1, email: 'sophie.l@exemple.fr', created_at: '2026-09-20T10:00:00Z' }, { id: 2, email: 'marc.v@exemple.fr', created_at: '2026-09-24T10:00:00Z' }],
    settings: { ...DEFAULT_SETTINGS, shipping_methods: DEFAULT_SETTINGS.shipping_methods.map((m) => ({ ...m, active: true })), announcement_ends_at: new Date(Date.now() + 3 * 86400000 + 5 * 3600000).toISOString(), express_enabled: true, pickup_enabled: true, installments_enabled: true, announcement: 'Vente d’automne : −15 % sur les kilims', announcement_active: true } });
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
