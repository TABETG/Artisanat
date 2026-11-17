import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useCustomer } from './CustomerContext';
import { loadRemoteFavorites, saveRemoteFavorites } from '../lib/customer';
import { DEMO_MODE } from '../lib/supabase';

interface FavoritesValue { ids: string[]; has: (id: string) => boolean; toggle: (id: string) => void }
const FavoritesContext = createContext<FavoritesValue | null>(null);
const KEY = 'artisanat-favoris';

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; }
  });
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* ignoré */ } }, [ids]);

  // Client connecté : les favoris de cet appareil et ceux du compte sont fusionnés, puis gardés en phase
  const { customer } = useCustomer();
  const synced = useRef<string | null>(null);
  useEffect(() => {
    const uid = customer?.userId;
    if (DEMO_MODE || !uid) { synced.current = null; return; }
    if (synced.current !== uid) {
      synced.current = uid;
      loadRemoteFavorites(uid).then((remote) => setIds((local) => [...new Set([...local, ...remote])])).catch(() => {});
      return;
    }
    saveRemoteFavorites(uid, ids).catch(() => {});
  }, [customer?.userId, ids]);
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
