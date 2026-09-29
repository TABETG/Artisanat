import { Truck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { COUNTRIES, KIND_LABELS, addBusinessDays, quoteShipping, servedCountries } from '../shipping';
import { formatPrice } from '../lib/format';
import { Product } from '../types';

const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

/** Fiche produit : date de livraison estimée et modes disponibles pour le pays choisi. */
export function DeliveryEstimate({ product }: { product: Product }) {
  const { settings } = useSettings();
  const { country, setCountry } = useCart();
  const served = servedCountries(settings.shipping_zones, settings.shipping_methods);
  const quotes = quoteShipping(country, [{ quantity: 1, price_cents: product.price_cents, width_cm: product.width_cm, length_cm: product.length_cm }],
    settings.shipping_zones, settings.shipping_methods).filter((q) => q.method.kind !== 'retrait');
  const pickup = settings.shipping_methods.find((m) => m.active && m.kind === 'retrait' && m.prices[settings.shipping_zones.find((z) => z.countries.includes(country))?.id ?? ''] != null);
  const fastest = [...quotes].sort((a, b) => a.method.max_days - b.method.max_days)[0];
  const now = new Date();

  return (
    <div className="border border-laine-fonce bg-white/60 p-4">
      <div className="flex items-start gap-3">
        <Truck className="w-5 h-5 text-garance shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          {fastest ? (
            <p className="text-[15px]">
              Livré entre le <strong>{fmt(addBusinessDays(now, settings.preparation_days + fastest.method.min_days))}</strong> et
              le <strong>{fmt(addBusinessDays(now, settings.preparation_days + fastest.method.max_days))}</strong>
            </p>
          ) : (
            <p className="text-[15px]">Livraison vers ce pays sur demande : écrivez-nous.</p>
          )}
          <label className="mt-1 inline-flex items-center gap-1.5 text-sm text-henne">
            vers
            <select value={country} onChange={(e) => setCountry(e.target.value)} className="bg-transparent underline underline-offset-2 text-nuit cursor-pointer" aria-label="Pays de livraison">
              {COUNTRIES.filter((c) => served.includes(c.code) || c.code === country).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </label>
          {quotes.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm">
              {quotes.map((q) => (
                <li key={q.method.id} className="flex justify-between gap-3">
                  <span>{q.method.name} <span className="text-henne">· {KIND_LABELS[q.method.kind].toLowerCase()}, {q.method.min_days}–{q.method.max_days} j</span></span>
                  <span className={`tabular-nums whitespace-nowrap ${q.cents === 0 ? 'text-menthe font-medium' : ''}`}>{q.cents === 0 ? 'Offerte' : formatPrice(q.cents)}</span>
                </li>
              ))}
              {pickup && <li className="flex justify-between gap-3"><span>{pickup.name}</span><span className="text-menthe font-medium">Gratuit</span></li>}
            </ul>
          )}
          {quotes.some((q) => q.oversizeCount > 0 && q.method.oversize_cents > 0) && (
            <p className="mt-2 text-xs text-henne">Grand tapis : supplément de transport inclus dans les prix ci-dessus.</p>
          )}
        </div>
      </div>
    </div>
  );
}
