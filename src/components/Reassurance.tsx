import { CreditCard, Hand, RotateCcw, Truck } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { freeShippingThreshold } from '../settings';
import { formatPrice } from '../lib/format';
import { FEATURES } from '../features';

/** Réassurance avant le pied de page. Le sur-mesure n'y figure que s'il est activé. */
export function Reassurance() {
  const { settings } = useSettings();
  const threshold = freeShippingThreshold(settings);
  const items: [JSX.Element, string, string][] = [
    [<Truck key="t" />, 'Livraison suivie', threshold ? `offerte dès ${formatPrice(threshold)}` : 'avec numéro de suivi'],
    [<CreditCard key="c" />, 'Paiement sécurisé', 'Carte, Apple Pay, Google Pay'],
    [<RotateCcw key="r" />, '14 jours', 'pour changer d’avis'],
    FEATURES.customOrdersEnabled
      ? [<Hand key="s" />, 'Sur mesure', 'vos dimensions, vos couleurs']
      : [<Hand key="f" />, 'Fait main en France', 'pièce après pièce'],
  ];
  return (
    <section className="max-w-7xl mx-auto w-full px-5 lg:px-8 py-10 print:hidden" aria-label="Nos engagements">
      <ul className="grid grid-cols-2 lg:grid-cols-4 gap-y-8">
        {items.map(([icon, title, text], i) => (
          <li key={i} className={`flex flex-col items-center text-center px-3 ${i % 2 ? 'border-l' : ''} ${i === 2 ? 'lg:border-l' : ''} border-laine-fonce`}>
            <span className="text-safran [&_svg]:w-7 [&_svg]:h-7 ">{icon}</span>
            <strong className="mt-3 text-nuit text-[0.95rem]">{title}</strong>
            <span className="text-sm text-henne">{text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
