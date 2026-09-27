import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { adminListOrders, updateOrder } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { formatDate, formatPrice } from '../../lib/format';
import { Order, ORDER_STATUS, OrderStatus } from '../../types';
import { Field, Input, Select, Textarea, Toast } from './ui';

type Filter = 'todo' | 'all' | OrderStatus;

export function AdminOrders() {
  const { data, loading, error, setData } = useAsync(adminListOrders, []);
  const [filter, setFilter] = useState<Filter>('todo');
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const orders = useMemo(() => (data ?? []).filter((o) =>
    filter === 'all' ? true : filter === 'todo' ? o.status === 'paid' || o.status === 'check_stock' : o.status === filter), [data, filter]);
  const todoCount = (data ?? []).filter((o) => o.status === 'paid' || o.status === 'check_stock').length;

  function onSaved(updated: Order) {
    setData((list) => list?.map((o) => o.id === updated.id ? updated : o) ?? null);
    setToast('Commande mise à jour'); setTimeout(() => setToast(null), 2500);
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-nuit">Commandes</h1>
      <div className="mt-5 flex flex-wrap gap-2">
        <FilterButton active={filter === 'todo'} onClick={() => setFilter('todo')}>À préparer ({todoCount})</FilterButton>
        <FilterButton active={filter === 'shipped'} onClick={() => setFilter('shipped')}>Expédiées</FilterButton>
        <FilterButton active={filter === 'delivered'} onClick={() => setFilter('delivered')}>Livrées</FilterButton>
        <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>Toutes</FilterButton>
      </div>

      {loading && <p className="mt-8 text-stone-500">Chargement…</p>}
      {error && <p className="mt-8 text-garance">Impossible de charger les commandes : {error}</p>}
      {!loading && orders.length === 0 && (
        <div className="mt-8 bg-white rounded-md p-10 text-center text-stone-500">
          {filter === 'todo' ? 'Aucune commande à préparer. Les nouvelles commandes payées apparaîtront ici.' : 'Aucune commande dans cette liste.'}
        </div>
      )}

      <ul className="mt-6 space-y-3">
        {orders.map((o) => (
          <li key={o.id} className="bg-white rounded-md">
            <button onClick={() => setOpenId(openId === o.id ? null : o.id)} className="w-full p-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-left" aria-expanded={openId === o.id}>
              <span className="font-medium">{o.shipping_name ?? o.customer_name ?? o.email}</span>
              <span className="text-sm text-stone-500">{formatDate(o.created_at)}</span>
              <span className={`text-sm px-2.5 py-0.5 rounded ${ORDER_STATUS[o.status].tone}`}>{ORDER_STATUS[o.status].label}</span>
              <span className="ml-auto font-medium">{formatPrice(o.total_cents)}</span>
              <ChevronDown className={`w-5 h-5 transition-transform ${openId === o.id ? 'rotate-180' : ''}`} />
            </button>
            {openId === o.id && <OrderDetail order={o} onSaved={onSaved} />}
          </li>
        ))}
      </ul>
      <Toast message={toast} />
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-md ${active ? 'bg-nuit text-laine' : 'bg-white text-encre hover:bg-stone-200'}`}>{children}</button>
  );
}

function OrderDetail({ order, onSaved }: { order: Order; onSaved: (o: Order) => void }) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [tracking, setTracking] = useState(order.tracking_number ?? '');
  const [note, setNote] = useState(order.note ?? '');
  const [saving, setSaving] = useState(false);
  const a = order.shipping_address;

  async function save() {
    setSaving(true);
    const patch = { status, tracking_number: tracking.trim() || null, note: note.trim() || null };
    await updateOrder(order.id, patch);
    setSaving(false);
    onSaved({ ...order, ...patch });
  }

  const mailSubject = encodeURIComponent('Votre commande est en route');
  const mailBody = encodeURIComponent(
    `Bonjour ${order.shipping_name ?? ''},\n\nVotre commande vient d’être expédiée.${tracking ? `\nNuméro de suivi : ${tracking}` : ''}\n\nMerci pour votre confiance.`);

  return (
    <div className="border-t border-stone-200 p-4 grid gap-6 md:grid-cols-2">
      <div className="space-y-4 text-[15px]">
        <div>
          <p className="text-sm text-stone-500">Adresse de livraison</p>
          <p className="font-medium">{order.shipping_name}</p>
          {a && <p className="whitespace-pre-line">{[a.line1, a.line2, `${a.postal_code ?? ''} ${a.city ?? ''}`, a.country].filter(Boolean).join('\n')}</p>}
        </div>
        <div>
          <p className="text-sm text-stone-500">Contact</p>
          {order.email && <a className="block text-garance underline" href={`mailto:${order.email}`}>{order.email}</a>}
          {order.phone && <a className="block text-garance underline" href={`tel:${order.phone}`}>{order.phone}</a>}
        </div>
        <div>
          <p className="text-sm text-stone-500">Articles</p>
          <ul>
            {order.order_items?.map((it) => (
              <li key={it.id} className="flex justify-between gap-3"><span>{it.quantity} × {it.name}</span><span>{formatPrice(it.unit_price_cents * it.quantity)}</span></li>
            ))}
            <li className="flex justify-between text-stone-500"><span>Livraison</span><span>{formatPrice(order.shipping_cents)}</span></li>
            <li className="flex justify-between font-medium border-t mt-1 pt-1"><span>Total payé</span><span>{formatPrice(order.total_cents)}</span></li>
          </ul>
        </div>
        {order.stripe_payment_id && (
          <a href={`https://dashboard.stripe.com/payments/${order.stripe_payment_id}`} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-stone-600 underline">
            Voir le paiement dans Stripe (remboursement) <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      <div className="space-y-4">
        {order.status === 'check_stock' && (
          <p className="bg-garance/10 text-garance p-3 rounded text-sm">
            Un article de cette commande a été acheté par deux clients en même temps. Contactez le client pour proposer une autre pièce ou le rembourser depuis Stripe.
          </p>
        )}
        <Field label="Étape">
          <Select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
            {(Object.keys(ORDER_STATUS) as OrderStatus[]).map((s) => <option key={s} value={s}>{ORDER_STATUS[s].label}</option>)}
          </Select>
        </Field>
        <Field label="Numéro de suivi du colis">
          <Input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Ex. : 6A123456789FR" />
        </Field>
        <Field label="Note interne" hint="Visible par vous seulement">
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-3">
          <button onClick={save} disabled={saving} className="bg-nuit text-laine px-6 py-3 rounded-md hover:bg-garance disabled:opacity-60">
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          {order.email && (
            <a href={`mailto:${order.email}?subject=${mailSubject}&body=${mailBody}`} className="px-5 py-3 rounded-md border border-stone-300">
              Prévenir le client par email
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
