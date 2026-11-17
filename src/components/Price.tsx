import { formatPrice } from '../lib/format';

export function discountPercent(price: number, compareAt: number | null): number | null {
  return compareAt && compareAt > price ? Math.round((1 - price / compareAt) * 100) : null;
}

export function Price({ cents, compareAt, size = 'md' }: { cents: number; compareAt: number | null; size?: 'md' | 'lg' }) {
  const off = discountPercent(cents, compareAt);
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-2 ${size === 'lg' ? 'text-2xl' : ''}`}>
      <span className={`font-semibold tabular-nums ${off ? 'text-garance' : 'text-nuit'}`}>{formatPrice(cents)}</span>
      {off && <span className={`line-through text-henne/70 ${size === 'lg' ? 'text-lg' : 'text-sm'}`}>{formatPrice(compareAt!)}</span>}
    </span>
  );
}
