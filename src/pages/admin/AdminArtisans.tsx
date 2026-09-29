import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ExternalLink, Mail, Store, X } from 'lucide-react';
import { adminListProducts } from '../../lib/api';
import { adminListSellers, adminListTransfers, adminModerateProduct, adminSetSeller, SellerWithPrivate } from '../../lib/marketplace';
import { useAsync } from '../../lib/useAsync';
import { formatDate, formatPrice } from '../../lib/format';
import { SELLER_STATUS } from '../../types';
import { ProductImage } from '../../components/ProductImage';
import { useSettings } from '../../context/SettingsContext';
import { countryName } from '../../shipping';
import { Toast } from './ui';

type Tab = 'candidatures' | 'artisans' | 'produits' | 'reversements';

export function AdminArtisans() {
  const { data, loading, error, reload } = useAsync(() => Promise.all([adminListSellers(), adminListProducts(), adminListTransfers()]), []);
  const { settings } = useSettings();
  const [tab, setTab] = useState<Tab>('candidatures');
  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3000); };

  if (loading) return <p className="text-stone-500">Chargement…</p>;
  if (error || !data) return <p className="text-garance">Impossible de charger : {error}</p>;
  const [sellers, products, transfers] = data;
  const pending = sellers.filter((s) => s.status === 'pending');
  const others = sellers.filter((s) => s.status !== 'pending');
  const toReview = products.filter((p) => p.moderation === 'pending');
  const sellerName = (id?: string | null) => sellers.find((s) => s.id === id)?.shop_name ?? '—';

  async function decide(s: SellerWithPrivate, status: 'approved' | 'rejected' | 'suspended') {
    const reason = status === 'rejected' ? prompt('Motif (envoyé à l’artisan dans son espace) :', 'Votre univers ne correspond pas encore à notre sélection.') ?? undefined : undefined;
    if (status === 'rejected' && reason === undefined) return;
    await adminSetSeller(s.id, { status }, reason);
    reload();
    flash(status === 'approved' ? `${s.shop_name} est validé : il peut maintenant activer ses paiements et ajouter ses créations` : status === 'suspended' ? 'Boutique suspendue : ses produits sont masqués' : 'Candidature refusée');
  }

  async function moderate(id: string, decision: 'approved' | 'rejected') {
    const note = decision === 'rejected' ? prompt('Que doit corriger l’artisan ?', 'Merci d’ajouter une photo en lumière naturelle.') : null;
    if (decision === 'rejected' && note === null) return;
    await adminModerateProduct(id, decision, note);
    reload();
    flash(decision === 'approved' ? 'Produit publié' : 'Produit renvoyé à l’artisan');
  }

  const tabs: [Tab, string, number][] = [['candidatures', 'Candidatures', pending.length], ['artisans', 'Artisans', others.length], ['produits', 'Produits à valider', toReview.length], ['reversements', 'Reversements', transfers.length]];

  return (
    <div className="max-w-6xl">
      <h1 className="font-display text-3xl text-nuit flex items-center gap-3"><Store className="w-7 h-7 text-garance" /> Artisans partenaires</h1>
      <p className="text-stone-500 mt-1">
        Place de marché {settings.marketplace_enabled ? 'ouverte' : 'fermée'} · commission par défaut {settings.marketplace_commission_percent} % (modifiable dans Réglages) ·{' '}
        <Link to="/vendre" target="_blank" className="underline">page de candidature</Link>
      </p>
      <div className="mt-5 flex gap-2 flex-wrap">
        {tabs.map(([id, label, n]) => (
          <button key={id} onClick={() => setTab(id)} aria-pressed={tab === id} className={`px-3.5 py-2 rounded-md text-sm ${tab === id ? 'bg-nuit text-laine' : 'bg-white border border-stone-200'}`}>
            {label} <span className="opacity-60">{n}</span>
          </button>
        ))}
      </div>

      {tab === 'candidatures' && (
        <ul className="mt-5 space-y-3">
          {pending.length === 0 && <li className="bg-white rounded-lg p-6 text-stone-500">Aucune candidature en attente.</li>}
          {pending.map((s) => (
            <li key={s.id} className="bg-white rounded-lg border border-stone-200 p-5 space-y-3">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <p className="font-display text-2xl text-nuit">{s.shop_name}</p>
                <span className="text-stone-500">{s.craft} · {s.city}, {countryName(s.country)}</span>
                <span className="text-sm text-stone-400 ml-auto">{formatDate(s.created_at)}</span>
              </div>
              <p className="text-sm"><strong>{s.legal_status === 'professionnel' ? `Professionnel · SIRET ${s.siret ?? '—'}` : 'Particulier'}</strong>{s.priv?.email && <> · <a className="text-garance underline" href={`mailto:${s.priv.email}`}>{s.priv.email}</a></>}{s.priv?.phone && ` · ${s.priv.phone}`}</p>
              {s.bio && <p className="whitespace-pre-line">{s.bio}</p>}
              {s.priv?.application_message && <p className="text-sm bg-stone-50 p-3 rounded">« {s.priv.application_message} »</p>}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => decide(s, 'approved')} className="inline-flex items-center gap-2 bg-emerald-700 text-white px-4 py-2.5 rounded-md hover:bg-emerald-800"><Check className="w-4 h-4" /> Valider</button>
                <button onClick={() => decide(s, 'rejected')} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-stone-300"><X className="w-4 h-4" /> Refuser</button>
                {s.priv?.email && <a href={`mailto:${s.priv.email}?subject=${encodeURIComponent('Votre candidature')}`} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-stone-300"><Mail className="w-4 h-4" /> Poser une question</a>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {tab === 'artisans' && (
        <ul className="mt-5 space-y-3">
          {others.length === 0 && <li className="bg-white rounded-lg p-6 text-stone-500">Aucun artisan pour l’instant.</li>}
          {others.map((s) => {
            const sales = transfers.filter((t) => t.seller_id === s.id);
            return (
              <li key={s.id} className="bg-white rounded-lg border border-stone-200 p-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                <div className="min-w-48 flex-1">
                  <p className="font-medium">{s.shop_name} <span className={`ml-2 text-xs px-2 py-0.5 rounded ${SELLER_STATUS[s.status].tone}`}>{SELLER_STATUS[s.status].label}</span></p>
                  <p className="text-sm text-stone-500">{s.craft} · {s.city} · {s.products} produit{s.products > 1 ? 's' : ''} · {s.payouts_enabled ? 'paiements actifs' : 'paiements non activés'}</p>
                  <p className="text-sm text-stone-500">{sales.length} vente{sales.length > 1 ? 's' : ''} · commission perçue {formatPrice(sales.reduce((n, t) => n + t.commission_cents, 0))}</p>
                </div>
                <label className="text-sm flex items-center gap-2">Commission
                  <select value={s.commission_percent ?? ''} onChange={async (e) => { await adminSetSeller(s.id, { commission_percent: e.target.value === '' ? null : Number(e.target.value) }); reload(); flash('Commission mise à jour'); }}
                    className="px-2 py-2 border border-stone-300 rounded-md">
                    <option value="">Par défaut ({settings.marketplace_commission_percent} %)</option>
                    {[5, 8, 10, 12, 15, 20, 25, 30].map((v) => <option key={v} value={v}>{v} %</option>)}
                  </select>
                </label>
                {s.status === 'approved' && <Link to={`/artisans/${s.slug}`} target="_blank" className="p-2.5 rounded-md hover:bg-stone-100" aria-label="Voir sa page"><ExternalLink className="w-4 h-4" /></Link>}
                {s.status === 'approved'
                  ? <button onClick={() => decide(s, 'suspended')} className="text-sm px-3.5 py-2 rounded-md border border-stone-300 hover:border-garance hover:text-garance">Suspendre</button>
                  : <button onClick={() => decide(s, 'approved')} className="text-sm px-3.5 py-2 rounded-md border border-stone-300 hover:border-emerald-700">Réactiver</button>}
              </li>
            );
          })}
        </ul>
      )}

      {tab === 'produits' && (
        <ul className="mt-5 space-y-3">
          {toReview.length === 0 && <li className="bg-white rounded-lg p-6 text-stone-500">Aucun produit à relire.</li>}
          {toReview.map((p) => (
            <li key={p.id} className="bg-white rounded-lg border border-stone-200 p-4 flex flex-wrap gap-4">
              <div className="flex gap-2">{p.images.slice(0, 3).map((src) => <ProductImage key={src} src={src} alt="" className="w-20 h-24 rounded" />)}</div>
              <div className="flex-1 min-w-60">
                <p className="font-medium">{p.name} <span className="text-stone-500 font-normal">par {sellerName(p.seller_id)}</span></p>
                <p className="text-sm text-stone-500">{formatPrice(p.price_cents)} · stock {p.stock}{p.width_cm && p.length_cm ? ` · ${p.width_cm} × ${p.length_cm} cm` : ''}{p.material ? ` · ${p.material}` : ''}</p>
                <p className="text-sm mt-2 line-clamp-3">{p.description}</p>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => moderate(p.id, 'approved')} className="inline-flex items-center gap-2 bg-emerald-700 text-white px-4 py-2.5 rounded-md hover:bg-emerald-800"><Check className="w-4 h-4" /> Publier</button>
                <button onClick={() => moderate(p.id, 'rejected')} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-stone-300"><X className="w-4 h-4" /> Demander une correction</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {tab === 'reversements' && (
        <div className="mt-5 bg-white rounded-lg border border-stone-200 p-5">
          <p className="text-sm text-stone-500 mb-3">Commission totale perçue : <strong className="text-encre">{formatPrice(transfers.reduce((n, t) => n + t.commission_cents, 0))}</strong> · versé aux artisans : {formatPrice(transfers.reduce((n, t) => n + t.amount_cents, 0))}</p>
          <ul className="divide-y divide-stone-100 text-[15px]">
            {transfers.map((t) => (
              <li key={t.id} className="py-2.5 flex flex-wrap gap-x-5">
                <span className="flex-1">{sellerName(t.seller_id)} · commande #{t.order_id.replace(/^demo-/, '').slice(0, 8).toUpperCase()}</span>
                <span className="text-stone-500">{formatDate(t.created_at)}</span>
                <span>commission {formatPrice(t.commission_cents)}</span>
                <span className="font-medium">{formatPrice(t.amount_cents)} versés</span>
                {!t.stripe_transfer_id && <span className="text-garance text-sm">virement à vérifier dans Stripe</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <Toast message={toast} />
    </div>
  );
}
