import { FormEvent, useState } from 'react';
import { Gift, Lock } from 'lucide-react';
import { GIFT_AMOUNTS, startGiftCardCheckout } from '../lib/api';
import { formatPrice, parsePriceToCents } from '../lib/format';
import { SHOP } from '../config';

export function GiftCardPage() {
  const [amount, setAmount] = useState(10000);
  const [custom, setCustom] = useState('');
  const [buyer, setBuyer] = useState('');
  const [recipient, setRecipient] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const value = custom ? parsePriceToCents(custom) ?? 0 : amount;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      window.location.href = await startGiftCardCheckout({ amount_cents: value, buyer_name: buyer, recipient_name: recipient, recipient_email: recipientEmail, message });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
      setBusy(false);
    }
  }

  const input = 'w-full px-3.5 py-3 bg-white border border-laine-fonce rounded-sm';

  return (
    <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-12 grid gap-12 md:grid-cols-[1fr_1.1fr] items-start">
      <div className="md:sticky md:top-24">
        <div className="lisiere-fine w-16 mb-5" aria-hidden />
      <h1 className="font-display text-[2.8rem] sm:text-6xl md:text-7xl text-nuit">Carte cadeau</h1>
        <p className="lecture mt-5 text-[1.2rem] text-encre/80">Offrez un tapis tissé à la main, en laissant le plaisir du choix. Valable un an sur toute la boutique.</p>
        <div className="mt-8 aspect-[1.6/1] rounded-lg bg-nuit text-laine p-6 sm:p-8 flex flex-col justify-between shadow-xl relative overflow-hidden" aria-hidden>
          <div className="absolute inset-x-0 bottom-0 motif opacity-80" />
          <div className="flex justify-between items-start">
            <p className="font-display text-2xl">{SHOP.name}</p>
            <Gift className="w-7 h-7 text-safran" />
          </div>
          <div className="pb-6">
            <p className="font-display text-5xl text-safran">{value > 0 ? formatPrice(value) : '— €'}</p>
            <p className="mt-2 text-laine/80">{recipient ? `Pour ${recipient}` : 'Carte cadeau'}{buyer ? ` · de la part de ${buyer}` : ''}</p>
          </div>
        </div>
        {message && <p className="mt-4 italic text-henne">« {message} »</p>}
      </div>

      <form onSubmit={submit} className="space-y-6">
        <fieldset>
          <legend className="font-medium mb-3">Montant</legend>
          <div className="grid grid-cols-3 gap-2">
            {GIFT_AMOUNTS.map((a) => (
              <button key={a} type="button" onClick={() => { setAmount(a); setCustom(''); }} aria-pressed={!custom && amount === a}
                className={`py-3 rounded-sm border text-lg ${!custom && amount === a ? 'bg-nuit text-laine border-nuit' : 'border-laine-fonce bg-white/60 hover:border-nuit'}`}>
                {formatPrice(a).replace(',00', '')}
              </button>
            ))}
          </div>
          <label className="block mt-3"><span className="text-sm text-henne">Ou un autre montant (20 à 2 000 €)</span>
            <input inputMode="decimal" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Ex. : 250" className={`${input} mt-1`} /></label>
        </fieldset>
        <div className="grid sm:grid-cols-2 gap-4">
          <label><span className="font-medium block mb-1">Votre prénom</span><input value={buyer} maxLength={100} onChange={(e) => setBuyer(e.target.value)} className={input} /></label>
          <label><span className="font-medium block mb-1">Prénom du destinataire</span><input value={recipient} maxLength={100} onChange={(e) => setRecipient(e.target.value)} className={input} /></label>
        </div>
        <label className="block"><span className="font-medium block mb-1">Email du destinataire <span className="font-normal text-sm text-henne">(facultatif — sinon le code vous est envoyé)</span></span>
          <input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} className={input} /></label>
        <label className="block"><span className="font-medium block mb-1">Petit mot <span className="font-normal text-sm text-henne">(facultatif)</span></span>
          <textarea rows={3} maxLength={450} value={message} onChange={(e) => setMessage(e.target.value)} className={input} placeholder="Joyeux anniversaire !" /></label>
        {error && <p className="text-garance" role="alert">{error}</p>}
        <button disabled={busy || value < 2000} className="w-full bg-garance text-laine py-4 rounded-sm text-lg font-medium hover:bg-nuit disabled:opacity-50 inline-flex items-center justify-center gap-2">
          <Lock className="w-4 h-4" /> {busy ? 'Ouverture du paiement…' : `Offrir ${value >= 2000 ? formatPrice(value) : ''}`}
        </button>
        <p className="text-sm text-henne">Paiement sécurisé par Stripe. Le code arrive par email juste après le paiement ; il s’utilise en une fois sur la page de paiement.</p>
      </form>
    </div>
  );
}
