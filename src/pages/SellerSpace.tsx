import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Check, ExternalLink, ImagePlus, Package, Pencil, Plus, Store, Trash2, Wallet, X } from 'lucide-react';
import {
  deleteMyProduct, getMySeller, listMyProducts, listMySellerOrders, listMyTransfers, markShippedBySeller, MySeller, saveMyProduct, sellerStripe, updateMySeller, uploadMyImage,
} from '../lib/marketplace';
import { useAsync } from '../lib/useAsync';
import { centsToInput, formatDate, formatPrice, parsePriceToCents } from '../lib/format';
import { orderNumber } from '../lib/documents';
import { useCategories, useSettings } from '../context/SettingsContext';
import { CARRIERS } from '../config';
import { Product, ProductInput, SELLER_STATUS } from '../types';
import { ProductImage } from '../components/ProductImage';

type View = 'produits' | 'commandes' | 'revenus' | 'boutique';
const input = 'w-full px-3.5 py-3 bg-white border border-laine-fonce focus:border-nuit focus:outline-none';

/** Onglet « Mon atelier » de Mon compte : l'espace de l'artisan qui vend sur la boutique. */
export function SellerSpace() {
  const { data: me, loading, reload } = useAsync(getMySeller, []);
  const [params] = useSearchParams();
  const [view, setView] = useState<View>('produits');

  // Retour de l'ouverture du compte Stripe : on vérifie tout de suite si les paiements sont actifs
  useEffect(() => { if (params.get('stripe') === 'retour') sellerStripe('status').then(reload).catch(() => {}); }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <p className="text-henne">Chargement…</p>;
  if (!me) return (
    <div className="max-w-xl">
      <p className="font-display text-3xl text-nuit">Vous créez à la main ?</p>
      <p className="lecture mt-2 text-henne">Proposez vos créations sur la boutique : vous fixez vos prix, nous nous occupons de la vitrine et du paiement.</p>
      <Link to="/vendre" className="inline-block mt-6 bg-nuit text-laine px-6 py-3.5 font-medium hover:bg-garance">Devenir artisan partenaire</Link>
    </div>
  );

  const { seller } = me;
  if (seller.status !== 'approved') {
    return (
      <div className="max-w-xl border border-laine-fonce bg-white/60 p-6">
        <p className={`inline-block text-sm px-2.5 py-1 ${SELLER_STATUS[seller.status].tone}`}>{SELLER_STATUS[seller.status].label}</p>
        <p className="font-display text-3xl text-nuit mt-3">{seller.shop_name}</p>
        <p className="lecture mt-2 text-henne">
          {seller.status === 'pending' && 'Merci ! Nous étudions votre candidature et vous répondons par email sous quelques jours.'}
          {seller.status === 'rejected' && (me.priv?.rejection_reason || 'Votre candidature n’a pas été retenue pour le moment.')}
          {seller.status === 'suspended' && 'Votre boutique est suspendue. Écrivez-nous pour en savoir plus.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Store className="w-7 h-7 text-garance" />
        <p className="font-display text-3xl text-nuit">{seller.shop_name}</p>
        <Link to={`/artisans/${seller.slug}`} className="text-sm lien-tisse text-nuit pb-0.5 inline-flex items-center gap-1">Voir ma page <ExternalLink className="w-3.5 h-3.5" /></Link>
      </div>
      <PayoutsBanner me={me} onChange={reload} />
      <div className="flex gap-2 flex-wrap">
        {([['produits', 'Mes produits'], ['commandes', 'À expédier'], ['revenus', 'Revenus'], ['boutique', 'Ma boutique']] as [View, string][]).map(([id, l]) => (
          <button key={id} onClick={() => setView(id)} aria-pressed={view === id} className={`px-4 py-2 rounded-full text-sm font-medium ${view === id ? 'bg-nuit text-laine' : 'border border-nuit/20 text-nuit hover:border-nuit'}`}>{l}</button>
        ))}
      </div>
      {view === 'produits' && <MyProducts sellerId={seller.id} />}
      {view === 'commandes' && <MyOrders sellerId={seller.id} />}
      {view === 'revenus' && <MyRevenue sellerId={seller.id} />}
      {view === 'boutique' && <MyShop me={me} onSaved={reload} />}
    </div>
  );
}

function PayoutsBanner({ me, onChange }: { me: MySeller; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function go(action: 'onboard' | 'dashboard') {
    setBusy(true); setError(null);
    try { const r = await sellerStripe(action); if (r.url) window.location.href = r.url; else { onChange(); setBusy(false); } }
    catch (e) { setError(e instanceof Error ? e.message : 'Erreur'); setBusy(false); }
  }
  if (me.seller.payouts_enabled) {
    return (
      <div className="flex flex-wrap items-center gap-3 bg-[#DCEBE2] text-menthe p-4">
        <Check className="w-5 h-5" /> <span className="flex-1">Paiements activés : vos ventes vous sont versées automatiquement par Stripe.</span>
        <button onClick={() => go('dashboard')} disabled={busy} className="underline">Mon tableau de bord Stripe</button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3 bg-safran/20 text-nuit p-4">
      <AlertTriangle className="w-5 h-5 text-henne" />
      <span className="flex-1">Dernière étape : activez vos paiements (identité et IBAN, 5 minutes chez Stripe). Vos produits ne sont achetables qu’ensuite.</span>
      <button onClick={() => go('onboard')} disabled={busy} className="bg-nuit text-laine px-5 py-2.5 font-medium hover:bg-garance disabled:opacity-60">{busy ? 'Ouverture…' : 'Activer mes paiements'}</button>
      {error && <p className="w-full text-sm text-garance">{error}</p>}
    </div>
  );
}

// ---------------- Produits ----------------
function MyProducts({ sellerId }: { sellerId: string }) {
  const { data, loading, reload } = useAsync(() => listMyProducts(sellerId), [sellerId]);
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  if (editing) return <ProductForm sellerId={sellerId} product={editing === 'new' ? null : editing} onDone={() => { setEditing(null); reload(); }} />;
  const labels = { approved: ['En ligne', 'bg-emerald-100 text-emerald-800'], pending: ['En relecture', 'bg-safran/25 text-henne'], rejected: ['À corriger', 'bg-garance/10 text-garance'] } as const;
  return (
    <div>
      <button onClick={() => setEditing('new')} className="inline-flex items-center gap-2 bg-garance text-laine px-5 py-3 font-medium hover:bg-nuit"><Plus className="w-4 h-4" /> Ajouter une création</button>
      <p className="text-sm text-henne mt-3">Chaque nouvelle création, et chaque modification du nom, du prix, des photos ou de la description, est relue par la boutique avant publication (en général sous 48 h).</p>
      {loading ? <p className="mt-6 text-henne">Chargement…</p> : (
        <ul className="mt-6 space-y-3">
          {data?.length === 0 && <li className="text-henne">Aucune création pour l’instant.</li>}
          {data?.map((p) => {
            const [label, tone] = labels[p.moderation ?? 'approved'];
            return (
              <li key={p.id} className="flex items-center gap-4 border border-laine-fonce bg-white/60 p-3">
                <ProductImage src={p.images[0]} alt="" className="w-16 h-20 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-nuit truncate">{p.name}</p>
                  <p className="text-sm text-henne">{formatPrice(p.price_cents)} · {p.stock} en stock{!p.active ? ' · masqué' : ''}</p>
                  <p className="mt-1 flex flex-wrap gap-2 items-center"><span className={`text-xs px-2 py-0.5 ${tone}`}>{label}</span>
                    {p.moderation === 'rejected' && p.moderation_note && <span className="text-xs text-garance">{p.moderation_note}</span>}</p>
                </div>
                <button onClick={() => setEditing(p)} className="p-2.5 hover:bg-laine-fonce" aria-label={`Modifier ${p.name}`}><Pencil className="w-4 h-4" /></button>
                <button onClick={async () => { if (confirm(`Supprimer « ${p.name} » ?`)) { try { await deleteMyProduct(p.id); reload(); } catch (e) { alert(e instanceof Error ? e.message : 'Erreur'); } } }}
                  className="p-2.5 text-garance hover:bg-garance/10" aria-label={`Supprimer ${p.name}`}><Trash2 className="w-4 h-4" /></button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ProductForm({ sellerId, product, onDone }: { sellerId: string; product: Product | null; onDone: () => void }) {
  const { categories, kindOf } = useCategories();
  const file = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({
    name: product?.name ?? '', category: product?.category ?? categories[0]?.id ?? 'autres', price: product ? centsToInput(product.price_cents) : '', stock: product?.stock ?? 1,
    width: product?.width_cm ? String(product.width_cm) : '', length: product?.length_cm ? String(product.length_cm) : '', material: product?.material ?? '',
    technique: product?.technique ?? '', description: product?.description ?? '', images: product?.images ?? [] as string[], active: product?.active ?? true,
    metal: product?.metal ?? '', stones: product?.stones ?? '', jewelry_size: product?.jewelry_size ?? '',
    net_content: product?.net_content ?? '', ingredients: product?.ingredients ?? '', warnings: product?.warnings ?? '', cpnp_ref: product?.cpnp_ref ?? '',
  });
  const kind = kindOf(f.category);
  const [uploading, setUploading] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addFiles(files: FileList | null) {
    for (const file of Array.from(files ?? []).filter((x) => x.type.startsWith('image/'))) {
      setUploading((n) => n + 1);
      try { const url = await uploadMyImage(sellerId, file); setF((s) => ({ ...s, images: [...s.images, url] })); } catch { setError('Une photo n’a pas pu être envoyée.'); }
      finally { setUploading((n) => n - 1); }
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const price = parsePriceToCents(f.price);
    if (!f.name.trim()) return setError('Donnez un nom à votre création.');
    if (!price) return setError('Indiquez un prix.');
    if (!f.images.length) return setError('Ajoutez au moins une photo.');
    if (kind === 'cosmetique' && (!f.ingredients.trim() || !f.cpnp_ref.trim() || !f.warnings.trim() || !f.net_content.trim())) {
      return setError('Cosmétique : contenance, ingrédients, précautions et référence CPNP sont obligatoires.');
    }
    setBusy(true); setError(null);
    const num = (v: string) => (v.trim() ? parseInt(v, 10) || null : null);
    const base: ProductInput = {
      name: f.name.trim(), description: f.description.trim(), category: f.category, price_cents: price, stock: f.stock, width_cm: num(f.width), length_cm: num(f.length),
      material: f.material.trim(), origin: '', images: f.images, featured: false, active: f.active, reference: product?.reference ?? '', compare_at_price_cents: null,
      technique: f.technique.trim(), colors: product?.colors ?? [], pile_height_mm: null, weight_kg: null, care: product?.care ?? '', made_to_order: false, low_stock_threshold: 1,
      badges: [], promo_ends_at: null, sales_count: product?.sales_count ?? 0, publish_at: null, views_count: product?.views_count ?? 0, cart_adds_count: product?.cart_adds_count ?? 0,
      metal: f.metal.trim(), stones: f.stones.trim(), jewelry_size: f.jewelry_size.trim(), nickel_free: product?.nickel_free ?? false,
      net_content: f.net_content.trim(), ingredients: f.ingredients.trim(), usage: product?.usage ?? '', warnings: f.warnings.trim(), pao_months: product?.pao_months ?? null, cpnp_ref: f.cpnp_ref.trim(),
    };
    try { await saveMyProduct(sellerId, base, product?.id); onDone(); } catch (err) { setError(err instanceof Error ? err.message : 'Erreur'); setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-5">
      <button type="button" onClick={onDone} className="inline-flex items-center gap-1.5 text-henne hover:text-nuit"><ArrowLeft className="w-4 h-4" /> Retour</button>
      <p className="font-display text-3xl text-nuit">{product ? 'Modifier ma création' : 'Nouvelle création'}</p>
      <div>
        <p className="font-medium mb-2">Photos <span className="text-sm font-normal text-henne">(la première est la principale)</span></p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {f.images.map((src, i) => (
            <div key={src} className="relative">
              <img src={src} alt={`Photo ${i + 1}`} className="w-full aspect-[4/5] object-cover" />
              <button type="button" onClick={() => setF({ ...f, images: f.images.filter((x) => x !== src) })} className="absolute top-1.5 right-1.5 bg-white/90 rounded-full p-1" aria-label="Retirer"><X className="w-4 h-4" /></button>
            </div>
          ))}
          {Array.from({ length: uploading }).map((_, i) => <div key={i} className="aspect-[4/5] bg-laine-fonce animate-pulse" />)}
          <button type="button" onClick={() => file.current?.click()} className="aspect-[4/5] border-2 border-dashed border-laine-fonce hover:border-nuit flex flex-col items-center justify-center gap-1 text-henne">
            <ImagePlus className="w-7 h-7" /><span className="text-sm">Ajouter</span>
          </button>
        </div>
        <input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
      </div>
      <label className="block"><span className="font-medium block mb-1">Nom</span><input value={f.name} maxLength={120} onChange={(e) => setF({ ...f, name: e.target.value })} className={input} /></label>
      <div className="grid grid-cols-3 gap-3">
        <label><span className="font-medium block mb-1">Prix (€)</span><input inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} className={input} /></label>
        <label><span className="font-medium block mb-1">Stock</span><input type="number" min={0} value={f.stock} onChange={(e) => setF({ ...f, stock: Math.max(0, parseInt(e.target.value, 10) || 0) })} className={input} /></label>
        <label><span className="font-medium block mb-1">Catégorie</span><select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className={input}>{categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <label><span className="font-medium block mb-1">Largeur (cm)</span><input inputMode="numeric" value={f.width} onChange={(e) => setF({ ...f, width: e.target.value.replace(/\D/g, '') })} className={input} /></label>
        <label><span className="font-medium block mb-1">Longueur (cm)</span><input inputMode="numeric" value={f.length} onChange={(e) => setF({ ...f, length: e.target.value.replace(/\D/g, '') })} className={input} /></label>
        <label className="col-span-2"><span className="font-medium block mb-1">Matière</span><input value={f.material} maxLength={80} onChange={(e) => setF({ ...f, material: e.target.value })} className={input} placeholder="Laine, argile, cuir…" /></label>
      </div>
      {kind === 'bijou' && (
        <div className="grid sm:grid-cols-3 gap-3">
          <label><span className="font-medium block mb-1">Métal</span><input value={f.metal} maxLength={120} onChange={(e) => setF({ ...f, metal: e.target.value })} className={input} placeholder="Argent 925" /></label>
          <label><span className="font-medium block mb-1">Pierres, décor</span><input value={f.stones} maxLength={200} onChange={(e) => setF({ ...f, stones: e.target.value })} className={input} placeholder="Corail, émail" /></label>
          <label><span className="font-medium block mb-1">Taille</span><input value={f.jewelry_size} maxLength={120} onChange={(e) => setF({ ...f, jewelry_size: e.target.value })} className={input} placeholder="Chaîne 45 cm" /></label>
        </div>
      )}
      {kind === 'cosmetique' && (
        <fieldset className="border border-laine-fonce p-4 space-y-3">
          <legend className="px-1 font-display text-xl text-nuit">Informations cosmétiques obligatoires</legend>
          <p className="text-sm text-henne">Un cosmétique ne peut être vendu qu’après évaluation de sa sécurité et notification sur le portail européen CPNP. Le khôl à base de plomb (galène) est interdit.</p>
          <div className="grid grid-cols-2 gap-3">
            <label><span className="font-medium block mb-1">Contenance</span><input value={f.net_content} maxLength={40} onChange={(e) => setF({ ...f, net_content: e.target.value })} className={input} placeholder="5 g" /></label>
            <label><span className="font-medium block mb-1">Référence CPNP</span><input value={f.cpnp_ref} maxLength={40} onChange={(e) => setF({ ...f, cpnp_ref: e.target.value })} className={input} /></label>
          </div>
          <label className="block"><span className="font-medium block mb-1">Ingrédients (liste INCI)</span><textarea rows={3} maxLength={3000} value={f.ingredients} onChange={(e) => setF({ ...f, ingredients: e.target.value })} className={input} /></label>
          <label className="block"><span className="font-medium block mb-1">Précautions d’emploi</span><textarea rows={2} maxLength={1500} value={f.warnings} onChange={(e) => setF({ ...f, warnings: e.target.value })} className={input} placeholder="Usage externe. Tenir hors de portée des enfants…" /></label>
        </fieldset>
      )}
      <label className="block"><span className="font-medium block mb-1">Technique</span><input value={f.technique} maxLength={80} onChange={(e) => setF({ ...f, technique: e.target.value })} className={input} placeholder="Tissé main, tourné, brodé…" /></label>
      <label className="block"><span className="font-medium block mb-1">Description</span><textarea rows={6} maxLength={2000} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className={input} /></label>
      <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} className="w-5 h-5 accent-nuit" /> Proposer à la vente</label>
      {error && <p className="text-garance text-sm" role="alert">{error}</p>}
      <button disabled={busy || uploading > 0} className="bg-garance text-laine px-7 py-3.5 font-medium hover:bg-nuit disabled:opacity-60">{busy ? 'Envoi…' : product ? 'Enregistrer' : 'Envoyer en relecture'}</button>
    </form>
  );
}

// ---------------- Commandes à expédier ----------------
function MyOrders({ sellerId }: { sellerId: string }) {
  const { data, loading, reload } = useAsync(() => listMySellerOrders(sellerId), [sellerId]);
  if (loading) return <p className="text-henne">Chargement…</p>;
  if (!data?.length) return <p className="lecture text-henne">Aucune commande pour l’instant. Vous recevrez un email à chaque vente.</p>;
  return (
    <ul className="space-y-4">
      {data.map((o) => <OrderRow key={o.id} sellerId={sellerId} o={o} onSaved={reload} />)}
    </ul>
  );
}

function OrderRow({ sellerId, o, onSaved }: { sellerId: string; o: Awaited<ReturnType<typeof listMySellerOrders>>[number]; onSaved: () => void }) {
  const [carrier, setCarrier] = useState('colissimo');
  const [tracking, setTracking] = useState('');
  const [busy, setBusy] = useState(false);
  const a = o.shipping_address;
  return (
    <li className="border border-laine-fonce bg-white/60 p-5 grid gap-5 md:grid-cols-2">
      <div>
        <p className="font-display text-2xl text-nuit">Commande #{orderNumber(o)}</p>
        <p className="text-sm text-henne">{formatDate(o.created_at)}</p>
        <ul className="mt-3 text-[15px]">{o.items.map((i) => <li key={i.name}>{i.quantity} × {i.name} <span className="text-henne">({formatPrice(i.unit_price_cents)})</span></li>)}</ul>
        {o.customer_message && <p className="mt-3 text-sm bg-safran/15 p-2.5">Message du client : {o.customer_message}</p>}
      </div>
      <div className="text-[15px]">
        <p className="text-sm text-henne">Envoyer à</p>
        <p className="font-medium">{o.shipping_name}</p>
        {a && <p className="whitespace-pre-line">{[a.line1, a.line2, `${a.postal_code ?? ''} ${a.city ?? ''}`, a.country].filter(Boolean).join('\n')}</p>}
        {o.phone && <p className="text-sm text-henne">{o.phone}</p>}
        {o.status === 'to_ship' ? (
          <div className="mt-4 flex flex-wrap gap-2 items-end">
            <select value={carrier} onChange={(e) => setCarrier(e.target.value)} className="px-3 py-2.5 bg-white border border-laine-fonce" aria-label="Transporteur">{CARRIERS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
            <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Numéro de suivi" className="flex-1 min-w-40 px-3 py-2.5 bg-white border border-laine-fonce" />
            <button disabled={busy} onClick={async () => { setBusy(true); await markShippedBySeller(sellerId, o.id, carrier, tracking.trim()); onSaved(); }}
              className="bg-nuit text-laine px-4 py-2.5 hover:bg-garance disabled:opacity-60 inline-flex items-center gap-2"><Package className="w-4 h-4" /> Marquer expédiée</button>
          </div>
        ) : (
          <p className="mt-4 inline-flex items-center gap-2 bg-[#DCEBE2] text-menthe px-3 py-1.5 text-sm"><Check className="w-4 h-4" /> Expédiée{o.tracking_number ? ` · ${o.tracking_number}` : ''}</p>
        )}
      </div>
    </li>
  );
}

// ---------------- Revenus ----------------
function MyRevenue({ sellerId }: { sellerId: string }) {
  const { data } = useAsync(() => listMyTransfers(sellerId), [sellerId]);
  const list = data ?? [];
  const sum = (k: 'sales_cents' | 'commission_cents' | 'amount_cents') => list.reduce((n, t) => n + t[k], 0);
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        {([['Ventes', sum('sales_cents')], ['Commission de la boutique', sum('commission_cents')], ['Versé sur votre compte', sum('amount_cents')]] as const).map(([l, v]) => (
          <div key={l} className="border border-laine-fonce bg-white/60 p-5"><p className="text-sm text-henne">{l}</p><p className="font-display text-3xl text-nuit mt-1">{formatPrice(v)}</p></div>
        ))}
      </div>
      <ul className="mt-6 divide-y divide-laine-fonce text-[15px]">
        {list.map((t) => (
          <li key={t.id} className="py-3 flex flex-wrap gap-x-5 gap-y-1">
            <Wallet className="w-4 h-4 text-henne mt-1" />
            <span className="flex-1">Commande #{t.order_id.replace(/^demo-/, '').slice(0, 8).toUpperCase()} · {formatDate(t.created_at)}</span>
            <span className="text-henne">{formatPrice(t.sales_cents)} − {formatPrice(t.commission_cents)}{t.shipping_cents ? ` + ${formatPrice(t.shipping_cents)} d’envoi` : ''}</span>
            <span className="font-semibold text-nuit">{formatPrice(t.amount_cents)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-henne">Stripe verse ces montants sur votre compte bancaire selon le calendrier choisi dans votre tableau de bord Stripe.</p>
    </div>
  );
}

// ---------------- Profil de la boutique ----------------
function MyShop({ me, onSaved }: { me: MySeller; onSaved: () => void }) {
  const { settings } = useSettings();
  const s = me.seller;
  const [f, setF] = useState({ shop_name: s.shop_name, craft: s.craft, bio: s.bio, city: s.city, fr: centsToInput(s.shipping_france_cents), eu: s.shipping_europe_cents == null ? '' : centsToInput(s.shipping_europe_cents),
    free: s.free_shipping_from_cents ? centsToInput(s.free_shipping_from_cents) : '', prep: s.prep_days, ret: s.return_policy });
  const [saved, setSaved] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    await updateMySeller(s.id, { shop_name: f.shop_name.trim(), craft: f.craft.trim(), bio: f.bio.trim(), city: f.city.trim(), shipping_france_cents: parsePriceToCents(f.fr || '0') ?? 0,
      shipping_europe_cents: f.eu.trim() ? parsePriceToCents(f.eu) : null, free_shipping_from_cents: f.free.trim() ? parsePriceToCents(f.free) : null, prep_days: f.prep, return_policy: f.ret.trim() });
    setSaved(true); setTimeout(() => setSaved(false), 2500); onSaved();
  }
  return (
    <form onSubmit={submit} className="max-w-2xl space-y-5">
      <div className="grid sm:grid-cols-2 gap-3">
        <label><span className="font-medium block mb-1">Nom de l’atelier</span><input value={f.shop_name} maxLength={60} onChange={(e) => setF({ ...f, shop_name: e.target.value })} className={input} /></label>
        <label><span className="font-medium block mb-1">Ville</span><input value={f.city} maxLength={80} onChange={(e) => setF({ ...f, city: e.target.value })} className={input} /></label>
      </div>
      <label className="block"><span className="font-medium block mb-1">Spécialité</span><input value={f.craft} maxLength={80} onChange={(e) => setF({ ...f, craft: e.target.value })} className={input} /></label>
      <label className="block"><span className="font-medium block mb-1">Présentation</span><textarea rows={5} maxLength={2000} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} className={input} /></label>
      <fieldset className="border border-laine-fonce p-4 space-y-3">
        <legend className="px-1 font-display text-xl text-nuit">Mes envois</legend>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <label><span className="text-sm block mb-1">France (€)</span><input inputMode="decimal" value={f.fr} onChange={(e) => setF({ ...f, fr: e.target.value })} className={input} /></label>
          <label><span className="text-sm block mb-1">Hors France (€)</span><input inputMode="decimal" value={f.eu} placeholder="Non" onChange={(e) => setF({ ...f, eu: e.target.value })} className={input} /></label>
          <label><span className="text-sm block mb-1">Offerts dès (€)</span><input inputMode="decimal" value={f.free} placeholder="Jamais" onChange={(e) => setF({ ...f, free: e.target.value })} className={input} /></label>
          <label><span className="text-sm block mb-1">Préparation (jours)</span><input type="number" min={0} max={60} value={f.prep} onChange={(e) => setF({ ...f, prep: parseInt(e.target.value, 10) || 0 })} className={input} /></label>
        </div>
        <p className="text-xs text-henne">« Hors France » vide : vous ne livrez qu’en France. Les frais d’envoi vous sont reversés en totalité.</p>
      </fieldset>
      <label className="block"><span className="font-medium block mb-1">Ma politique de retour</span><textarea rows={2} maxLength={1000} value={f.ret} onChange={(e) => setF({ ...f, ret: e.target.value })} className={input}
        placeholder={s.legal_status === 'professionnel' ? 'Obligatoire pour un professionnel : 14 jours de rétractation minimum.' : 'Ex. : retour accepté sous 14 jours, frais de retour à la charge du client.'} /></label>
      <p className="text-sm text-henne">Commission de la boutique sur vos ventes : {s.commission_percent ?? settings.marketplace_commission_percent} %.</p>
      <button className="bg-nuit text-laine px-7 py-3.5 font-medium hover:bg-garance inline-flex items-center gap-2">{saved ? <><Check className="w-4 h-4" /> Enregistré</> : 'Enregistrer'}</button>
    </form>
  );
}
