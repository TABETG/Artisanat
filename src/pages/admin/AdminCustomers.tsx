import { useMemo, useState } from 'react';
import { ChevronDown, Download, Mail, Search, Star } from 'lucide-react';
import { adminListOrders, adminListReviews, adminListSubscribers, downloadFile } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { formatDate, formatPrice } from '../../lib/format';
import { Order, ORDER_STATUS } from '../../types';
import { Input, Select } from './ui';
import { orderNumber } from './AdminOrders';

interface Customer {
  email: string; name: string; phone: string | null; city: string | null;
  orders: Order[]; spent: number; last: string; subscribed: boolean; reviews: number;
}

type Sort = 'recent' | 'spent' | 'orders' | 'name';

export function AdminCustomers() {
  const { data, loading, error } = useAsync(() => Promise.all([adminListOrders(), adminListSubscribers(), adminListReviews()]), []);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const [open, setOpen] = useState<string | null>(null);

  const customers = useMemo<Customer[]>(() => {
    if (!data) return [];
    const [orders, subs, reviews] = data;
    const subscribed = new Set(subs.map((s) => s.email.toLowerCase()));
    const map = new Map<string, Customer>();
    for (const o of orders) {
      const email = o.email?.toLowerCase();
      if (!email) continue;
      const c = map.get(email) ?? { email, name: o.customer_name ?? o.shipping_name ?? email, phone: o.phone, city: o.shipping_address?.city ?? null, orders: [], spent: 0, last: o.created_at, subscribed: subscribed.has(email), reviews: reviews.filter((r) => r.email?.toLowerCase() === email).length };
      c.orders.push(o);
      if (o.status !== 'cancelled') c.spent += o.total_cents - (o.refunded_cents ?? 0);
      if (o.created_at > c.last) c.last = o.created_at;
      map.set(email, c);
    }
    const q = search.trim().toLowerCase();
    const list = [...map.values()].filter((c) => !q || `${c.name} ${c.email} ${c.city} ${c.phone}`.toLowerCase().includes(q));
    if (sort === 'recent') list.sort((a, b) => b.last.localeCompare(a.last));
    if (sort === 'spent') list.sort((a, b) => b.spent - a.spent);
    if (sort === 'orders') list.sort((a, b) => b.orders.length - a.orders.length);
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    return list;
  }, [data, search, sort]);

  function exportCsv() {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['Nom', 'Email', 'Téléphone', 'Ville', 'Commandes', 'Total dépensé', 'Dernière commande', 'Inscrit lettre'];
    const rows = customers.map((c) => [c.name, c.email, c.phone, c.city, c.orders.length, (c.spent / 100).toFixed(2).replace('.', ','),
      new Date(c.last).toLocaleDateString('fr-FR'), c.subscribed ? 'oui' : 'non'].map(esc).join(';'));
    downloadFile(`clients-${new Date().toISOString().slice(0, 10)}.csv`, '\uFEFF' + [head.map(esc).join(';'), ...rows].join('\r\n'));
  }

  if (loading) return <p className="text-stone-500">Chargement…</p>;
  if (error) return <p className="text-garance">Impossible de charger : {error}</p>;
  const repeat = customers.filter((c) => c.orders.length > 1).length;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <h1 className="font-display text-3xl text-nuit">Clients <span className="text-stone-400 text-xl">({customers.length})</span></h1>
        <button onClick={exportCsv} disabled={!customers.length} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-stone-300 bg-white disabled:opacity-50">
          <Download className="w-4 h-4" /> Exporter (Excel)
        </button>
      </div>
      <p className="text-stone-500 mt-1">{repeat} client{repeat > 1 ? 's ont' : ' a'} déjà commandé plusieurs fois.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="relative">
          <span className="sr-only">Rechercher un client</span>
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <Input className="pl-10" placeholder="Nom, email, ville ou téléphone" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Trier">
          <option value="recent">Dernière commande</option>
          <option value="spent">Meilleurs clients</option>
          <option value="orders">Nombre de commandes</option>
          <option value="name">Nom (A → Z)</option>
        </Select>
      </div>

      {customers.length === 0 && <p className="mt-6 bg-white rounded-lg p-6 text-stone-500">Vos clients apparaîtront ici après leur première commande.</p>}
      <ul className="mt-5 space-y-3">
        {customers.map((c) => (
          <li key={c.email} className="bg-white rounded-lg border border-stone-200">
            <button onClick={() => setOpen(open === c.email ? null : c.email)} aria-expanded={open === c.email} className="w-full p-4 grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto_auto] gap-x-6 gap-y-1 items-center text-left">
              <span className="min-w-0">
                <span className="font-medium block truncate">{c.name}</span>
                <span className="text-sm text-stone-500 block truncate">{c.email}{c.city ? ` · ${c.city}` : ''}</span>
              </span>
              <span className="text-sm text-stone-500 hidden sm:block">{c.orders.length} commande{c.orders.length > 1 ? 's' : ''}</span>
              <span className="hidden sm:flex gap-1.5">
                {c.orders.length > 1 && <span className="text-xs px-2 py-0.5 rounded bg-safran/25 text-henne">Fidèle</span>}
                {c.subscribed && <span className="text-xs px-2 py-0.5 rounded bg-nuit/10 text-nuit">Lettre</span>}
                {c.reviews > 0 && <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-900 inline-flex items-center gap-1"><Star className="w-3 h-3" />Avis</span>}
              </span>
              <span className="font-medium flex items-center gap-2">{formatPrice(c.spent)}<ChevronDown className={`w-5 h-5 transition-transform ${open === c.email ? 'rotate-180' : ''}`} /></span>
            </button>
            {open === c.email && (
              <div className="border-t border-stone-200 p-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <a href={`mailto:${c.email}`} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-nuit text-laine hover:bg-garance"><Mail className="w-4 h-4" /> Écrire</a>
                  {c.phone && <a href={`tel:${c.phone}`} className="px-4 py-2.5 rounded-md border border-stone-300">{c.phone}</a>}
                </div>
                <ul className="divide-y divide-stone-100">
                  {c.orders.map((o) => (
                    <li key={o.id} className="py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <span className="font-mono text-stone-400">#{orderNumber(o)}</span>
                      <span>{formatDate(o.created_at)}</span>
                      <span className={`px-2 py-0.5 rounded ${ORDER_STATUS[o.status].tone}`}>{ORDER_STATUS[o.status].label}</span>
                      <span className="text-stone-500 truncate">{(o.order_items ?? []).map((i) => i.name).join(', ')}</span>
                      <span className="ml-auto font-medium">{formatPrice(o.total_cents)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
