import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Product } from '../types';
import { trackProduct } from '../lib/api';
import { currentMarket, Market } from '../market';

export interface CartLine {
  id: string;
  name: string;
  price_cents: number;
  image: string | null;
  stock: number;
  quantity: number;
  width_cm?: number | null;
  length_cm?: number | null;
  seller_id?: string | null;
}

interface CartValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  /** Nom du dernier article ajouté (affiché en confirmation dans le panier) */
  lastAdded: string | null;
  open: () => void;
  close: () => void;
  add: (p: Product, quantity?: number) => void;
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  /** Pays et mode de livraison choisis dans le panier */
  country: string;
  setCountry: (c: string) => void;
  methodId: string | null;
  setMethodId: (id: string | null) => void;
}

const CartContext = createContext<CartValue | null>(null);
// Un panier par boutique : les articles de France et d'Algérie ne se mélangent pas
const storageKey = (m: Market) => (m === 'fr' ? 'artisanat-panier' : `artisanat-panier-${m}`);

function load(m: Market = currentMarket()): CartLine[] {
  try {
    const raw = localStorage.getItem(storageKey(m));
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [market, setMarket] = useState<Market>(currentMarket);
  const [lines, setLines] = useState<CartLine[]>(() => load());
  useEffect(() => {
    const h = () => { const m = currentMarket(); setMarket(m); setLines(load(m)); };
    window.addEventListener('artisanat-boutique', h);
    return () => window.removeEventListener('artisanat-boutique', h);
  }, []);
  const [isOpen, setIsOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const [country, setCountry] = useState<string>(() => { try { return localStorage.getItem('artisanat-pays') ?? 'FR'; } catch { return 'FR'; } });
  const [methodId, setMethodId] = useState<string | null>(null);
  useEffect(() => { try { localStorage.setItem('artisanat-pays', country); } catch { /* ignoré */ } }, [country]);

  useEffect(() => {
    try { localStorage.setItem(storageKey(market), JSON.stringify(lines)); } catch { /* navigation privée */ }
  }, [lines, market]);

  const value = useMemo<CartValue>(() => ({
    lines,
    count: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: lines.reduce((n, l) => n + l.price_cents * l.quantity, 0),
    isOpen,
    lastAdded,
    open: () => { setLastAdded(null); setIsOpen(true); },
    close: () => { setIsOpen(false); setLastAdded(null); },
    add: (p, quantity = 1) => {
      trackProduct(p.id, 'cart');
      setLines((prev) => {
        const existing = prev.find((l) => l.id === p.id);
        if (existing) {
          return prev.map((l) => l.id === p.id ? { ...l, stock: p.stock, quantity: Math.min(p.stock, l.quantity + quantity) } : l);
        }
        return [...prev, {
          id: p.id, name: p.name, price_cents: p.price_cents,
          image: p.images[0] ?? null, stock: p.stock, quantity: Math.min(p.stock, quantity), width_cm: p.width_cm, length_cm: p.length_cm, seller_id: p.seller_id ?? null,
        }];
      });
      setLastAdded(p.name);
      setIsOpen(true);
    },
    setQuantity: (id, quantity) =>
      setLines((prev) => prev.map((l) => l.id === id ? { ...l, quantity: Math.max(1, Math.min(l.stock, quantity)) } : l)),
    remove: (id) => setLines((prev) => prev.filter((l) => l.id !== id)),
    clear: () => setLines([]),
    country, setCountry, methodId, setMethodId,
  }), [lines, isOpen, lastAdded, country, methodId]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart doit être utilisé dans CartProvider');
  return ctx;
}
