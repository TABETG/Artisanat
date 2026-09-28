import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

interface FavoritesValue { ids: string[]; has: (id: string) => boolean; toggle: (id: string) => void }
const FavoritesContext = createContext<FavoritesValue | null>(null);
const KEY = 'artisanat-favoris';

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; }
  });
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* ignoré */ } }, [ids]);
  const value = useMemo<FavoritesValue>(() => ({
    ids,
    has: (id) => ids.includes(id),
    toggle: (id) => setIds((l) => (l.includes(id) ? l.filter((x) => x !== id) : [id, ...l])),
  }), [ids]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites doit être utilisé dans FavoritesProvider');
  return ctx;
}
