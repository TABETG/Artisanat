import { createContext, useContext } from 'react';

/** Ouvre le menu ou la barre latérale de contact depuis n'importe quel composant. */
export interface PanelsValue { openMenu: () => void; openContact: (tab?: 'contact' | 'donnees') => void }
export const PanelsContext = createContext<PanelsValue>({ openMenu: () => {}, openContact: () => {} });
export const usePanels = () => useContext(PanelsContext);
