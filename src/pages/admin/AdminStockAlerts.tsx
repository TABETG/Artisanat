import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Mail, PackageX, Trash2 } from 'lucide-react';
import { adminListProducts, adminListStockAlerts, deleteStockAlert, markAlertsNotified, setProductStock } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { formatDate } from '../../lib/format';
import { ProductImage } from '../../components/ProductImage';
import { Product, StockAlert } from '../../types';
import { Toast } from './ui';
import { SHOP } from '../../config';

export function AdminStockAlerts() {
  const products = useAsync(adminListProducts, []);
  const alerts = useAsync(adminListStockAlerts, []);
  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  if (products.loading || alerts.loading) return <p className="text-stone-500">Chargement…</p>;
  if (products.error || alerts.error) return <p className="text-garance">Impossible de charger : {products.error ?? alerts.error}</p>;

  const all = products.data ?? [];
  const outOfStock = all.filter((p) => p.active && p.stock === 0);
  const pending = (alerts.data ?? []).filter((a) => !a.notified);
  const byProduct = new Map<string, StockAlert[]>();
  pending.forEach((a) => byProduct.set(a.product_id, [...(byProduct.get(a.product_id) ?? []), a]));

  async function restock(p: Product, qty: number) {
    await setProductStock(p.id, qty);
    products.setData((l) => l?.map((x) => x.id === p.id ? { ...x, stock: qty } : x) ?? null);
    flash(`« ${p.name} » est de nouveau en vente`);
  }

  async function markDone(list: StockAlert[]) {
    const ids = list.map((a) => a.id);
    await markAlertsNotified(ids);
    alerts.setData((l) => l?.map((a) => ids.includes(a.id) ? { ...a, notified: true } : a) ?? null);
    flash('Clients marqués comme prévenus');
  }

  async function removeAlert(id: number) {
    await deleteStockAlert(id);
    alerts.setData((l) => l?.filter((a) => a.id !== id) ?? null);
  }

  return (
    <div className="space-y-10">
      <section>
        <h1 className="font-display text-3xl text-nuit flex items-center gap-3"><PackageX className="w-7 h-7 text-garance" /> Rupture de stock</h1>
        <p className="text-stone-500 mt-1">Ces produits sont visibles sur la boutique avec la mention « Rupture de stock » : personne ne peut les acheter.</p>
        {outOfStock.length === 0 ? (
          <p className="mt-5 bg-white rounded-md p-6 text-emerald-800">Tout est en stock.</p>
        ) : (
          <ul className="mt-5 space-y-3">
            {outOfStock.map((p) => <RestockRow key={p.id} product={p} waiting={byProduct.get(p.id)?.length ?? 0} onRestock={restock} />)}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-display text-3xl text-nuit flex items-center gap-3"><Bell className="w-7 h-7 text-garance" /> Clients à prévenir</h2>
        <p className="text-stone-500 mt-1">Ces clients ont demandé à être prévenus quand un produit revient.</p>
        {byProduct.size === 0 ? (
          <p className="mt-5 bg-white rounded-md p-6 text-stone-500">Aucune demande en attente.</p>
        ) : (
          <ul className="mt-5 space-y-3">
            {[...byProduct.entries()].map(([productId, list]) => {
              const p = all.find((x) => x.id === productId);
              const available = !!p && p.active && p.stock > 0;
              const subject = encodeURIComponent(`${p?.name ?? 'Votre article'} est de nouveau disponible`);
              const body = encodeURIComponent(`Bonjour,\n\nVous nous aviez demandé d’être prévenu(e) : « ${p?.name ?? ''} » est de nouveau disponible sur notre boutique.\n\n${window.location.origin}/produit/${productId}\n\nÀ bientôt,\n${SHOP.name}`);
              return (
                <li key={productId} className={`bg-white rounded-md p-4 ${available ? 'ring-2 ring-emerald-600' : ''}`}>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-medium flex-1">{p?.name ?? 'Produit supprimé'} <span className="text-stone-500 font-normal">· {list.length} client{list.length > 1 ? 's' : ''}</span></p>
                    {available
                      ? <span className="text-sm bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded">De nouveau en stock : prévenez-les</span>
                      : <span className="text-sm bg-stone-100 text-stone-600 px-2.5 py-0.5 rounded">Toujours en rupture</span>}
                  </div>
                  <ul className="mt-3 text-sm divide-y divide-stone-100">
                    {list.map((a) => (
                      <li key={a.id} className="py-2 flex items-center gap-3">
                        <a href={`mailto:${a.email}`} className="text-garance underline break-all">{a.email}</a>
                        <span className="text-stone-400 ml-auto whitespace-nowrap">{formatDate(a.created_at)}</span>
                        <button onClick={() => removeAlert(a.id)} className="p-1.5 text-stone-400 hover:text-garance" aria-label={`Supprimer la demande de ${a.email}`}><Trash2 className="w-4 h-4" /></button>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a href={`mailto:?bcc=${list.map((a) => a.email).join(',')}&subject=${subject}&body=${body}`}
                      className="inline-flex items-center gap-2 bg-nuit text-laine px-4 py-2.5 rounded-md hover:bg-garance">
                      <Mail className="w-4 h-4" /> Écrire à {list.length > 1 ? `ces ${list.length} clients` : 'ce client'}
                    </a>
                    <button onClick={() => markDone(list)} className="px-4 py-2.5 rounded-md border border-stone-300">Marquer comme prévenus</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <Toast message={toast} />
    </div>
  );
}

function RestockRow({ product, waiting, onRestock }: { product: Product; waiting: number; onRestock: (p: Product, qty: number) => Promise<void> }) {
  const [qty, setQty] = useState('1');
  const n = parseInt(qty, 10);
  return (
    <li className="bg-white rounded-md p-3 flex flex-wrap items-center gap-4">
      <ProductImage src={product.images[0]} alt={product.name} className="w-14 h-16 rounded" />
      <div className="flex-1 min-w-40">
        <Link to={`/admin/produits/${product.id}`} className="font-medium hover:text-garance">{product.name}</Link>
        {waiting > 0 && <p className="text-sm text-garance">{waiting} client{waiting > 1 ? 's attendent' : ' attend'} son retour</p>}
      </div>
      <label className="flex items-center gap-2 text-sm">
        Nouvelle quantité
        <input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} className="w-20 px-3 py-2 border border-stone-300 rounded-md" />
      </label>
      <button disabled={!(n > 0)} onClick={() => onRestock(product, n)} className="bg-emerald-700 text-white px-4 py-2.5 rounded-md hover:bg-emerald-800 disabled:opacity-50">
        Remettre en vente
      </button>
    </li>
  );
}
