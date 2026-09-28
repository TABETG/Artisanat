import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Bell, MessageSquare, Package, Plus, ShoppingBag } from 'lucide-react';
import { adminListOrders, adminListProducts, adminListReviews, adminListStockAlerts } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { formatDate, formatPrice } from '../../lib/format';
import { ORDER_STATUS } from '../../types';
import { StatCard } from './ui';
import { isLowStock } from './AdminProducts';
import { ProductImage } from '../../components/ProductImage';

export function AdminDashboard() {
  const { data, loading, error } = useAsync(
    () => Promise.all([adminListProducts(), adminListOrders(), adminListStockAlerts(), adminListReviews()]), []);

  if (loading) return <p className="text-stone-500">Chargement…</p>;
  if (error || !data) return <p className="text-garance">Impossible de charger : {error}</p>;
  const [products, orders, alerts, reviews] = data;
  const reviewsPending = reviews.filter((r) => !r.approved).length;

  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const paid = orders.filter((o) => o.status !== 'cancelled');
  const thisMonth = paid.filter((o) => new Date(o.created_at) >= startMonth);
  const prevMonth = paid.filter((o) => { const d = new Date(o.created_at); return d >= startPrev && d < startMonth; });
  const revenue = thisMonth.reduce((n, o) => n + o.total_cents, 0);
  const prevRevenue = prevMonth.reduce((n, o) => n + o.total_cents, 0);
  const average = thisMonth.length ? Math.round(revenue / thisMonth.length) : 0;
  const toPrepare = orders.filter((o) => o.status === 'paid' || o.status === 'check_stock');
  const outOfStock = products.filter((p) => p.active && p.stock === 0);
  const lowStock = products.filter((p) => p.active && isLowStock(p));
  const waiting = alerts.filter((a) => !a.notified).length;

  // Meilleures ventes (tout l'historique)
  const sales = new Map<string, { name: string; qty: number; total: number }>();
  paid.forEach((o) => o.order_items?.forEach((i) => {
    const k = i.product_id ?? i.name;
    const cur = sales.get(k) ?? { name: i.name, qty: 0, total: 0 };
    sales.set(k, { name: i.name, qty: cur.qty + i.quantity, total: cur.total + i.unit_price_cents * i.quantity });
  }));
  const best = [...sales.values()].sort((a, b) => b.total - a.total).slice(0, 5);
  const monthName = now.toLocaleDateString('fr-FR', { month: 'long' });
  const trend = prevRevenue ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <h1 className="font-display text-3xl text-nuit">Tableau de bord</h1>
        <Link to="/admin/produits/nouveau" className="flex items-center gap-2 bg-garance text-laine px-6 py-3.5 rounded-md text-lg hover:bg-nuit">
          <Plus className="w-5 h-5" /> Ajouter un produit
        </Link>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label={`Ventes de ${monthName}`} value={formatPrice(revenue)}
          sub={trend === null ? undefined : `${trend >= 0 ? '+' : ''}${trend} % par rapport au mois dernier`} />
        <StatCard label="Commandes ce mois" value={String(thisMonth.length)} sub={average ? `Panier moyen : ${formatPrice(average)}` : undefined} />
        <StatCard label="À préparer" value={String(toPrepare.length)} tone={toPrepare.length ? 'alert' : undefined} sub="commandes payées" />
        <StatCard label="Produits en ligne" value={String(products.filter((p) => p.active).length)} sub={`${products.length} au total`} />
      </div>

      {(toPrepare.length > 0 || outOfStock.length > 0 || waiting > 0 || lowStock.length > 0 || reviewsPending > 0) && (
        <section className="bg-white rounded-lg border border-stone-200 p-5">
          <h2 className="font-display text-xl text-nuit">À faire</h2>
          <ul className="mt-3 divide-y divide-stone-100">
            {toPrepare.length > 0 && <Todo to="/admin/commandes" icon={<ShoppingBag className="w-5 h-5" />}>{toPrepare.length} commande{toPrepare.length > 1 ? 's' : ''} à préparer et expédier</Todo>}
            {outOfStock.length > 0 && <Todo to="/admin/alertes" icon={<AlertTriangle className="w-5 h-5" />}>{outOfStock.length} produit{outOfStock.length > 1 ? 's' : ''} en rupture de stock</Todo>}
            {waiting > 0 && <Todo to="/admin/alertes" icon={<Bell className="w-5 h-5" />}>{waiting} client{waiting > 1 ? 's attendent' : ' attend'} un retour en stock</Todo>}
            {reviewsPending > 0 && <Todo to="/admin/avis" icon={<MessageSquare className="w-5 h-5" />}>{reviewsPending} avis client{reviewsPending > 1 ? 's' : ''} à valider</Todo>}
            {lowStock.length > 0 && <Todo to="/admin/produits" icon={<Package className="w-5 h-5" />}>Stock bas : {lowStock.map((p) => `${p.name} (${p.stock})`).join(', ')}</Todo>}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="bg-white rounded-lg border border-stone-200 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-nuit">Dernières commandes</h2>
            <Link to="/admin/commandes" className="text-sm text-garance underline">Toutes</Link>
          </div>
          {orders.length === 0 ? <p className="mt-3 text-stone-500">Pas encore de commande.</p> : (
            <ul className="mt-3 divide-y divide-stone-100">
              {orders.slice(0, 5).map((o) => (
                <li key={o.id} className="py-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-medium">{o.shipping_name ?? o.email}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${ORDER_STATUS[o.status].tone}`}>{ORDER_STATUS[o.status].label}</span>
                  <span className="ml-auto font-medium">{formatPrice(o.total_cents)}</span>
                  <span className="w-full text-sm text-stone-500">{formatDate(o.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="bg-white rounded-lg border border-stone-200 p-5">
          <h2 className="font-display text-xl text-nuit">Meilleures ventes</h2>
          {best.length === 0 ? <p className="mt-3 text-stone-500">Les meilleures ventes apparaîtront ici.</p> : (
            <ol className="mt-3 divide-y divide-stone-100">
              {best.map((b, i) => {
                const p = products.find((x) => x.name === b.name);
                return (
                  <li key={b.name} className="py-3 flex items-center gap-3">
                    <span className="w-6 text-stone-400 tabular-nums">{i + 1}.</span>
                    <ProductImage src={p?.images[0]} alt="" className="w-10 h-12 rounded" />
                    <span className="flex-1 min-w-0 truncate">{b.name}</span>
                    <span className="text-sm text-stone-500 whitespace-nowrap">{b.qty} vendu{b.qty > 1 ? 's' : ''}</span>
                    <span className="font-medium whitespace-nowrap">{formatPrice(b.total)}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

function Todo({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  return (
    <li>
      <Link to={to} className="py-3 flex items-center gap-3 hover:text-garance">
        <span className="text-garance">{icon}</span><span className="flex-1">{children}</span><span aria-hidden>→</span>
      </Link>
    </li>
  );
}
