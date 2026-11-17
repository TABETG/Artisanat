import { FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, Check, Mail, Printer } from 'lucide-react';
import { listProducts, requestPaperCatalog } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { useCategories, useSettings } from '../context/SettingsContext';
import { useMarketplace } from '../context/MarketplaceContext';
import { CatalogCover } from '../components/CatalogCover';
import { ProductImage } from '../components/ProductImage';
import { formatDimensions, formatPrice } from '../lib/format';
import { COUNTRIES } from '../shipping';
import { SHOP } from '../config';

type Tab = 'en-ligne' | 'papier';

export function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('version') as Tab) ?? 'en-ligne';
  return (
    <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-12">
      <div className="grid gap-8 md:grid-cols-[auto_1fr] items-center print:hidden">
        <CatalogCover className="w-36 sm:w-48 mx-auto md:mx-0" />
        <div>
          <div className="lisiere-fine w-16 mb-5" aria-hidden />
          <h1 className="font-display text-[2.8rem] sm:text-6xl md:text-7xl text-nuit">Le catalogue</h1>
          <p className="lecture mt-4 text-[1.15rem] text-encre/80 max-w-xl">Toutes nos pièces disponibles, avec leurs photos, dimensions et prix. À feuilleter ici, à imprimer, ou à recevoir gratuitement chez vous.</p>
          <div className="mt-6 flex flex-wrap gap-2" role="tablist">
            {([['en-ligne', 'Consulter en ligne', BookOpen], ['papier', 'Recevoir la version papier', Mail]] as const).map(([id, label, Icon]) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => setParams({ version: id }, { replace: true })}
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-full font-medium ${tab === id ? 'bg-nuit text-laine' : 'border-2 border-nuit text-nuit hover:bg-nuit/5'}`}>
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-12">{tab === 'en-ligne' ? <OnlineCatalog /> : <PaperForm />}</div>
    </div>
  );
}

/** Catalogue en ligne, mis en page pour l'écran et pour l'impression (PDF). */
function OnlineCatalog() {
  const { data, loading } = useAsync(listProducts, []);
  const { categories } = useCategories();
  const { settings } = useSettings();
  const { sellerOf } = useMarketplace();
  const available = (data ?? []).filter((p) => p.stock > 0);
  const groups = categories.map((c) => ({ c, items: available.filter((p) => p.category === c.id) })).filter((g) => g.items.length);

  if (loading) return <p className="text-henne">Chargement du catalogue…</p>;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-y border-laine-fonce py-4 print:hidden">
        <p className="text-henne">{available.length} pièces disponibles · mis à jour le {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 bg-nuit text-laine px-5 py-3 hover:bg-garance"><Printer className="w-4 h-4" /> Imprimer ou enregistrer en PDF</button>
      </div>

      {/* En-tête visible seulement à l'impression */}
      <div className="hidden print:block mb-6">
        <p className="font-display text-4xl text-nuit">{SHOP.name} — Catalogue {new Date().getFullYear()}</p>
        <p className="text-sm">{SHOP.tagline} · {settings.email}{settings.phone ? ` · ${settings.phone}` : ''} · {window.location.host}</p>
        <div className="lisiere mt-3" />
      </div>

      {groups.map(({ c, items }) => (
        <section key={c.id} className="mt-12 first:mt-8 print:mt-6 print:break-before-auto">
          <h2 className="font-display text-4xl text-nuit border-b-2 border-nuit pb-2 print:text-2xl">{c.label}</h2>
          <div className="mt-6 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 print:gap-4">
            {items.map((p) => {
              const seller = sellerOf(p.seller_id);
              const dims = formatDimensions(p.width_cm, p.length_cm) || p.jewelry_size || p.net_content;
              return (
                <Link key={p.id} to={`/produit/${p.id}`} className="group flex gap-4 break-inside-avoid">
                  <ProductImage src={p.images[0]} alt="" className="w-28 h-36 shrink-0 print:w-24 print:h-28" />
                  <span className="min-w-0">
                    <span className="block font-display text-xl leading-tight text-nuit group-hover:text-garance print:text-base">{p.name}</span>
                    {seller && <span className="block text-xs text-henne">par {seller.shop_name}</span>}
                    <span className="block mt-1 text-sm text-henne">{[dims, p.technique, p.metal, p.origin].filter(Boolean).join(' · ')}</span>
                    <span className="block mt-2 font-semibold text-nuit">
                      {formatPrice(p.price_cents)}
                      {p.compare_at_price_cents && p.compare_at_price_cents > p.price_cents && <span className="ml-2 text-sm font-normal line-through text-henne">{formatPrice(p.compare_at_price_cents)}</span>}
                    </span>
                    {p.reference && <span className="block text-xs text-henne mt-0.5">Réf. {p.reference}</span>}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
      <p className="mt-12 text-sm text-henne print:mt-6">Prix TTC, sous réserve de disponibilité (pièces uniques). Commande en ligne sur {window.location.host} ou au {settings.phone || settings.email}.</p>
    </div>
  );
}

function PaperForm() {
  const [f, setF] = useState({ name: '', email: '', line1: '', line2: '', postal_code: '', city: '', country: 'FR', newsletter: true });
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const input = 'w-full px-3.5 py-3 bg-white border border-laine-fonce focus:border-nuit focus:outline-none';
  const set = (k: keyof typeof f, v: string | boolean) => setF({ ...f, [k]: v });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState('sending'); setError(null);
    try { await requestPaperCatalog(f); setState('done'); } catch (err) { setError(err instanceof Error ? err.message : 'Erreur'); setState('idle'); }
  }

  if (state === 'done') return (
    <div className="max-w-xl flex gap-3 bg-[#DCEBE2] text-menthe p-5" role="status">
      <Check className="w-6 h-6 shrink-0" />
      <p>Demande enregistrée. Votre catalogue part par la poste sous une semaine environ. En attendant, <Link to="/catalogue?version=en-ligne" className="underline">feuilletez-le en ligne</Link>.</p>
    </div>
  );

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-4">
      <p className="font-display text-3xl text-nuit">Recevoir le catalogue chez vous</p>
      <p className="text-henne">Gratuit, sans engagement. Nous l’envoyons par la poste.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <label><span className="font-medium block mb-1">Nom et prénom</span><input required maxLength={100} autoComplete="name" value={f.name} onChange={(e) => set('name', e.target.value)} className={input} /></label>
        <label><span className="font-medium block mb-1">Email</span><input required type="email" autoComplete="email" value={f.email} onChange={(e) => set('email', e.target.value)} className={input} /></label>
      </div>
      <label className="block"><span className="font-medium block mb-1">Adresse</span><input required maxLength={200} autoComplete="address-line1" value={f.line1} onChange={(e) => set('line1', e.target.value)} className={input} /></label>
      <label className="block"><span className="font-medium block mb-1">Complément <span className="font-normal text-sm text-henne">(facultatif)</span></span><input maxLength={200} autoComplete="address-line2" value={f.line2} onChange={(e) => set('line2', e.target.value)} className={input} /></label>
      <div className="grid grid-cols-[1fr_2fr] sm:grid-cols-[1fr_2fr_1.5fr] gap-3">
        <label><span className="font-medium block mb-1">Code postal</span><input required maxLength={12} autoComplete="postal-code" value={f.postal_code} onChange={(e) => set('postal_code', e.target.value)} className={input} /></label>
        <label><span className="font-medium block mb-1">Ville</span><input required maxLength={100} autoComplete="address-level2" value={f.city} onChange={(e) => set('city', e.target.value)} className={input} /></label>
        <label className="col-span-2 sm:col-span-1"><span className="font-medium block mb-1">Pays</span>
          <select value={f.country} onChange={(e) => set('country', e.target.value)} className={input}>{COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></label>
      </div>
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={f.newsletter} onChange={(e) => set('newsletter', e.target.checked)} className="mt-1 w-4 h-4 accent-nuit" />
        <span>Je souhaite aussi recevoir la lettre d’information (nouvelles pièces, offres). Désabonnement en un clic.</span>
      </label>
      <p className="text-xs text-henne">Votre adresse sert uniquement à l’envoi du catalogue ; elle est supprimée un an après. <Link to="/confidentialite" className="underline">Vos données et vos droits</Link>.</p>
      {error && <p className="text-garance text-sm" role="alert">{error}</p>}
      <button disabled={state === 'sending'} className="bg-garance text-laine px-10 py-4 rounded-full font-semibold uppercase tracking-wide text-sm hover:bg-nuit disabled:opacity-60">{state === 'sending' ? 'Envoi…' : 'Recevoir le catalogue'}</button>
    </form>
  );
}
