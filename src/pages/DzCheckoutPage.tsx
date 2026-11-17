import { FormEvent, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Building2, Check, Home, Phone, Truck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useMarket } from '../context/MarketContext';
import { useSettings } from '../context/SettingsContext';
import { createCodOrder, listDzRates } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { formatPrice } from '../lib/format';
import { isDzPhone } from '../market';
import { ProductImage } from '../components/ProductImage';

/** Boutique Algérie : commande avec paiement à la livraison (pas de paiement en ligne). */
export function DzCheckoutPage() {
  const { market } = useMarket();
  const { lines, subtotal, clear } = useCart();
  const { settings } = useSettings();
  const { data: rates } = useAsync(listDzRates, []);
  const [f, setF] = useState({ name: '', phone: '', email: '', wilaya: '', commune: '', address: '', delivery: 'domicile' as 'domicile' | 'bureau', note: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ number: string; total_cents: number } | null>(null);
  const input = 'w-full px-3.5 py-3 bg-white border border-laine-fonce focus:border-nuit focus:outline-none';
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  if (market !== 'dz') return <Navigate to="/boutique" replace />;

  if (done) return (
    <div className="max-w-2xl mx-auto px-5 pt-16 text-center">
      <span className="inline-flex w-16 h-16 rounded-full bg-[#DCEBE2] text-menthe items-center justify-center"><Check className="w-8 h-8" /></span>
      <h1 className="mt-5 font-display text-[2.6rem] sm:text-5xl text-nuit">Commande enregistrée !</h1>
      <p className="lecture mt-4 text-[1.15rem]">Numéro <strong>{done.number}</strong>. Nous vous appelons au <strong>{f.phone}</strong> pour confirmer avant l’envoi.</p>
      <p className="mt-2 text-henne">Vous paierez <strong className="text-nuit">{formatPrice(done.total_cents)}</strong> en espèces au livreur, à la réception.</p>
      {settings.dz_phone && <p className="mt-4 text-henne">Une question ? Appelez ou écrivez sur WhatsApp au <a className="text-garance underline" href={`tel:${settings.dz_phone.replace(/\s/g, '')}`}>{settings.dz_phone}</a>.</p>}
      <Link to="/boutique" className="inline-block mt-8 bg-nuit text-laine px-7 py-3.5 hover:bg-garance">Continuer mes achats</Link>
    </div>
  );

  if (!lines.length) return (
    <div className="max-w-2xl mx-auto px-5 pt-16"><h1 className="font-display text-4xl text-nuit">Votre panier est vide</h1>
      <Link to="/boutique" className="inline-block mt-6 text-garance underline">Voir la boutique</Link></div>
  );

  const rate = rates?.find((r) => String(r.code) === f.wilaya);
  const shipping = rate ? (f.delivery === 'bureau' ? rate.desk_cents : rate.home_cents) : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (f.name.trim().length < 2) return setError('Indiquez votre nom et prénom.');
    if (!isDzPhone(f.phone)) return setError('Numéro de téléphone invalide : 10 chiffres commençant par 05, 06 ou 07.');
    if (!rate || shipping == null) return setError('Choisissez une wilaya et un mode de livraison disponibles.');
    if (!f.commune.trim() || (f.delivery === 'domicile' && f.address.trim().length < 3)) return setError('Indiquez votre commune et votre adresse.');
    setBusy(true); setError(null);
    try {
      const r = await createCodOrder({ items: lines.map((l) => ({ id: l.id, quantity: l.quantity })), name: f.name, phone: f.phone, email: f.email,
        wilaya: rate.code, commune: f.commune, address: f.address, delivery: f.delivery, note: f.note });
      clear(); setDone(r); window.scrollTo(0, 0);
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur'); }
    finally { setBusy(false); }
  }

  return (
    <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-10">
      <div className="lisiere-fine w-16 mb-5" aria-hidden />
      <h1 className="font-display text-[2.6rem] sm:text-6xl text-nuit">Finaliser ma commande</h1>
      <p className="mt-3 flex items-center gap-2 text-henne"><Truck className="w-5 h-5 text-garance" /> Paiement à la livraison, en espèces, partout en Algérie.</p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px] items-start">
        <form onSubmit={submit} className="space-y-5" noValidate>
          <fieldset className="space-y-3">
            <legend className="font-display text-2xl text-nuit mb-2">Vos coordonnées</legend>
            <div className="grid sm:grid-cols-2 gap-3">
              <label><span className="font-medium block mb-1">Nom et prénom</span><input required maxLength={100} autoComplete="name" value={f.name} onChange={(e) => set('name', e.target.value)} className={input} /></label>
              <label><span className="font-medium block mb-1">Téléphone</span>
                <span className="relative block"><Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-henne" />
                  <input required type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="0550 12 34 56" className={`${input} pl-9`} /></span></label>
            </div>
            <label className="block"><span className="font-medium block mb-1">Email <span className="font-normal text-sm text-henne">(facultatif)</span></span>
              <input type="email" autoComplete="email" value={f.email} onChange={(e) => set('email', e.target.value)} className={input} /></label>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="font-display text-2xl text-nuit mb-2">Livraison</legend>
            <div className="grid sm:grid-cols-2 gap-3">
              <label><span className="font-medium block mb-1">Wilaya</span>
                <select required value={f.wilaya} onChange={(e) => set('wilaya', e.target.value)} className={input}>
                  <option value="">Choisir…</option>
                  {rates?.filter((r) => r.active && (r.home_cents != null || r.desk_cents != null)).map((r) => <option key={r.code} value={r.code}>{String(r.code).padStart(2, '0')} - {r.name}</option>)}
                </select></label>
              <label><span className="font-medium block mb-1">Commune</span><input required maxLength={100} value={f.commune} onChange={(e) => set('commune', e.target.value)} className={input} /></label>
            </div>
            <div className="grid sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Mode de livraison">
              {([['domicile', 'À domicile', Home, rate?.home_cents], ['bureau', 'Au bureau du transporteur', Building2, rate?.desk_cents]] as const).map(([id, label, Icon, price]) => {
                const unavailable = !!rate && price == null;
                return (
                  <label key={id} className={`flex items-start gap-3 p-4 border-2 cursor-pointer ${f.delivery === id ? 'border-nuit bg-white' : 'border-laine-fonce bg-white/60'} ${unavailable ? 'opacity-40 cursor-not-allowed' : ''}`}>
                    <input type="radio" name="livraison" disabled={unavailable} checked={f.delivery === id} onChange={() => set('delivery', id)} className="mt-1 accent-nuit" />
                    <span className="flex-1"><span className="flex items-center gap-2 font-medium text-nuit"><Icon className="w-4 h-4" /> {label}</span>
                      <span className="block text-sm text-henne">{!rate ? 'Choisissez d’abord la wilaya' : unavailable ? 'Non disponible' : formatPrice(price as number)}</span></span>
                  </label>
                );
              })}
            </div>
            {f.delivery === 'domicile' && (
              <label className="block"><span className="font-medium block mb-1">Adresse</span><input maxLength={300} autoComplete="street-address" value={f.address} onChange={(e) => set('address', e.target.value)} className={input} placeholder="Rue, cité, numéro, repère" /></label>
            )}
            <label className="block"><span className="font-medium block mb-1">Remarque <span className="font-normal text-sm text-henne">(facultatif)</span></span>
              <textarea rows={2} maxLength={1000} value={f.note} onChange={(e) => set('note', e.target.value)} className={input} placeholder="Horaires pour vous appeler, précisions…" /></label>
          </fieldset>

          {error && <p className="text-garance bg-garance/10 p-3" role="alert">{error}</p>}
          <button disabled={busy} className="w-full sm:w-auto bg-garance text-laine px-10 py-4 font-medium text-lg hover:bg-nuit disabled:opacity-60">
            {busy ? 'Envoi…' : 'Confirmer ma commande'}
          </button>
          <p className="text-sm text-henne">Aucun paiement maintenant. Nous vous appelons pour confirmer, puis vous payez au livreur à la réception.</p>
        </form>

        <aside className="bg-white border border-laine-fonce p-5 lg:sticky lg:top-24">
          <p className="font-display text-2xl text-nuit">Récapitulatif</p>
          <ul className="mt-4 space-y-3">
            {lines.map((l) => (
              <li key={l.id} className="flex items-center gap-3">
                <ProductImage src={l.image ?? undefined} alt="" className="w-12 h-14 shrink-0" />
                <span className="flex-1 min-w-0 text-[15px]"><span className="block truncate">{l.name}</span><span className="text-sm text-henne">{l.quantity} × {formatPrice(l.price_cents)}</span></span>
              </li>
            ))}
          </ul>
          <dl className="mt-5 pt-4 border-t border-laine-fonce space-y-1.5">
            <div className="flex justify-between"><dt>Articles</dt><dd>{formatPrice(subtotal)}</dd></div>
            <div className="flex justify-between text-henne"><dt>Livraison</dt><dd>{shipping == null ? '—' : shipping === 0 ? 'Offerte' : formatPrice(shipping)}</dd></div>
            <div className="flex justify-between font-display text-xl text-nuit pt-2"><dt>À payer au livreur</dt><dd>{formatPrice(subtotal + (shipping ?? 0))}</dd></div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
