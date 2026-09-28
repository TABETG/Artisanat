import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, Download, ExternalLink, Mail, Printer, Search, Truck } from 'lucide-react';
import { adminListOrders, downloadFile, notifyShipped, ordersToCsv, updateOrder } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { formatDate, formatPrice } from '../../lib/format';
import { Order, ORDER_STATUS, OrderStatus } from '../../types';
import { CARRIERS, SHOP, trackingUrl } from '../../config';
import { Field, Input, Select, Textarea, Toast } from './ui';
import { useSettings } from '../../context/SettingsContext';

type Filter = 'todo' | 'all' | OrderStatus;
export const orderNumber = (o: Order) => o.id.replace(/^demo-/, '').slice(0, 8).toUpperCase();

export function AdminOrders() {
  const { data, loading, error, setData } = useAsync(adminListOrders, []);
  const [filter, setFilter] = useState<Filter>('todo');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: 'ok' | 'error' } | null>(null);
  const flash = (msg: string, tone: 'ok' | 'error' = 'ok') => { setToast({ msg, tone }); setTimeout(() => setToast(null), 3500); };

  const all = data ?? [];
  const orders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((o) =>
      (filter === 'all' || (filter === 'todo' ? o.status === 'paid' || o.status === 'check_stock' : o.status === filter)) &&
      (!q || `${o.shipping_name} ${o.customer_name} ${o.email} ${orderNumber(o)} ${o.tracking_number}`.toLowerCase().includes(q)));
  }, [all, filter, search]);
  const count = (f: Filter) => all.filter((o) => f === 'all' || (f === 'todo' ? o.status === 'paid' || o.status === 'check_stock' : o.status === f)).length;

  function onSaved(updated: Order, message: string) {
    setData((l) => l?.map((o) => o.id === updated.id ? updated : o) ?? null);
    flash(message);
  }

  function exportCsv() {
    downloadFile(`commandes-${new Date().toISOString().slice(0, 10)}.csv`, ordersToCsv(orders));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <h1 className="font-display text-3xl text-nuit">Commandes</h1>
        <button onClick={exportCsv} disabled={!orders.length} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-stone-300 bg-white disabled:opacity-50">
          <Download className="w-4 h-4" /> Exporter pour la comptabilité (Excel)
        </button>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {([['todo', 'À préparer'], ['shipped', 'Expédiées'], ['delivered', 'Livrées'], ['cancelled', 'Annulées'], ['all', 'Toutes']] as [Filter, string][]).map(([f, label]) => (
          <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}
            className={`px-3.5 py-2 rounded-md text-sm ${filter === f ? 'bg-nuit text-laine' : 'bg-white border border-stone-200 hover:border-stone-400'}`}>
            {label} <span className="opacity-60">{count(f)}</span>
          </button>
        ))}
      </div>
      <label className="relative block mt-3 max-w-md">
        <span className="sr-only">Rechercher une commande</span>
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
        <Input className="pl-10" placeholder="Nom, email, numéro de commande ou de suivi" value={search} onChange={(e) => setSearch(e.target.value)} />
      </label>

      {loading && <p className="mt-8 text-stone-500">Chargement…</p>}
      {error && <p className="mt-8 text-garance">Impossible de charger les commandes : {error}</p>}
      {!loading && orders.length === 0 && (
        <div className="mt-8 bg-white rounded-lg p-10 text-center text-stone-500">
          {filter === 'todo' && !search ? 'Aucune commande à préparer. Les nouvelles commandes payées apparaîtront ici.' : 'Aucune commande dans cette liste.'}
        </div>
      )}

      <ul className="mt-5 space-y-3">
        {orders.map((o) => (
          <li key={o.id} className="bg-white rounded-lg border border-stone-200">
            <button onClick={() => setOpenId(openId === o.id ? null : o.id)} className="w-full p-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-left" aria-expanded={openId === o.id}>
              <span className="text-sm text-stone-400 font-mono">#{orderNumber(o)}</span>
              <span className="font-medium">{o.shipping_name ?? o.customer_name ?? o.email}</span>
              <span className={`text-sm px-2.5 py-0.5 rounded ${ORDER_STATUS[o.status].tone}`}>{ORDER_STATUS[o.status].label}</span>
              <span className="ml-auto font-medium">{formatPrice(o.total_cents)}</span>
              <ChevronDown className={`w-5 h-5 transition-transform ${openId === o.id ? 'rotate-180' : ''}`} />
              <span className="w-full text-sm text-stone-500">
                {formatDate(o.created_at)} · {(o.order_items ?? []).reduce((n, i) => n + i.quantity, 0)} article(s)
              </span>
            </button>
            {openId === o.id && <OrderDetail order={o} onSaved={onSaved} onError={(m) => flash(m, 'error')} />}
          </li>
        ))}
      </ul>
      <Toast message={toast?.msg ?? null} tone={toast?.tone} />
    </div>
  );
}

function OrderDetail({ order, onSaved, onError }: { order: Order; onSaved: (o: Order, message: string) => void; onError: (m: string) => void }) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [carrier, setCarrier] = useState(order.tracking_carrier ?? 'colissimo');
  const [tracking, setTracking] = useState(order.tracking_number ?? '');
  const [note, setNote] = useState(order.note ?? '');
  const [sendEmail, setSendEmail] = useState(!order.shipped_email_sent_at);
  const [saving, setSaving] = useState(false);
  const { settings } = useSettings();
  const a = order.shipping_address;
  const link = trackingUrl(carrier, tracking.trim() || null);
  const becomesShipped = status === 'shipped' && order.status !== 'shipped';

  async function save() {
    setSaving(true);
    const patch = { status, tracking_number: tracking.trim() || null, tracking_carrier: tracking.trim() ? carrier : null, note: note.trim() || null };
    try {
      await updateOrder(order.id, patch);
      let updated: Order = { ...order, ...patch };
      let message = 'Commande mise à jour';
      if (status === 'shipped' && sendEmail && order.email) {
        const r = await notifyShipped(order.id);
        if (r.mode === 'email') {
          updated = { ...updated, shipped_email_sent_at: new Date().toISOString() };
          message = 'Commande expédiée : le client a reçu son email de suivi';
        } else {
          window.location.href = mailtoShipped(updated);
          message = 'Email automatique non configuré : votre messagerie s’est ouverte';
        }
      }
      onSaved(updated, message);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-t border-stone-200 p-4 sm:p-5 grid gap-6 md:grid-cols-2">
      <div className="space-y-5 text-[15px]">
        <Info title="Livraison">
          <p className="font-medium">{order.shipping_name}</p>
          {a && <p className="whitespace-pre-line">{[a.line1, a.line2, `${a.postal_code ?? ''} ${a.city ?? ''}`, a.country].filter(Boolean).join('\n')}</p>}
        </Info>
        <Info title="Contact">
          {order.email && <a className="block text-garance underline break-all" href={`mailto:${order.email}`}>{order.email}</a>}
          {order.phone && <a className="block text-garance underline" href={`tel:${order.phone}`}>{order.phone}</a>}
        </Info>
        <Info title="Articles">
          <ul className="space-y-1">
            {order.order_items?.map((it) => (
              <li key={it.id} className="flex justify-between gap-3"><span>{it.quantity} × {it.name}</span><span className="whitespace-nowrap">{formatPrice(it.unit_price_cents * it.quantity)}</span></li>
            ))}
            <li className="flex justify-between text-stone-500"><span>Livraison</span><span>{order.shipping_cents ? formatPrice(order.shipping_cents) : 'Offerte'}</span></li>
            <li className="flex justify-between font-medium border-t mt-1 pt-1"><span>Total payé</span><span>{formatPrice(order.total_cents)}</span></li>
          </ul>
        </Info>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => printSlip(order, settings.email, settings.phone)} className="inline-flex items-center gap-2 text-sm px-3.5 py-2 rounded-md border border-stone-300">
            <Printer className="w-4 h-4" /> Imprimer le bon de livraison
          </button>
          {order.stripe_payment_id && (
            <a href={`https://dashboard.stripe.com/payments/${order.stripe_payment_id}`} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm px-3.5 py-2 rounded-md border border-stone-300">
              <ExternalLink className="w-4 h-4" /> Paiement Stripe (remboursement)
            </a>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {order.status === 'check_stock' && (
          <p className="bg-garance/10 text-garance p-3 rounded text-sm">
            Un article de cette commande a été acheté par deux clients en même temps. Contactez le client pour proposer une autre pièce ou le rembourser depuis Stripe.
          </p>
        )}
        <Field label="Étape de la commande">
          <Select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
            {(Object.keys(ORDER_STATUS) as OrderStatus[]).map((s) => <option key={s} value={s}>{ORDER_STATUS[s].label}</option>)}
          </Select>
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Transporteur">
            <Select value={carrier} onChange={(e) => setCarrier(e.target.value)}>
              {CARRIERS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </Select>
          </Field>
          <Field label="Numéro de suivi" optional>
            <Input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="6A123456789FR" />
          </Field>
        </div>
        {link && <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-garance underline"><Truck className="w-4 h-4" /> Vérifier le suivi</a>}
        {status === 'shipped' && order.email && (
          <label className="flex items-start gap-3 bg-emerald-50 p-3 rounded-md cursor-pointer">
            <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="mt-1 w-5 h-5 accent-emerald-700" />
            <span className="text-sm">
              <span className="font-medium block">Envoyer l’email « Votre commande est en route » au client</span>
              {order.shipped_email_sent_at ? `Déjà envoyé le ${formatDate(order.shipped_email_sent_at)}.` : 'Avec le lien de suivi du colis.'}
            </span>
          </label>
        )}
        <Field label="Note interne" optional hint="Visible par vous seulement.">
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-3">
          <button onClick={save} disabled={saving} className="bg-nuit text-laine px-6 py-3 rounded-md hover:bg-garance disabled:opacity-60">
            {saving ? 'Enregistrement…' : becomesShipped ? 'Marquer comme expédiée' : 'Enregistrer'}
          </button>
          {order.email && (
            <a href={`mailto:${order.email}?subject=${encodeURIComponent(`Votre commande #${orderNumber(order)}`)}`} className="inline-flex items-center gap-2 px-5 py-3 rounded-md border border-stone-300">
              <Mail className="w-4 h-4" /> Écrire au client
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ title, children }: { title: string; children: ReactNode }) {
  return <div><p className="text-sm text-stone-500 mb-0.5">{title}</p>{children}</div>;
}

function mailtoShipped(o: Order): string {
  const link = trackingUrl(o.tracking_carrier, o.tracking_number);
  const body = `Bonjour ${o.shipping_name ?? ''},\n\nVotre commande #${orderNumber(o)} vient d’être expédiée.${o.tracking_number ? `\nNuméro de suivi : ${o.tracking_number}` : ''}${link ? `\nSuivre le colis : ${link}` : ''}\n\nMerci pour votre confiance.\n${SHOP.name}`;
  return `mailto:${o.email}?subject=${encodeURIComponent('Votre commande est en route')}&body=${encodeURIComponent(body)}`;
}

/** Bon de livraison à glisser dans le colis. */
function printSlip(o: Order, email: string, phone: string) {
  const esc = (s: unknown) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
  const a = o.shipping_address ?? {};
  const rows = (o.order_items ?? []).map((i) => `<tr><td>${esc(i.name)}</td><td style="text-align:center">${i.quantity}</td></tr>`).join('');
  const w = window.open('', '_blank', 'width=800,height=900');
  if (!w) return;
  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Bon de livraison #${orderNumber(o)}</title>
  <style>body{font-family:Arial,sans-serif;color:#222;margin:40px;font-size:14px}h1{font-family:Georgia,serif;margin:0}table{width:100%;border-collapse:collapse;margin-top:24px}
  th,td{border-bottom:1px solid #ddd;padding:10px;text-align:left}.grid{display:flex;justify-content:space-between;gap:40px;margin-top:32px}.box{border:1px solid #ccc;padding:16px;min-width:260px}
  .muted{color:#777}@media print{button{display:none}}</style></head><body>
  <button onclick="print()" style="float:right;padding:10px 16px">Imprimer</button>
  <h1>${esc(SHOP.name)}</h1><p class="muted">Tissé à la main depuis ${SHOP.since} · ${esc(email)} · ${esc(phone)}</p>
  <div class="grid"><div><h2 style="margin:0">Bon de livraison</h2><p>Commande <strong>#${orderNumber(o)}</strong><br>du ${new Date(o.created_at).toLocaleDateString('fr-FR')}</p></div>
  <div class="box"><strong>Livrer à</strong><br>${esc(o.shipping_name)}<br>${esc(a.line1)}${a.line2 ? `<br>${esc(a.line2)}` : ''}<br>${esc(a.postal_code)} ${esc(a.city)}<br>${esc(a.country)}${o.phone ? `<br>${esc(o.phone)}` : ''}</div></div>
  <table><thead><tr><th>Article</th><th style="text-align:center;width:100px">Quantité</th></tr></thead><tbody>${rows}</tbody></table>
  <p style="margin-top:40px">Merci pour votre commande. Chaque pièce est unique et faite à la main : prenez-en soin, elle vous accompagnera longtemps.</p>
  <p class="muted">Retour possible sous 14 jours après réception : écrivez-nous à ${esc(email)}.</p>
  </body></html>`);
  w.document.close();
}
