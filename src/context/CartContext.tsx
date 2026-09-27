import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Product } from '../types';

export interface CartLine {
  id: string;
  name: string;
  price_cents: number;
  image: string | null;
  stock: number;
  quantity: number;
}

interface CartValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (p: Product, quantity?: number) => void;
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartValue | null>(null);
const STORAGE_KEY = 'tamurt-panier';

function load(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(load);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lines)); } catch { /* navigation privée */ }
  }, [lines]);

  const value = useMemo<CartValue>(() => ({
    lines,
    count: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: lines.reduce((n, l) => n + l.price_cents * l.quantity, 0),
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    add: (p, quantity = 1) => {
      setLines((prev) => {
        const existing = prev.find((l) => l.id === p.id);
        if (existing) {
          return prev.map((l) => l.id === p.id ? { ...l, stock: p.stock, quantity: Math.min(p.stock, l.quantity + quantity) } : l);
        }
        return [...prev, {
          id: p.id, name: p.name, price_cents: p.price_cents,
          image: p.images[0] ?? null, stock: p.stock, quantity: Math.min(p.stock, quantity),
        }];
      });
      setIsOpen(true);
    },
    setQuantity: (id, quantity) =>
      setLines((prev) => prev.map((l) => l.id === id ? { ...l, quantity: Math.max(1, Math.min(l.stock, quantity)) } : l)),
    remove: (id) => setLines((prev) => prev.filter((l) => l.id !== id)),
    clear: () => setLines([]),
  }), [lines, isOpen]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart doit être utilisé dans CartProvider');
  return ctx;
}
