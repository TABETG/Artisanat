import { useEffect, useState } from 'react';
import { Check, Copy, Gift } from 'lucide-react';
import { getGiftCardBySession } from '../lib/api';
import { formatPrice } from '../lib/format';
import { GiftCard } from '../types';
import { Link, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';

export function ThankYouPage() {
  const [params] = useSearchParams();
  const { clear } = useCart();
  const { settings } = useSettings();
  const hasSession = !!params.get('session_id');
  const giftSession = params.get('carte_cadeau');

  useEffect(() => { if (hasSession) clear(); }, [hasSession]); // eslint-disable-line react-hooks/exhaustive-deps

  if (giftSession) return <GiftThanks sessionId={giftSession} />;

  return (
    <div className="max-w-2xl mx-auto px-5 pt-20 text-center">
      <h1 className="font-display text-4xl md:text-5xl text-nuit">Merci pour votre commande</h1>
      <p className="mt-5 text-lg leading-relaxed">
        Votre paiement est confirmé. Un reçu vient de vous être envoyé par email.
        Nous préparons votre colis avec soin et vous enverrons le numéro de suivi dès l’expédition.
      </p>
      <p className="mt-4 text-henne">Une question ? <a className="text-garance underline" href={`mailto:${settings.email}`}>{settings.email}</a></p>
      <p className="mt-2 text-henne">Suivez votre colis, retrouvez votre facture et vos commandes dans <Link to="/compte" className="text-garance underline">Mon compte</Link> (connexion par simple lien email).</p>
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

/** Le code est créé par le serveur quelques secondes après le paiement : on vérifie plusieurs fois. */
function GiftThanks({ sessionId }: { sessionId: string }) {
  const [card, setCard] = useState<GiftCard | null>(null);
  const [tries, setTries] = useState(0);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (card || tries > 10) return;
    const t = setTimeout(async () => { setCard(await getGiftCardBySession(sessionId)); setTries((n) => n + 1); }, tries === 0 ? 0 : 2000);
    return () => clearTimeout(t);
  }, [card, tries, sessionId]);

  return (
    <div className="max-w-2xl mx-auto px-5 pt-20 text-center">
      <Gift className="w-12 h-12 mx-auto text-garance" />
      <h1 className="font-display text-4xl md:text-5xl text-nuit mt-4">Merci pour ce joli cadeau</h1>
      {card ? (
        <>
          <p className="mt-5 text-lg">Voici le code de la carte de <strong>{formatPrice(card.amount_cents)}</strong>{card.recipient_name ? ` pour ${card.recipient_name}` : ''} :</p>
          <button onClick={async () => { await navigator.clipboard?.writeText(card.code); setCopied(true); }}
            className="mt-5 inline-flex items-center gap-3 font-mono text-2xl sm:text-3xl tracking-wider bg-nuit text-laine px-6 py-4 rounded-sm">
            {card.code} {copied ? <Check className="w-6 h-6 text-safran" /> : <Copy className="w-6 h-6 text-laine/60" />}
          </button>
          <p className="mt-4 text-henne">À saisir sur la page de paiement{card.expires_at ? `, valable jusqu’au ${new Date(card.expires_at).toLocaleDateString('fr-FR')}` : ''}. Il vous a aussi été envoyé par email.</p>
        </>
      ) : tries > 10 ? (
        <p className="mt-5 text-lg">Le paiement est confirmé. Le code vous parvient par email dans quelques minutes.</p>
      ) : (
        <p className="mt-5 text-lg text-henne">Création de la carte…</p>
      )}
      <Link to="/boutique" className="inline-block mt-10 bg-nuit text-laine px-7 py-3.5 rounded-sm hover:bg-garance">Voir la boutique</Link>
    </div>
  );
}
