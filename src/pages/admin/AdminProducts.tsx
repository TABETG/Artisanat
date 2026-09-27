import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { adminListProducts, deleteProduct, setProductActive } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { formatPrice } from '../../lib/format';
import { categoryLabel } from '../../config';
import { ProductImage } from '../../components/ProductImage';
import { Input, Toast } from './ui';
import { Product } from '../../types';

export function AdminProducts() {
  const { data, loading, error, setData } = useAsync(adminListProducts, []);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const products = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((p) => !q || p.name.toLowerCase().includes(q));
  }, [data, search]);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  async function toggle(p: Product) {
    await setProductActive(p.id, !p.active);
    setData((list) => list?.map((x) => x.id === p.id ? { ...x, active: !p.active } : x) ?? null);
    flash(p.active ? 'Produit masqué de la boutique' : 'Produit visible sur la boutique');
  }

  async function remove(p: Product) {
    if (!confirm(`Supprimer définitivement « ${p.name} » ?\n\nAstuce : pour le retirer temporairement, décochez plutôt « En ligne ».`)) return;
    await deleteProduct(p);
    setData((list) => list?.filter((x) => x.id !== p.id) ?? null);
    flash('Produit supprimé');
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <h1 className="font-display text-3xl text-nuit">Mes produits</h1>
        <Link to="/admin/produits/nouveau" className="flex items-center gap-2 bg-garance text-laine px-6 py-3.5 rounded-md text-lg hover:bg-nuit">
          <Plus className="w-5 h-5" /> Ajouter un produit
        </Link>
      </div>

      {(data?.length ?? 0) > 5 && (
        <Input className="mt-6 max-w-sm" placeholder="Rechercher un produit" value={search} onChange={(e) => setSearch(e.target.value)} />
      )}

      {loading && <p className="mt-8 text-stone-500">Chargement…</p>}
      {error && <p className="mt-8 text-garance">Impossible de charger les produits : {error}</p>}

      {!loading && data?.length === 0 && (
        <div className="mt-10 bg-white rounded-md p-10 text-center">
          <p className="font-display text-2xl text-nuit">Aucun produit pour l’instant</p>
          <p className="mt-2 text-stone-500">Ajoutez votre première création : quelques photos, un nom, un prix, c’est tout.</p>
        </div>
      )}

      <ul className="mt-6 space-y-3">
        {products.map((p) => (
          <li key={p.id} className={`bg-white rounded-md p-3 flex items-center gap-4 ${p.active ? '' : 'opacity-60'}`}>
            <Link to={`/admin/produits/${p.id}`} className="shrink-0">
              <ProductImage src={p.images[0]} alt={p.name} className="w-16 h-20 rounded" />
            </Link>
            <div className="flex-1 min-w-0">
              <Link to={`/admin/produits/${p.id}`} className="font-medium text-encre hover:text-garance block truncate">{p.name}</Link>
              <p className="text-sm text-stone-500">{categoryLabel(p.category)} · {formatPrice(p.price_cents)}</p>
              <p className={`text-sm mt-0.5 ${p.stock === 0 ? 'text-garance font-medium' : 'text-stone-600'}`}>
                {p.stock === 0 ? 'Vendu / épuisé' : `${p.stock} en stock`}
              </p>
            </div>
            <label className="flex flex-col items-center gap-1 text-xs text-stone-600 cursor-pointer">
              <input type="checkbox" checked={p.active} onChange={() => toggle(p)} className="w-5 h-5 accent-emerald-700" />
              En ligne
            </label>
            <Link to={`/admin/produits/${p.id}`} className="p-3 rounded hover:bg-stone-100" aria-label={`Modifier ${p.name}`}><Pencil className="w-5 h-5" /></Link>
            <button onClick={() => remove(p)} className="p-3 rounded hover:bg-red-50 text-garance" aria-label={`Supprimer ${p.name}`}><Trash2 className="w-5 h-5" /></button>
          </li>
        ))}
      </ul>
      <Toast message={toast} />
    </div>
  );
}
