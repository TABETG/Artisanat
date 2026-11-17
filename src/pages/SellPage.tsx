import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Package, ShieldCheck, Sparkles, Wallet } from 'lucide-react';
import { useCustomer } from '../context/CustomerContext';
import { useSettings } from '../context/SettingsContext';
import { applyAsSeller, getMySeller } from '../lib/marketplace';
import { COUNTRIES } from '../shipping';

// Pays où Stripe peut verser l'argent aux artisans (Stripe Connect)
const PAYOUT_COUNTRIES = ['FR', 'BE', 'LU', 'CH', 'DE', 'NL', 'ES', 'IT', 'PT', 'AT', 'IE', 'DK', 'SE', 'FI', 'PL', 'GR', 'GB', 'NO'];

export function SellPage() {
  const { settings } = useSettings();
  const { customer, ready } = useCustomer();
  const navigate = useNavigate();
  const [already, setAlready] = useState(false);
  useEffect(() => { if (customer) getMySeller().then((m) => setAlready(!!m)); }, [customer]);

  if (!settings.marketplace_enabled) {
    return <div className="max-w-3xl mx-auto px-5 pt-16"><h1 className="font-display text-5xl text-nuit">Vendre sur la boutique</h1><p className="lecture mt-4">Les candidatures sont fermées pour le moment.</p></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-12">
      <div className="grid gap-12 lg:grid-cols-12 items-start">
        <div className="lg:col-span-6">
          <div className="lisiere-fine w-16 mb-5" aria-hidden />
          <h1 className="font-display text-[2.8rem] sm:text-6xl md:text-7xl text-nuit">Vendez vos créations artisanales</h1>
          <p className="lecture mt-6 text-[1.2rem] text-encre/80 max-w-xl">
            Tisserande, potier, brodeuse, maroquinier… Si vous fabriquez à la main, proposez vos pièces à nos clients.
            Vous gardez votre prix, nous nous occupons de la vitrine, du paiement et du service client.
          </p>
          <ul className="mt-10 grid sm:grid-cols-2 gap-6">
            {[
              [Sparkles, 'Une vitrine soignée', 'Votre page artisan, vos produits aux côtés des nôtres.'],
              [Wallet, `${settings.marketplace_commission_percent} % de commission`, 'Uniquement quand vous vendez. Aucun abonnement.'],
              [Package, 'Vous expédiez', 'À votre tarif, depuis votre atelier. Vous recevez l’adresse du client.'],
              [ShieldCheck, 'Paiements sécurisés', 'Par Stripe, versés sur votre compte bancaire après chaque vente.'],
            ].map(([Icon, t, d]) => {
              const I = Icon as typeof Package;
              return (
                <li key={t as string} className="border-t border-laine-fonce pt-4">
                  <I className="w-6 h-6 text-garance" />
                  <p className="font-display text-2xl text-nuit mt-2">{t as string}</p>
                  <p className="lecture text-base text-henne mt-1">{d as string}</p>
                </li>
              );
            })}
          </ul>
          <p className="mt-8 text-sm text-henne">Chaque boutique et chaque produit sont relus avant publication. <Link to="/conditions-vendeurs" className="underline">Conditions pour les vendeurs</Link></p>
        </div>

        <div className="lg:col-span-5 lg:col-start-8 bg-white border border-laine-fonce p-6 sm:p-8">
          {!ready ? <p className="text-henne">Chargement…</p> : !customer ? (
            <>
              <p className="font-display text-3xl text-nuit">Proposer ma boutique</p>
              <p className="lecture text-base mt-3 text-henne">Commencez par vous connecter (un simple lien par email), puis remplissez votre candidature en 3 minutes.</p>
              <button onClick={() => navigate('/compte')} className="mt-6 w-full bg-nuit text-laine py-4 font-medium hover:bg-garance">Me connecter pour candidater</button>
            </>
          ) : already ? (
            <>
              <p className="font-display text-3xl text-nuit">Votre candidature est enregistrée</p>
              <p className="lecture text-base mt-3 text-henne">Suivez-la et gérez votre boutique depuis votre compte.</p>
              <Link to="/compte?onglet=atelier" className="mt-6 block text-center w-full bg-nuit text-laine py-4 font-medium hover:bg-garance">Ouvrir mon espace artisan</Link>
            </>
          ) : <ApplicationForm onDone={() => navigate('/compte?onglet=atelier')} />}
        </div>
      </div>
    </div>
  );
}

function ApplicationForm({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ shop_name: '', craft: '', bio: '', city: '', country: 'FR', legal_status: 'professionnel' as 'professionnel' | 'particulier', siret: '', phone: '', message: '' });
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = 'w-full px-3.5 py-3 bg-laine border border-laine-fonce focus:border-nuit focus:outline-none';
  const set = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!accept) return setError('Acceptez les conditions pour les vendeurs.');
    setBusy(true); setError(null);
    try { await applyAsSeller(f); onDone(); } catch (err) { setError(err instanceof Error ? err.message : 'Erreur'); setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="font-display text-3xl text-nuit">Votre candidature</p>
      <label className="block"><span className="font-medium block mb-1">Nom de votre atelier</span><input required maxLength={60} value={f.shop_name} onChange={(e) => set('shop_name', e.target.value)} className={input} placeholder="Atelier Fatima" /></label>
      <label className="block"><span className="font-medium block mb-1">Votre spécialité</span><input required maxLength={80} value={f.craft} onChange={(e) => set('craft', e.target.value)} className={input} placeholder="Tissage de kilims, poterie, broderie…" /></label>
      <div className="grid grid-cols-2 gap-3">
        <label><span className="font-medium block mb-1">Ville</span><input required maxLength={80} value={f.city} onChange={(e) => set('city', e.target.value)} className={input} /></label>
        <label><span className="font-medium block mb-1">Pays</span>
          <select value={f.country} onChange={(e) => set('country', e.target.value)} className={input}>
            {COUNTRIES.filter((c) => PAYOUT_COUNTRIES.includes(c.code)).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select></label>
      </div>
      <fieldset>
        <legend className="font-medium mb-1">Vous vendez en tant que</legend>
        <div className="flex gap-4">
          {(['professionnel', 'particulier'] as const).map((v) => (
            <label key={v} className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={f.legal_status === v} onChange={() => set('legal_status', v)} className="accent-nuit" />{v === 'professionnel' ? 'Professionnel (SIRET)' : 'Particulier'}</label>
          ))}
        </div>
      </fieldset>
      {f.legal_status === 'professionnel' && (
        <label className="block"><span className="font-medium block mb-1">Numéro SIRET</span><input inputMode="numeric" value={f.siret} onChange={(e) => set('siret', e.target.value)} className={input} placeholder="14 chiffres" /></label>
      )}
      <label className="block"><span className="font-medium block mb-1">Présentez votre travail</span><textarea rows={4} maxLength={2000} value={f.bio} onChange={(e) => set('bio', e.target.value)} className={input} placeholder="Votre parcours, vos techniques, vos matières…" /></label>
      <label className="block"><span className="font-medium block mb-1">Téléphone <span className="font-normal text-sm text-henne">(facultatif)</span></span><input type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} className={input} /></label>
      <label className="block"><span className="font-medium block mb-1">Un mot pour nous <span className="font-normal text-sm text-henne">(facultatif)</span></span><textarea rows={2} maxLength={1000} value={f.message} onChange={(e) => set('message', e.target.value)} className={input} placeholder="Lien vers vos réseaux, vos marchés…" /></label>
      <label className="flex items-start gap-3 text-sm cursor-pointer"><input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5 w-4 h-4 accent-nuit" />
        <span>J’accepte les <Link to="/conditions-vendeurs" target="_blank" className="underline">conditions pour les vendeurs</Link> et certifie que mes créations sont faites à la main.</span></label>
      {error && <p className="text-garance text-sm" role="alert">{error}</p>}
      <button disabled={busy} className="w-full bg-garance text-laine py-4 font-medium hover:bg-nuit disabled:opacity-60 inline-flex items-center justify-center gap-2"><Check className="w-4 h-4" /> {busy ? 'Envoi…' : 'Envoyer ma candidature'}</button>
    </form>
  );
}
