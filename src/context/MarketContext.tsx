import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { currentMarket, hasChosenMarket, Market, setCurrentMarket } from '../market';

interface MarketValue { market: Market; chosen: boolean; choose: (m: Market) => void }
const MarketContext = createContext<MarketValue>({ market: 'fr', chosen: true, choose: () => {} });

/** Boutique choisie (France ou Algérie). Changer de boutique recharge les produits, les prix et le panier. */
export function MarketProvider({ children }: { children: ReactNode }) {
  const [market, setMarket] = useState<Market>(currentMarket);
  const [chosen, setChosen] = useState(hasChosenMarket);
  useEffect(() => {
    const h = () => { setMarket(currentMarket()); setChosen(true); };
    window.addEventListener('artisanat-boutique', h);
    return () => window.removeEventListener('artisanat-boutique', h);
  }, []);
  return <MarketContext.Provider value={{ market, chosen, choose: setCurrentMarket }}>{children}</MarketContext.Provider>;
}

export const useMarket = () => useContext(MarketContext);
