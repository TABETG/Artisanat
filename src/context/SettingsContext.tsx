import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { getSettings } from '../lib/api';
import { DEFAULT_SETTINGS } from '../settings';
import { ShopSettings } from '../types';

interface SettingsValue { settings: ShopSettings; reload: () => void }
const SettingsContext = createContext<SettingsValue>({ settings: DEFAULT_SETTINGS, reload: () => {} });

/** Réglages modifiables par le propriétaire (contact, livraison, bandeau). */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ShopSettings>(DEFAULT_SETTINGS);
  const reload = useCallback(() => { getSettings().then(setSettings).catch(() => { /* valeurs par défaut */ }); }, []);
  useEffect(reload, [reload]);
  return <SettingsContext.Provider value={{ settings, reload }}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);

/** Catégories définies par le propriétaire. */
export function useCategories() {
  const { settings } = useContext(SettingsContext);
  const categories = settings.categories.length ? settings.categories : [];
  return {
    categories,
    label: (id: string) => categories.find((c) => c.id === id)?.label ?? id,
  };
}
