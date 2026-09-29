import { useSettings } from '../context/SettingsContext';
import { countryName, KIND_LABELS, OVERSIZE_M2 } from '../shipping';
import { formatPrice } from '../lib/format';

/** Tableau des tarifs : un mode par ligne, une zone par colonne. */
export function ShippingTable() {
  const { settings } = useSettings();
  const methods = settings.shipping_methods.filter((m) => m.active);
  const zones = settings.shipping_zones.filter((z) => methods.some((m) => m.prices[z.id] != null));
  if (!methods.length) return null;
  return (
    <div className="not-prose font-sans text-[15px]">
      <div className="overflow-x-auto border border-laine-fonce">
        <table className="w-full min-w-[520px] text-left">
          <thead className="bg-nuit text-laine">
            <tr><th className="p-3 font-medium">Mode</th>{zones.map((z) => <th key={z.id} className="p-3 font-medium">{z.label}</th>)}</tr>
          </thead>
          <tbody>
            {methods.map((m) => (
              <tr key={m.id} className="border-t border-laine-fonce align-top">
                <td className="p-3">
                  <span className="block font-semibold text-nuit">{m.name}</span>
                  <span className="block text-sm text-henne">{KIND_LABELS[m.kind]} · {m.min_days} à {m.max_days} jours ouvrés</span>
                  {m.free_from_cents ? <span className="block text-sm text-menthe">Offerte dès {formatPrice(m.free_from_cents)}</span> : null}
                </td>
                {zones.map((z) => (
                  <td key={z.id} className="p-3 tabular-nums">{m.prices[z.id] == null ? <span className="text-henne/60">—</span> : m.prices[z.id] === 0 ? 'Gratuit' : formatPrice(m.prices[z.id]!)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-3 text-sm text-henne space-y-1">
        {zones.map((z) => <li key={z.id}><strong className="text-nuit font-medium">{z.label}</strong> : {z.countries.map(countryName).join(', ')}</li>)}
        {methods.some((m) => m.oversize_cents > 0) && <li>Tapis de plus de {OVERSIZE_M2} m² : supplément de transport selon le mode (indiqué dans le panier).</li>}
        <li>Préparation à l’atelier : {settings.preparation_days} jour{settings.preparation_days > 1 ? 's' : ''} ouvré{settings.preparation_days > 1 ? 's' : ''} avant l’expédition.</li>
      </ul>
    </div>
  );
}
