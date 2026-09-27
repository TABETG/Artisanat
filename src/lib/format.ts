const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

export function formatPrice(cents: number): string {
  return euro.format(cents / 100);
}

/** "1 250,50" ou "1250.5" → 125050 centimes. Renvoie null si invalide. */
export function parsePriceToCents(input: string): number | null {
  const clean = input.replace(/\s/g, '').replace('€', '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  return Math.round(parseFloat(clean) * 100);
}

export function centsToInput(cents: number): string {
  const s = (cents / 100).toFixed(2).replace('.', ',');
  return s.endsWith(',00') ? s.slice(0, -3) : s;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function formatDimensions(w: number | null, l: number | null): string | null {
  if (!w || !l) return null;
  return `${w} × ${l} cm`;
}
