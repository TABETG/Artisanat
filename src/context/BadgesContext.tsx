import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { listProducts } from '../lib/api';
import { bestSellers, computeBadges } from '../badges';
import { useSettings } from './SettingsContext';
import { Product } from '../types';

interface BadgesValue { badgesFor: (p: Product) => ReturnType<typeof computeBadges>; bestSellerIds: Set<string> }
const BadgesContext = createContext<BadgesValue>({ badgesFor: () => [], bestSellerIds: new Set() });

/** Calcule les badges automatiques (meilleures ventes, nouveautés…) pour toute la boutique. */
export function BadgesProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const { pathname } = useLocation();
  const [ids, setIds] = useState<Set<string>>(new Set());
  useEffect(() => { listProducts().then((l) => setIds(bestSellers(l))).catch(() => {}); }, [pathname]);
  const value = useMemo<BadgesValue>(() => ({
    bestSellerIds: ids,
    badgesFor: (p) => computeBadges(p, { bestSellerIds: ids, newDays: settings.new_days }),
  }), [ids, settings.new_days]);
  return <BadgesContext.Provider value={value}>{children}</BadgesContext.Provider>;
}

export const useBadges = () => useContext(BadgesContext);
