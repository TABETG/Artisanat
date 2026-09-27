import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { listProducts } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { ProductCard } from '../components/ProductCard';
import { CATEGORIES } from '../config';

type Sort = 'recent' | 'prix-croissant' | 'prix-decroissant';

export function ShopPage() {
  const { data: products, loading, error, reload } = useAsync(listProducts, []);
  const [params, setParams] = useSearchParams();
  const category = params.get('categorie') ?? 'tout';
  const query = params.get('recherche') ?? '';
  const sort = (params.get('tri') as Sort) ?? 'recent';
  const onlyAvailable = params.get('disponibles') === '1';

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value === null || value === '') next.delete(key); else next.set(key, value);
    setParams(next, { replace: true });
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = (products ?? []).filter((p) =>
      (category === 'tout' || p.category === category) &&
      (!onlyAvailable || p.stock > 0) &&
      (!q || `${p.name} ${p.description} ${p.material} ${p.origin}`.toLowerCase().includes(q)));
    if (sort === 'prix-croissant') list = [...list].sort((a, b) => a.price_cents - b.price_cents);
    if (sort === 'prix-decroissant') list = [...list].sort((a, b) => b.price_cents - a.price_cents);
    // les pièces vendues passent en fin de liste
    return [...list.filter((p) => p.stock > 0), ...list.filter((p) => p.stock === 0)];
  }, [products, category, query, sort, onlyAvailable]);

  return (
    <div className="max-w-6xl mx-auto px-5 pt-12">
      <h1 className="font-display text-4xl md:text-5xl text-nuit">La boutique</h1>

      <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Catégories">
        {[{ id: 'tout', label: 'Tout' }, ...CATEGORIES].map((c) => (
          <button key={c.id} onClick={() => update('categorie', c.id === 'tout' ? null : c.id)}
            aria-pressed={category === c.id}
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
        <label className="flex items-center gap-2 text-sm">
          Trier
          <select value={sort} onChange={(e) => update('tri', e.target.value === 'recent' ? null : e.target.value)}
            className="py-2.5 px-3 bg-white/60 border border-laine-fonce rounded-sm">
            <option value="recent">Nouveautés</option>
            <option value="prix-croissant">Prix croissant</option>
            <option value="prix-decroissant">Prix décroissant</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={onlyAvailable} onChange={(e) => update('disponibles', e.target.checked ? '1' : null)}
            className="w-4 h-4 accent-garance" />
          Disponibles uniquement
        </label>
      </div>

      <div className="mt-10">
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
