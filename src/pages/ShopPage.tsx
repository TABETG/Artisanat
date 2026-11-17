import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { listProducts } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { ProductCard } from '../components/ProductCard';
import { Drawer } from '../components/Drawer';
import { COLORS, TECHNIQUES } from '../config';
import { useCategories, useSettings } from '../context/SettingsContext';
import { discountOf, isNew } from '../badges';
import { Product } from '../types';
import { useMarketplace } from '../context/MarketplaceContext';

type Sort = 'recent' | 'prix-croissant' | 'prix-decroissant' | 'promo' | 'ventes';

const SIZES = [
  { id: 'petit', label: 'Petit, jusqu’à 150 cm', test: (l: number) => l <= 150 },
  { id: 'moyen', label: 'Moyen, 150 à 250 cm', test: (l: number) => l > 150 && l < 250 },
  { id: 'grand', label: 'Grand, 250 cm et plus', test: (l: number) => l >= 250 },
];
const PRICE_RANGES = [
  { label: 'Moins de 100 €', min: '', max: '100' },
  { label: '100 à 500 €', min: '100', max: '500' },
  { label: '500 à 1 000 €', min: '500', max: '1000' },
  { label: 'Plus de 1 000 €', min: '1000', max: '' },
];

type Facet = 'categorie' | 'taille' | 'couleur' | 'technique' | 'prix' | 'options' | 'vendeur';

export function ShopPage() {
  const { data, loading, error, reload } = useAsync(listProducts, []);
  const [params, setParams] = useSearchParams();
  const [drawer, setDrawer] = useState(false);
  const PAGE = 24;
  const [shown, setShown] = useState(PAGE);
  const { categories, label: categoryLabel, kindOf } = useCategories();
  const { settings } = useSettings();
  const all = data ?? [];
  const { sellers, sellerOf } = useMarketplace();

  // ---------- Filtres lus dans l'adresse (partageables, bouton retour du navigateur) ----------
  const list = (k: string) => (params.get(k) ?? '').split(',').filter(Boolean);
  const f = {
    categorie: params.get('categorie') ?? '',
    recherche: params.get('recherche') ?? '',
    tri: (params.get('tri') as Sort) ?? 'recent',
    taille: list('taille'),
    couleur: list('couleur'),
    technique: list('technique'),
    vendeur: list('vendeur'),
    min: params.get('prix-min') ?? '',
    max: params.get('prix-max') ?? '',
    disponibles: params.get('disponibles') === '1',
    promotion: params.get('promotion') === '1',
    nouveautes: params.get('nouveautes') === '1',
    surMesure: params.get('sur-mesure') === '1',
  };

  // Nouvelle recherche ou nouveau filtre : on repart des premières pièces
  useEffect(() => { setShown(PAGE); }, [params]);

  function set(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (!value) next.delete(key); else next.set(key, value);
    setParams(next, { replace: true });
  }
  function toggleIn(key: string, value: string) {
    const cur = list(key);
    set(key, (cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value]).join(','));
  }
  const clearAll = () => setParams(f.recherche ? { recherche: f.recherche } : {}, { replace: true });

  const longest = (p: Product) => Math.max(p.length_cm ?? 0, p.width_cm ?? 0);
  const q = f.recherche.trim().toLowerCase();

  /** Un produit passe-t-il les filtres, en ignorant éventuellement une famille (pour compter les options) ? */
  const passes = (p: Product, skip?: Facet) =>
    (skip === 'categorie' || !f.categorie || p.category === f.categorie) &&
    (skip === 'taille' || !f.taille.length || f.taille.some((id) => { const l = longest(p); return kindOf(p.category) === 'textile' && !!l && SIZES.find((s) => s.id === id)!.test(l); })) &&
    (skip === 'couleur' || !f.couleur.length || f.couleur.some((c) => p.colors?.includes(c))) &&
    (skip === 'technique' || !f.technique.length || f.technique.includes(p.technique)) &&
    (skip === 'vendeur' || !f.vendeur.length || f.vendeur.includes(p.seller_id ? sellerOf(p.seller_id)?.slug ?? '' : 'atelier')) &&
    (skip === 'prix' || ((!f.min || p.price_cents >= +f.min * 100) && (!f.max || p.price_cents <= +f.max * 100))) &&
    (skip === 'options' || ((!f.disponibles || p.stock > 0) && (!f.promotion || !!discountOf(p)) && (!f.nouveautes || isNew(p, settings.new_days)) && (!f.surMesure || p.made_to_order))) &&
    (!q || `${p.name} ${p.description} ${p.material} ${p.origin} ${p.technique}`.toLowerCase().includes(q));

  const count = (skip: Facet, test: (p: Product) => boolean) => all.filter((p) => passes(p, skip) && test(p)).length;

  const visible = useMemo(() => {
    let r = all.filter((p) => passes(p));
    if (f.tri === 'prix-croissant') r = [...r].sort((a, b) => a.price_cents - b.price_cents);
    if (f.tri === 'prix-decroissant') r = [...r].sort((a, b) => b.price_cents - a.price_cents);
    if (f.tri === 'ventes') r = [...r].sort((a, b) => (b.sales_count ?? 0) - (a.sales_count ?? 0));
    if (f.tri === 'promo') r = [...r].sort((a, b) => (discountOf(b) ?? 0) - (discountOf(a) ?? 0));
    return [...r.filter((p) => p.stock > 0), ...r.filter((p) => p.stock === 0)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, params, settings.new_days]);

  // ---------- Filtres actifs, affichés en étiquettes supprimables ----------
  const chips: { label: string; remove: () => void }[] = [
    ...(f.categorie ? [{ label: categoryLabel(f.categorie), remove: () => set('categorie', null) }] : []),
    ...f.taille.map((t) => ({ label: SIZES.find((s) => s.id === t)?.label ?? t, remove: () => toggleIn('taille', t) })),
    ...f.couleur.map((c) => ({ label: COLORS.find((x) => x.id === c)?.label ?? c, remove: () => toggleIn('couleur', c) })),
    ...f.technique.map((t) => ({ label: t, remove: () => toggleIn('technique', t) })),
    ...f.vendeur.map((v) => ({ label: v === 'atelier' ? 'Notre atelier' : sellers.find((x) => x.slug === v)?.shop_name ?? v, remove: () => toggleIn('vendeur', v) })),
    ...(f.min || f.max ? [{ label: f.min && f.max ? `${f.min} à ${f.max} €` : f.min ? `Dès ${f.min} €` : `Jusqu’à ${f.max} €`, remove: () => { const n = new URLSearchParams(params); n.delete('prix-min'); n.delete('prix-max'); setParams(n, { replace: true }); } }] : []),
    ...(f.disponibles ? [{ label: 'En stock', remove: () => set('disponibles', null) }] : []),
    ...(f.promotion ? [{ label: 'Promotions', remove: () => set('promotion', null) }] : []),
    ...(f.nouveautes ? [{ label: 'Nouveautés', remove: () => set('nouveautes', null) }] : []),
    ...(f.surMesure ? [{ label: 'Sur mesure possible', remove: () => set('sur-mesure', null) }] : []),
  ];

  const usedCategories = categories.filter((c) => all.some((p) => p.category === c.id));
  const usedColors = COLORS.filter((c) => all.some((p) => p.colors?.includes(c.id)));
  const usedTechniques = TECHNIQUES.filter((t) => all.some((p) => p.technique === t));

  const panel = (
    <div className="space-y-1">
      <Group title="Catégorie">
        <Radio checked={!f.categorie} onChange={() => set('categorie', null)} label="Toutes" n={count('categorie', () => true)} />
        {usedCategories.map((c) => <Radio key={c.id} checked={f.categorie === c.id} onChange={() => set('categorie', c.id)} label={c.label} n={count('categorie', (p) => p.category === c.id)} />)}
      </Group>
      <Group title="Prix">
        <div className="flex items-center gap-2">
          <PriceInput label="Minimum" value={f.min} onChange={(v) => set('prix-min', v)} />
          <span className="text-henne">à</span>
          <PriceInput label="Maximum" value={f.max} onChange={(v) => set('prix-max', v)} />
        </div>
        <div className="flex flex-wrap gap-1.5 pt-2">
          {PRICE_RANGES.map((r) => {
            const on = f.min === r.min && f.max === r.max;
            return (
              <button key={r.label} onClick={() => { const n = new URLSearchParams(params); if (on || !r.min) n.delete('prix-min'); else n.set('prix-min', r.min); if (on || !r.max) n.delete('prix-max'); else n.set('prix-max', r.max); setParams(n, { replace: true }); }}
                aria-pressed={on} className={`text-xs px-2.5 py-1.5 border ${on ? 'bg-nuit text-laine border-nuit' : 'border-laine-fonce hover:border-nuit'}`}>{r.label}</button>
            );
          })}
        </div>
      </Group>
      {(!f.categorie || kindOf(f.categorie) === 'textile') && <Group title="Taille">
        {SIZES.map((s) => <Check key={s.id} checked={f.taille.includes(s.id)} onChange={() => toggleIn('taille', s.id)} label={s.label} n={count('taille', (p) => kindOf(p.category) === 'textile' && !!longest(p) && s.test(longest(p)))} />)}
      </Group>}
      {usedColors.length > 0 && (
        <Group title="Couleur">
          <div className="grid grid-cols-2 gap-x-3">
            {usedColors.map((c) => (
              <label key={c.id} className="flex items-center gap-2.5 py-1.5 cursor-pointer text-[15px]">
                <input type="checkbox" className="sr-only peer" checked={f.couleur.includes(c.id)} onChange={() => toggleIn('couleur', c.id)} />
                <span className="w-6 h-6 rounded-full border border-black/15 ring-offset-2 ring-offset-laine peer-checked:ring-2 peer-checked:ring-nuit peer-focus-visible:ring-2 peer-focus-visible:ring-garance" style={{ background: c.hex }} />
                <span className="flex-1">{c.label}</span>
                <span className="text-xs text-henne tabular-nums">{count('couleur', (p) => !!p.colors?.includes(c.id))}</span>
              </label>
            ))}
          </div>
        </Group>
      )}
      {usedTechniques.length > 1 && (
        <Group title="Technique">
          {usedTechniques.map((t) => <Check key={t} checked={f.technique.includes(t)} onChange={() => toggleIn('technique', t)} label={t} n={count('technique', (p) => p.technique === t)} />)}
        </Group>
      )}
      {sellers.some((sl) => all.some((p) => p.seller_id === sl.id)) && (
        <Group title="Vendu par">
          <Check checked={f.vendeur.includes('atelier')} onChange={() => toggleIn('vendeur', 'atelier')} label="Notre atelier" n={count('vendeur', (p) => !p.seller_id)} />
          {sellers.filter((sl) => all.some((p) => p.seller_id === sl.id)).map((sl) => (
            <Check key={sl.id} checked={f.vendeur.includes(sl.slug)} onChange={() => toggleIn('vendeur', sl.slug)} label={sl.shop_name} n={count('vendeur', (p) => p.seller_id === sl.id)} />
          ))}
        </Group>
      )}
      <Group title="Sélection">
        <Check checked={f.disponibles} onChange={() => set('disponibles', f.disponibles ? null : '1')} label="En stock" n={count('options', (p) => p.stock > 0)} />
        <Check checked={f.promotion} onChange={() => set('promotion', f.promotion ? null : '1')} label="Promotions" n={count('options', (p) => !!discountOf(p))} />
        <Check checked={f.nouveautes} onChange={() => set('nouveautes', f.nouveautes ? null : '1')} label="Nouveautés" n={count('options', (p) => isNew(p, settings.new_days))} />
        <Check checked={f.surMesure} onChange={() => set('sur-mesure', f.surMesure ? null : '1')} label="Sur mesure possible" n={count('options', (p) => p.made_to_order)} />
      </Group>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-12">
      <div className="lisiere-fine w-16 mb-5" aria-hidden />
      <h1 className="font-display text-[2.8rem] sm:text-6xl md:text-7xl text-nuit">{f.categorie ? categoryLabel(f.categorie) : 'La boutique'}</h1>

      <div className="mt-8 grid gap-3 border-y border-laine-fonce py-4 sm:flex sm:flex-wrap sm:items-center">
        <label className="relative sm:flex-1 sm:min-w-48 sm:max-w-md">
          <span className="sr-only">Rechercher</span>
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-henne" />
          <input value={f.recherche} onChange={(e) => set('recherche', e.target.value)} placeholder="Rechercher dans la boutique"
            className="w-full pl-9 pr-3 py-3 bg-white border border-laine-fonce focus:border-nuit focus:outline-none" />
        </label>
        <div className="flex items-center gap-3 sm:contents">
          <button onClick={() => setDrawer(true)} className="lg:hidden inline-flex items-center gap-2 px-4 py-3 bg-nuit text-laine shrink-0 sm:order-first">
            <SlidersHorizontal className="w-4 h-4" /> Filtrer{chips.length ? ` (${chips.length})` : ''}
          </button>
          <p className="hidden sm:block text-sm text-henne sm:ml-auto" aria-live="polite">{loading ? '…' : `${visible.length} création${visible.length > 1 ? 's' : ''}`}</p>
          <label className="flex items-center gap-2 text-sm flex-1 sm:flex-none">
            <span className="text-henne hidden sm:inline">Trier par</span>
            <select value={f.tri} onChange={(e) => set('tri', e.target.value === 'recent' ? null : e.target.value)} className="w-full sm:w-auto py-3 px-3 bg-white border border-laine-fonce" aria-label="Trier par">
              <option value="recent">Nouveautés</option>
              <option value="ventes">Meilleures ventes</option>
              <option value="prix-croissant">Prix croissant</option>
              <option value="prix-decroissant">Prix décroissant</option>
              <option value="promo">Plus fortes remises</option>
            </select>
          </label>
        </div>
        <p className="sm:hidden text-sm text-henne" aria-live="polite">{loading ? '…' : `${visible.length} création${visible.length > 1 ? 's' : ''}`}</p>
      </div>

      {chips.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Filtres actifs">
          {chips.map((c) => (
            <button key={c.label} onClick={c.remove} className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 bg-nuit/5 text-nuit text-sm hover:bg-garance/10 hover:text-garance" aria-label={`Retirer le filtre ${c.label}`}>
              {c.label} <X className="w-3.5 h-3.5" />
            </button>
          ))}
          <button onClick={clearAll} className="text-sm text-garance underline ml-1">Tout effacer</button>
        </div>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-[250px_1fr] items-start">
        <aside className="hidden lg:block sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2" aria-label="Filtres">{panel}</aside>

        <div>
          {loading && <p className="text-henne">Chargement des créations…</p>}
          {error && <p className="text-garance">Les créations n’ont pas pu être chargées. <button className="underline" onClick={reload}>Réessayer</button></p>}
          {!loading && !error && visible.length === 0 && (
            <div className="py-16 max-w-md">
              <p className="font-display text-3xl text-nuit">Aucune création ne correspond</p>
              <p className="lecture mt-2 text-henne">Retirez un filtre, ou demandez-nous de tisser la pièce que vous cherchez.</p>
              <div className="mt-5 flex gap-4"><button onClick={clearAll} className="bg-nuit text-laine px-5 py-3">Effacer les filtres</button></div>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-x-3 sm:gap-x-5 gap-y-10 sm:gap-y-12">
            {visible.slice(0, shown).map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
          {visible.length > shown && (
            <div className="mt-14 text-center">
              <p className="text-sm text-henne mb-3">{shown} sur {visible.length} créations</p>
              <div className="h-1 max-w-xs mx-auto bg-laine-fonce"><div className="h-1 bg-nuit" style={{ width: `${(shown / visible.length) * 100}%` }} /></div>
              <button onClick={() => setShown((n) => n + PAGE)} className="mt-5 px-8 py-3.5 border border-nuit text-nuit font-medium hover:bg-nuit hover:text-laine">Afficher plus</button>
            </div>
          )}
        </div>
      </div>

      {drawer && (
        <Drawer side="left" title="Filtres" onClose={() => setDrawer(false)}>
          <div className="px-6 py-4">{panel}</div>
          <div className="sticky bottom-0 bg-laine border-t border-laine-fonce px-6 py-4 flex gap-3">
            <button onClick={clearAll} className="px-4 py-3 text-nuit underline">Tout effacer</button>
            <button onClick={() => setDrawer(false)} className="flex-1 bg-nuit text-laine py-3 font-medium">Voir {visible.length} création{visible.length > 1 ? 's' : ''}</button>
          </div>
        </Drawer>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details open className="group border-b border-laine-fonce py-4">
      <summary className="list-none cursor-pointer flex items-center justify-between font-display text-xl text-nuit">
        {title}<span className="text-henne text-lg group-open:rotate-45 transition-transform" aria-hidden>+</span>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

function Check({ checked, onChange, label, n }: { checked: boolean; onChange: () => void; label: string; n: number }) {
  return (
    <label className={`flex items-center gap-2.5 py-1.5 cursor-pointer text-[15px] ${n === 0 && !checked ? 'opacity-45' : ''}`}>
      <input type="checkbox" checked={checked} onChange={onChange} className="w-4 h-4 accent-nuit" />
      <span className="flex-1">{label}</span>
      <span className="text-xs text-henne tabular-nums">{n}</span>
    </label>
  );
}

function Radio({ checked, onChange, label, n }: { checked: boolean; onChange: () => void; label: string; n: number }) {
  return (
    <label className="flex items-center gap-2.5 py-1.5 cursor-pointer text-[15px]">
      <input type="radio" name="categorie" checked={checked} onChange={onChange} className="w-4 h-4 accent-nuit" />
      <span className={`flex-1 ${checked ? 'font-semibold text-nuit' : ''}`}>{label}</span>
      <span className="text-xs text-henne tabular-nums">{n}</span>
    </label>
  );
}

function PriceInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex-1 flex items-center border border-laine-fonce bg-white focus-within:border-nuit">
      <span className="sr-only">{label} en euros</span>
      <input inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))} placeholder={label === 'Minimum' ? 'Min' : 'Max'}
        className="w-full min-w-0 px-2.5 py-2 bg-transparent focus:outline-none" />
      <span className="pr-2.5 text-henne text-sm">€</span>
    </label>
  );
}

