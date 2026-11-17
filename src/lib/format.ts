import { currentMarket, Market } from '../market';

const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const dinar = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

/** Prix affiché dans la monnaie de la boutique : « 1 240,00 € » ou « 85 000 DA ». */
export function formatPrice(cents: number, market: Market = currentMarket()): string {
  return market === 'dz' ? `${dinar.format(Math.round(cents / 100))} DA` : euro.format(cents / 100);
}

export const currencySymbol = (market: Market = currentMarket()) => (market === 'dz' ? 'DA' : '€');

/** "1 250,50" ou "1250.5" → 125050 centimes. Renvoie null si invalide. */
export function parsePriceToCents(input: string): number | null {
  const clean = input.replace(/\s/g, '').replace('€', '').replace(/DA$/i, '').replace(',', '.');
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
