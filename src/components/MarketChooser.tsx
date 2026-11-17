import { Flag } from './Flag';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Check, ChevronDown } from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { useSettings } from '../context/SettingsContext';
import { Market, MARKETS } from '../market';
import { Mark } from './Header';

/** Bouton d'en-tête « France ▾ » pour passer d'une boutique à l'autre. */
export function MarketSwitch({ compact = false }: { compact?: boolean }) {
  const { market } = useMarket();
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);
  if (!settings.dz_enabled) return null;
  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-2 text-nuit hover:text-garance" aria-label={`Boutique ${MARKETS[market].label} : changer de pays`}>
        <Flag market={market} />
        {!compact && <span className="hidden md:inline text-sm">{MARKETS[market].label}</span>}
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && <MarketDialog onClose={() => setOpen(false)} />}
    </>
  );
}

/** Choix de la boutique : à la première visite, puis depuis l'en-tête. */
export function MarketDialog({ onClose, first = false }: { onClose: () => void; first?: boolean }) {
  const { market, choose } = useMarket();
  const { pathname } = useLocation();
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, []);

  function pick(m: Market) {
    const changed = m !== market;
    choose(m);
    onClose();
    if (!changed) return;
    // Nouvelle boutique : produits, prix et panier sont rechargés. Une fiche produit appartient à une boutique : on repart de la boutique.
    const target = pathname.startsWith('/produit/') || pathname.startsWith('/commande') ? '/boutique' : pathname;
    window.location.assign(target);
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-label="Choisir votre boutique">
      <div className="absolute inset-0 bg-nuit/50" onClick={first ? undefined : onClose} />
      <div className="relative w-full sm:max-w-lg bg-laine shadow-2xl">
        <div className="lisiere" aria-hidden />
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3"><Mark className="w-9 h-9" /><p className="font-display text-3xl text-nuit">Où êtes-vous ?</p></div>
          <p className="mt-2 text-henne">Chaque pays a sa boutique : ses pièces, ses prix et sa livraison.</p>
          <div className="mt-6 grid gap-3">
            {(Object.keys(MARKETS) as Market[]).map((m) => (
              <button key={m} onClick={() => pick(m)} className={`flex items-center gap-4 p-4 text-left border-2 ${market === m && !first ? 'border-nuit bg-white' : 'border-laine-fonce bg-white hover:border-nuit'}`}>
                <Flag market={m} className="w-12 h-auto" />
                <span className="flex-1">
                  <span className="block font-display text-2xl text-nuit">{MARKETS[m].label}</span>
                  <span className="block text-sm text-henne">
                    {m === 'fr' ? 'Prix en euros · carte bancaire, Apple Pay · livraison en France et en Europe' : 'Prix en dinars · paiement à la livraison · 58 wilayas'}
                  </span>
                </span>
                {market === m && !first && <Check className="w-5 h-5 text-menthe" />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Première visite : demande le pays une seule fois. */
export function FirstVisitMarket() {
  const { chosen } = useMarket();
  const { settings } = useSettings();
  const { pathname } = useLocation();
  const [closed, setClosed] = useState(false);
  if (chosen || closed || !settings.dz_enabled || pathname.startsWith('/admin')) return null;
  return <MarketDialog first onClose={() => setClosed(true)} />;
}
