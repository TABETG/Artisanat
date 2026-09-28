import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { listProducts } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { ProductCard } from '../components/ProductCard';
import { CATEGORIES, COLORS } from '../config';
import { Product } from '../types';

type Sort = 'recent' | 'prix-croissant' | 'prix-decroissant' | 'promo';

const SIZES = [
  { id: 'petit', label: 'Petit (jusqu’à 150 cm)', test: (p: Product) => !!p.length_cm && Math.max(p.length_cm, p.width_cm ?? 0) <= 150 },
  { id: 'moyen', label: 'Moyen (150 à 250 cm)', test: (p: Product) => !!p.length_cm && Math.max(p.length_cm, p.width_cm ?? 0) > 150 && Math.max(p.length_cm, p.width_cm ?? 0) < 250 },
  { id: 'grand', label: 'Grand (250 cm et plus)', test: (p: Product) => !!p.length_cm && Math.max(p.length_cm, p.width_cm ?? 0) >= 250 },
];

export function ShopPage() {
  const { data: products, loading, error, reload } = useAsync(listProducts, []);
  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const category = params.get('categorie') ?? 'tout';
  const query = params.get('recherche') ?? '';
  const sort = (params.get('tri') as Sort) ?? 'recent';
  const onlyAvailable = params.get('disponibles') === '1';
  const onlyPromo = params.get('promotion') === '1';
  const color = params.get('couleur') ?? '';
  const size = params.get('taille') ?? '';
  const maxPrice = params.get('prix-max') ?? '';

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value === null || value === '') next.delete(key); else next.set(key, value);
    setParams(next, { replace: true });
  }

  const all = products ?? [];
  const usedColors = COLORS.filter((c) => all.some((p) => p.colors?.includes(c.id)));
  const hasPromo = all.some((p) => p.compare_at_price_cents && p.compare_at_price_cents > p.price_cents);
  const activeFilters = [onlyAvailable, onlyPromo, color, size, maxPrice].filter(Boolean).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const max = maxPrice ? parseInt(maxPrice, 10) * 100 : null;
    const sizeTest = SIZES.find((s) => s.id === size)?.test;
    let list = all.filter((p) =>
      (category === 'tout' || p.category === category) &&
      (!onlyAvailable || p.stock > 0) &&
      (!onlyPromo || (!!p.compare_at_price_cents && p.compare_at_price_cents > p.price_cents)) &&
      (!color || p.colors?.includes(color)) &&
      (!sizeTest || sizeTest(p)) &&
      (!max || p.price_cents <= max) &&
      (!q || `${p.name} ${p.description} ${p.material} ${p.origin} ${p.technique}`.toLowerCase().includes(q)));
    if (sort === 'prix-croissant') list = [...list].sort((a, b) => a.price_cents - b.price_cents);
    if (sort === 'prix-decroissant') list = [...list].sort((a, b) => b.price_cents - a.price_cents);
    if (sort === 'promo') list = [...list].sort((a, b) => Number(!!b.compare_at_price_cents) - Number(!!a.compare_at_price_cents));
    return [...list.filter((p) => p.stock > 0), ...list.filter((p) => p.stock === 0)];
  }, [all, category, query, sort, onlyAvailable, onlyPromo, color, size, maxPrice]);

  const chip = (on: boolean) => `px-3.5 py-2 rounded-sm border text-sm ${on ? 'bg-nuit text-laine border-nuit' : 'border-nuit/20 text-nuit hover:border-nuit'}`;

  return (
    <div className="max-w-6xl mx-auto px-5 pt-12">
      <h1 className="font-display text-4xl md:text-5xl text-nuit">La boutique</h1>

      <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Catégories">
        {[{ id: 'tout', label: 'Tout' }, ...CATEGORIES].map((c) => (
          <button key={c.id} onClick={() => update('categorie', c.id === 'tout' ? null : c.id)} aria-pressed={category === c.id}
            className={`px-4 py-2 rounded-sm border ${category === c.id ? 'bg-nuit text-laine border-nuit' : 'border-nuit/20 text-nuit hover:border-nuit'}`}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label className="relative flex-1 min-w-56 max-w-sm">
          <span className="sr-only">Rechercher</span>
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-henne" />
          <input value={query} onChange={(e) => update('recherche', e.target.value)} placeholder="Rechercher un tapis, une couleur…"
            className="w-full pl-9 pr-3 py-2.5 bg-white/60 border border-laine-fonce rounded-sm" />
        </label>
        <button onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm border border-laine-fonce bg-white/60 hover:border-nuit">
          <SlidersHorizontal className="w-4 h-4" /> Filtres{activeFilters ? ` (${activeFilters})` : ''}
        </button>
        <label className="flex items-center gap-2 text-sm ml-auto">
          Trier
          <select value={sort} onChange={(e) => update('tri', e.target.value === 'recent' ? null : e.target.value)}
            className="py-2.5 px-3 bg-white/60 border border-laine-fonce rounded-sm">
            <option value="recent">Nouveautés</option>
            <option value="prix-croissant">Prix croissant</option>
            <option value="prix-decroissant">Prix décroissant</option>
            {hasPromo && <option value="promo">Promotions d’abord</option>}
          </select>
        </label>
      </div>

      {showFilters && (
        <div className="mt-4 p-5 bg-white/50 border border-laine-fonce rounded-sm grid gap-5 md:grid-cols-2">
          <fieldset>
            <legend className="font-medium mb-2">Taille</legend>
            <div className="flex flex-wrap gap-2">
              {SIZES.map((s) => <button key={s.id} onClick={() => update('taille', size === s.id ? null : s.id)} aria-pressed={size === s.id} className={chip(size === s.id)}>{s.label}</button>)}
            </div>
          </fieldset>
          <label className="block">
            <span className="font-medium block mb-2">Budget maximum</span>
            <select value={maxPrice} onChange={(e) => update('prix-max', e.target.value)} className="py-2.5 px-3 bg-white border border-laine-fonce rounded-sm w-full max-w-xs">
              <option value="">Tous les prix</option>
              {[100, 300, 500, 1000, 1500].map((v) => <option key={v} value={v}>Jusqu’à {v} €</option>)}
            </select>
          </label>
          {usedColors.length > 0 && (
            <fieldset className="md:col-span-2">
              <legend className="font-medium mb-2">Couleur</legend>
              <div className="flex flex-wrap gap-2">
                {usedColors.map((c) => (
                  <button key={c.id} onClick={() => update('couleur', color === c.id ? null : c.id)} aria-pressed={color === c.id}
                    className={`inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border text-sm ${color === c.id ? 'border-nuit bg-nuit text-laine' : 'border-nuit/20 hover:border-nuit'}`}>
                    <span className="w-5 h-5 rounded-full border border-black/10" style={{ background: c.hex }} />{c.label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          <div className="flex flex-wrap gap-5 md:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={onlyAvailable} onChange={(e) => update('disponibles', e.target.checked ? '1' : null)} className="w-4 h-4 accent-garance" />
              Disponibles uniquement
            </label>
            {hasPromo && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={onlyPromo} onChange={(e) => update('promotion', e.target.checked ? '1' : null)} className="w-4 h-4 accent-garance" />
                En promotion
              </label>
            )}
            {activeFilters > 0 && (
              <button className="text-garance underline ml-auto" onClick={() => { const n = new URLSearchParams(); if (category !== 'tout') n.set('categorie', category); setParams(n); }}>
                Effacer les filtres
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mt-8">
        {!loading && !error && <p className="text-sm text-henne mb-5">{visible.length} création{visible.length > 1 ? 's' : ''}</p>}
        {loading && <p className="text-henne">Chargement des créations…</p>}
        {error && (
          <p className="text-garance">Les créations n’ont pas pu être chargées.{' '}
            <button className="underline" onClick={reload}>Réessayer</button></p>
        )}
        {!loading && !error && visible.length === 0 && (
          <div className="py-16">
            <p className="font-display text-2xl text-nuit">Aucune création ne correspond</p>
            <button onClick={() => setParams({})} className="mt-3 text-garance underline">Effacer les filtres</button>
          </div>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-10">
          {visible.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </div>
  );
}
