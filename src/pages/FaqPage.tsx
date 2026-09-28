import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Prose } from './Prose';
import { useSettings } from '../context/SettingsContext';
import { formatPrice } from '../lib/format';

export function FaqPage() {
  const { settings } = useSettings();
  const faq: [string, ReactNode][] = [
    ['Les tapis sont-ils vraiment faits à la main ?', 'Oui. Chaque pièce est nouée ou tissée à la main, en laine naturelle. Les petites irrégularités de motif ou de dimension sont la signature du fait main.'],
    ['La photo correspond-elle exactement au tapis que je vais recevoir ?', 'Pour les pièces uniques, oui : vous recevez exactement le tapis photographié. Les couleurs peuvent légèrement varier selon votre écran.'],
    ['Quels moyens de paiement acceptez-vous ?', 'Carte Visa, Mastercard, Carte Bancaire, Apple Pay et Google Pay, sur la page sécurisée de Stripe. Nous n’avons jamais accès à vos numéros de carte.'],
    ['Combien coûte la livraison ?', <>{formatPrice(settings.shipping_cents)} en livraison suivie{settings.free_shipping_from_cents > 0 && <>, offerte dès {formatPrice(settings.free_shipping_from_cents)} d’achat</>}. Délai : {settings.shipping_min_days} à {settings.shipping_max_days} jours ouvrés.</>],
    ['Comment suivre mon colis ?', <>Sur la page <Link to="/suivi-commande">Suivre ma commande</Link>, avec votre email et votre code postal. Vous recevez aussi le numéro de suivi par email.</>],
    ['Puis-je retourner un article ?', <>Oui, sous 14 jours après réception. Voir <Link to="/livraison-et-retours">Livraison et retours</Link>.</>],
    ['Faites-vous des tapis sur mesure ?', <>Oui, pour de nombreux modèles. Indiquez les dimensions et couleurs souhaitées via la <Link to="/contact">page Contact</Link> : nous vous répondons avec un devis et un délai.</>],
    ['Comment entretenir un tapis en laine ?', 'Aspirateur sans brosse rotative, dans le sens du poil. Tache : tamponner à l’eau froide, sans frotter. Tournez le tapis une à deux fois par an.'],
    ['Un article est en rupture de stock, que faire ?', 'Sur sa fiche, laissez votre email avec « Me prévenir » : nous vous écrivons dès qu’il revient ou qu’une pièce semblable est tissée.'],
  ];
  return (
    <Prose title="Questions fréquentes">
      {faq.map(([q, a]) => (
        <details key={q} className="border-b border-laine-fonce py-3 group">
          <summary className="font-display text-xl text-nuit cursor-pointer list-none flex justify-between gap-4">
            {q}<span className="text-henne group-open:rotate-45 transition-transform" aria-hidden>+</span>
          </summary>
          <p className="mt-3">{a}</p>
        </details>
      ))}
      <p className="pt-6">Une autre question ? <Link to="/contact">Écrivez-nous</Link>.</p>
    </Prose>
  );
}
