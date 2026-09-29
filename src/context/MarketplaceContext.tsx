import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { listSellers } from '../lib/marketplace';
import { Seller } from '../types';

interface MarketplaceValue { sellers: Seller[]; sellerOf: (id?: string | null) => Seller | null }
const MarketplaceContext = createContext<MarketplaceValue>({ sellers: [], sellerOf: () => null });

/** Artisans validés, pour afficher « par … » sur les produits. */
export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const [sellers, setSellers] = useState<Seller[]>([]);
  useEffect(() => { listSellers().then(setSellers).catch(() => {}); }, []);
  const value = useMemo<MarketplaceValue>(() => ({ sellers, sellerOf: (id) => (id ? sellers.find((s) => s.id === id) ?? null : null) }), [sellers]);
  return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>;
}

export const useMarketplace = () => useContext(MarketplaceContext);
