import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, Copy, Eye, EyeOff, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import {
  adminListProducts, adminListStockAlerts, deleteProduct, duplicateProduct, setProductActive, setProductStock,
} from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { formatPrice } from '../../lib/format';
import { CATEGORIES, categoryLabel } from '../../config';
import { ProductImage } from '../../components/ProductImage';
import { Input, Select, Stepper, Toast } from './ui';
import { Product } from '../../types';
import { RestockModal, restockMessage } from './RestockModal';

type Filter = 'tous' | 'en-ligne' | 'masques' | 'rupture' | 'stock-bas' | 'promo';
type Sort = 'recent' | 'nom' | 'prix' | 'stock';

export const isLowStock = (p: Product) => p.stock > 1 && p.stock <= (p.low_stock_threshold ?? 2);

export function AdminProducts() {
  const { data, loading, error, setData } = useAsync(adminListProducts, []);
  const alerts = useAsync(adminListStockAlerts, []);
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('tous');
  const [category, setCategory] = useState('tout');
  const [sort, setSort] = useState<Sort>('recent');
  const [toast, setToast] = useState<string | null>(null);
  const [restock, setRestock] = useState<{ product: Product; waiting: number } | null>(null);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  // Message transmis par le formulaire après enregistrement
  useEffect(() => {
    const msg = (location.state as { flash?: string } | null)?.flash;
    if (msg) { flash(msg); navigate(location.pathname, { replace: true, state: null }); }
  }, [location, navigate]);

  const all = data ?? [];
  const waitingFor = (id: string) => (alerts.data ?? []).filter((a) => a.product_id === id && !a.notified).length;
  const counts: Record<Filter, number> = {
    tous: all.length,
    'en-ligne': all.filter((p) => p.active).length,
    masques: all.filter((p) => !p.active).length,
    rupture: all.filter((p) => p.stock === 0).length,
    'stock-bas': all.filter(isLowStock).length,
    promo: all.filter((p) => p.compare_at_price_cents && p.compare_at_price_cents > p.price_cents).length,
  };

  const products = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = all.filter((p) =>
      (!q || `${p.name} ${p.reference}`.toLowerCase().includes(q)) &&
      (category === 'tout' || p.category === category) &&
      (filter === 'tous' ||
        (filter === 'en-ligne' && p.active) || (filter === 'masques' && !p.active) ||
        (filter === 'rupture' && p.stock === 0) || (filter === 'stock-bas' && isLowStock(p)) ||
        (filter === 'promo' && !!p.compare_at_price_cents && p.compare_at_price_cents > p.price_cents)));
    const sorted = [...list];
    if (sort === 'nom') sorted.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    if (sort === 'prix') sorted.sort((a, b) => b.price_cents - a.price_cents);
    if (sort === 'stock') sorted.sort((a, b) => a.stock - b.stock);
    return sorted;
  }, [all, search, filter, category, sort]);

  async function toggle(p: Product) {
    await setProductActive(p.id, !p.active);
    setData((l) => l?.map((x) => x.id === p.id ? { ...x, active: !p.active } : x) ?? null);
    flash(p.active ? `« ${p.name} » masqué de la boutique` : `« ${p.name} » visible sur la boutique`);
  }

  async function changeStock(p: Product, stock: number) {
    await setProductStock(p.id, stock);
    setData((l) => l?.map((x) => x.id === p.id ? { ...x, stock } : x) ?? null);
    const waiting = waitingFor(p.id);
    if (p.stock === 0 && stock > 0 && p.active && waiting > 0) setRestock({ product: { ...p, stock }, waiting });
  }

  async function duplicate(p: Product) {
    const copy = await duplicateProduct(p);
    setData((l) => (l ? [copy, ...l] : [copy]));
    flash('Copie créée, masquée de la boutique');
  }

  async function remove(p: Product) {
    if (!confirm(`Supprimer définitivement « ${p.name} » ?\n\nPour le retirer temporairement, cliquez plutôt sur l’œil (masquer).`)) return;
    await deleteProduct(p);
    setData((l) => l?.filter((x) => x.id !== p.id) ?? null);
    flash('Produit supprimé');
  }

  const out = all.filter((p) => p.active && p.stock === 0);
  const filters: { id: Filter; label: string }[] = [
    { id: 'tous', label: 'Tous' }, { id: 'en-ligne', label: 'En ligne' }, { id: 'masques', label: 'Masqués' },
    { id: 'rupture', label: 'Rupture' }, { id: 'stock-bas', label: 'Stock bas' }, { id: 'promo', label: 'En promotion' },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <h1 className="font-display text-3xl text-nuit">Produits <span className="text-stone-400 text-xl">({all.length})</span></h1>
        <Link to="/admin/produits/nouveau" className="flex items-center gap-2 bg-garance text-laine px-6 py-3.5 rounded-md text-lg hover:bg-nuit">
          <Plus className="w-5 h-5" /> Ajouter un produit
        </Link>
      </div>

      {out.length > 0 && (
        <button onClick={() => setFilter('rupture')} className="mt-6 w-full text-left flex items-start gap-3 bg-garance/10 text-garance p-4 rounded-md hover:bg-garance/15">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span><strong>{out.length} produit{out.length > 1 ? 's' : ''} en rupture de stock</strong> : {out.slice(0, 3).map((p) => p.name).join(', ')}{out.length > 3 ? '…' : ''}. <span className="underline">Afficher</span></span>
        </button>
      )}

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filtrer">
        {filters.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} aria-pressed={filter === f.id}
            className={`px-3.5 py-2 rounded-md text-sm ${filter === f.id ? 'bg-nuit text-laine' : 'bg-white border border-stone-200 hover:border-stone-400'}`}>
            {f.label} <span className="opacity-60">{counts[f.id]}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <label className="relative">
          <span className="sr-only">Rechercher</span>
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <Input className="pl-10" placeholder="Rechercher par nom ou référence" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Catégorie">
          <option value="tout">Toutes les catégories</option>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Trier">
          <option value="recent">Plus récents</option>
          <option value="nom">Nom (A → Z)</option>
          <option value="prix">Prix (plus cher)</option>
          <option value="stock">Stock (plus bas)</option>
        </Select>
      </div>

      {loading && <p className="mt-8 text-stone-500">Chargement…</p>}
      {error && <p className="mt-8 text-garance">Impossible de charger les produits : {error}</p>}

      {!loading && all.length === 0 && (
        <div className="mt-10 bg-white rounded-lg p-10 text-center">
          <p className="font-display text-2xl text-nuit">Aucun produit pour l’instant</p>
          <p className="mt-2 text-stone-500">Ajoutez votre première création : quelques photos, un nom, un prix, c’est tout.</p>
        </div>
      )}
      {!loading && all.length > 0 && products.length === 0 && (
        <p className="mt-8 bg-white rounded-lg p-6 text-stone-500">Aucun produit ne correspond à ces filtres.</p>
      )}

      <ul className="mt-5 space-y-3">
        {products.map((p) => {
          const promo = p.compare_at_price_cents && p.compare_at_price_cents > p.price_cents;
          const waiting = waitingFor(p.id);
          return (
            <li key={p.id} className={`bg-white rounded-lg border border-stone-200 p-3 sm:p-4 grid grid-cols-[64px_1fr] sm:grid-cols-[72px_1fr_auto_auto] gap-x-4 gap-y-3 items-center ${p.active ? '' : 'bg-stone-50'}`}>
              <Link to={`/admin/produits/${p.id}`} className="row-span-2 sm:row-span-1">
                <ProductImage src={p.images[0]} alt={p.name} className={`w-16 sm:w-[72px] h-20 sm:h-24 rounded ${p.active ? '' : 'opacity-50'}`} />
              </Link>
              <div className="min-w-0">
                <Link to={`/admin/produits/${p.id}`} className="font-medium text-[16px] text-encre hover:text-garance block truncate">{p.name}</Link>
                <p className="text-sm text-stone-500 truncate">
                  {categoryLabel(p.category)}{p.reference && ` · ${p.reference}`}
                </p>
                <p className="text-sm mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium">{formatPrice(p.price_cents)}</span>
                  {promo && <span className="text-stone-400 line-through">{formatPrice(p.compare_at_price_cents!)}</span>}
                  {!p.active && <Tag tone="stone">Masqué</Tag>}
                  {p.stock === 0 && <Tag tone="red">Rupture</Tag>}
                  {isLowStock(p) && <Tag tone="amber">Stock bas</Tag>}
                  {p.featured && <Tag tone="blue">Mis en avant</Tag>}
                  {waiting > 0 && <Tag tone="red">{waiting} client{waiting > 1 ? 's attendent' : ' attend'}</Tag>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-stone-500 sm:hidden">Stock</span>
                <Stepper label={`Stock de ${p.name}`} value={p.stock} onChange={(v) => changeStock(p, v)} />
              </div>
              <div className="flex items-center gap-1 col-span-2 sm:col-span-1 justify-end border-t sm:border-0 pt-2 sm:pt-0">
                <IconButton onClick={() => toggle(p)} label={p.active ? 'Masquer de la boutique' : 'Mettre en ligne'}>
                  {p.active ? <Eye className="w-5 h-5 text-emerald-700" /> : <EyeOff className="w-5 h-5" />}
                </IconButton>
                <IconButton to={`/admin/produits/${p.id}`} label="Modifier"><Pencil className="w-5 h-5" /></IconButton>
                <IconButton onClick={() => duplicate(p)} label="Dupliquer"><Copy className="w-5 h-5" /></IconButton>
                <IconButton onClick={() => remove(p)} label="Supprimer" danger><Trash2 className="w-5 h-5" /></IconButton>
              </div>
            </li>
          );
        })}
      </ul>

      {restock && (
        <RestockModal productId={restock.product.id} productName={restock.product.name} waiting={restock.waiting}
          onClose={(r) => { setRestock(null); if (r) { flash(restockMessage(r)); alerts.reload(); } }} />
      )}
      <Toast message={toast} />
    </div>
  );
}

function Tag({ tone, children }: { tone: 'red' | 'amber' | 'blue' | 'stone'; children: ReactNode }) {
  const tones = { red: 'bg-garance/10 text-garance', amber: 'bg-safran/25 text-henne', blue: 'bg-nuit/10 text-nuit', stone: 'bg-stone-200 text-stone-600' };
  return <span className={`text-xs px-2 py-0.5 rounded ${tones[tone]}`}>{children}</span>;
}

function IconButton({ onClick, to, label, danger, children }: { onClick?: () => void; to?: string; label: string; danger?: boolean; children: ReactNode }) {
  const cls = `p-2.5 rounded-md ${danger ? 'text-garance hover:bg-red-50' : 'hover:bg-stone-100'}`;
  if (to) return <Link to={to} className={cls} aria-label={label} title={label}>{children}</Link>;
  return <button onClick={onClick} className={cls} aria-label={label} title={label}>{children}</button>;
}
