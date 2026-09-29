// Préférences de confidentialité du visiteur (RGPD), enregistrées sur son appareil uniquement.
const KEY = 'artisanat-confidentialite';

export interface Consent { stats: boolean; date: string }

export function getConsent(): Consent | null {
  try { return JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { return null; }
}

export function setConsent(stats: boolean): void {
  try { localStorage.setItem(KEY, JSON.stringify({ stats, date: new Date().toISOString() })); } catch { /* ignoré */ }
  window.dispatchEvent(new Event('artisanat-confidentialite'));
}

/** Statistiques anonymes autorisées tant que le visiteur ne les a pas refusées. */
export function statsAllowed(): boolean {
  return getConsent()?.stats !== false;
}

/** Efface tout ce que le site a enregistré sur cet appareil (panier, favoris, historique, préférences). */
export function clearLocalData(): void {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith('artisanat-') && !k.startsWith('artisanat-demo')).forEach((k) => localStorage.removeItem(k));
    Object.keys(sessionStorage).filter((k) => k.startsWith('artisanat-')).forEach((k) => sessionStorage.removeItem(k));
  } catch { /* ignoré */ }
}
