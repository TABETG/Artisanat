import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { getConsent, setConsent } from '../lib/privacy';

/** Information RGPD à la première visite. Pas de cookie publicitaire : un simple choix pour les statistiques. */
export function PrivacyBanner({ onDetails }: { onDetails: () => void }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(!getConsent());
    const h = () => setShow(!getConsent());
    window.addEventListener('artisanat-confidentialite', h);
    return () => window.removeEventListener('artisanat-confidentialite', h);
  }, []);
  if (!show) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-nuit text-laine" role="region" aria-label="Confidentialité">
      <div className="lisiere-fine" aria-hidden />
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <ShieldCheck className="w-6 h-6 text-safran shrink-0 hidden sm:block" />
        <p className="flex-1 min-w-64 text-sm leading-relaxed">
          Aucun cookie publicitaire ici. Nous gardons votre panier et vos favoris sur votre appareil, et comptons les vues des produits de façon anonyme.
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={onDetails} className="px-4 py-2.5 text-sm underline">Détails</button>
          <button onClick={() => setConsent(false)} className="px-4 py-2.5 text-sm border border-laine/30 hover:border-laine">Refuser les statistiques</button>
          <button onClick={() => setConsent(true)} className="px-5 py-2.5 text-sm font-medium bg-safran text-nuit hover:bg-laine">D’accord</button>
        </div>
      </div>
    </div>
  );
}
