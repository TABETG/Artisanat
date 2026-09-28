import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';

export function ThankYouPage() {
  const [params] = useSearchParams();
  const { clear } = useCart();
  const { settings } = useSettings();
  const hasSession = !!params.get('session_id');

  useEffect(() => { if (hasSession) clear(); }, [hasSession]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="max-w-2xl mx-auto px-5 pt-20 text-center">
      <h1 className="font-display text-4xl md:text-5xl text-nuit">Merci pour votre commande</h1>
      <p className="mt-5 text-lg leading-relaxed">
        Votre paiement est confirmé. Un reçu vient de vous être envoyé par email.
        Nous préparons votre colis avec soin et vous enverrons le numéro de suivi dès l’expédition.
      </p>
      <p className="mt-4 text-henne">Une question ? <a className="text-garance underline" href={`mailto:${settings.email}`}>{settings.email}</a></p>
      <p className="mt-2 text-henne">Vous pourrez suivre votre colis à tout moment sur la page <Link to="/suivi-commande" className="text-garance underline">Suivre ma commande</Link>.</p>
      <Link to="/boutique" className="inline-block mt-10 bg-nuit text-laine px-7 py-3.5 rounded-sm hover:bg-garance">Continuer la visite</Link>
    </div>
  );
}

export function CancelledPage() {
  const { open } = useCart();
  return (
    <div className="max-w-2xl mx-auto px-5 pt-20 text-center">
      <h1 className="font-display text-4xl text-nuit">Paiement interrompu</h1>
      <p className="mt-5 text-lg">Aucun montant n’a été débité. Votre panier est conservé.</p>
      <button onClick={open} className="mt-10 bg-garance text-laine px-7 py-3.5 rounded-sm hover:bg-nuit">Reprendre mon panier</button>
    </div>
  );
}
