const KEY = 'artisanat-vus-recemment';

export function rememberViewed(id: string): void {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[];
    localStorage.setItem(KEY, JSON.stringify([id, ...list.filter((x) => x !== id)].slice(0, 12)));
  } catch { /* navigation privée */ }
}

export function recentlyViewed(exclude?: string): string[] {
  try { return (JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]).filter((x) => x !== exclude); } catch { return []; }
}
