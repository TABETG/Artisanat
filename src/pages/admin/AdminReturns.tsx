import { useState } from 'react';
import { ChevronDown, Mail, RotateCcw } from 'lucide-react';
import { adminListOrders, adminListReturns, refundOrder, updateReturn } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { formatDate, formatPrice } from '../../lib/format';
import { Order, RETURN_STATUS, ReturnRequest, ReturnStatus } from '../../types';
import { Field, Select, Textarea, Toast } from './ui';
import { orderNumber } from './AdminOrders';
import { useSettings } from '../../context/SettingsContext';
import { SHOP } from '../../config';

type Filter = 'open' | 'all' | ReturnStatus;

export function AdminReturns() {
  const { data, loading, error, setData } = useAsync(() => Promise.all([adminListReturns(), adminListOrders()]), []);
  const [filter, setFilter] = useState<Filter>('open');
  const [openId, setOpenId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: 'ok' | 'error' } | null>(null);
  const flash = (msg: string, tone: 'ok' | 'error' = 'ok') => { setToast({ msg, tone }); setTimeout(() => setToast(null), 3500); };

  if (loading) return <p className="text-stone-500">Chargement…</p>;
  if (error || !data) return <p className="text-garance">Impossible de charger : {error}</p>;
  const [returns, orders] = data;
  const isOpen = (r: ReturnRequest) => ['new', 'accepted', 'received'].includes(r.status);
  const list = returns.filter((r) => filter === 'all' || (filter === 'open' ? isOpen(r) : r.status === filter));

  return (
    <div>
      <h1 className="font-display text-3xl text-nuit">Retours</h1>
      <p className="text-stone-500 mt-1">Les clients demandent un retour depuis « Suivre ma commande », dans les 14 jours suivant la réception.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {([['open', 'En cours'], ['new', 'Nouvelles'], ['accepted', 'Acceptées'], ['received', 'Colis reçus'], ['refunded', 'Remboursés'], ['all', 'Tous']] as [Filter, string][]).map(([f, label]) => (
          <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}
            className={`px-3.5 py-2 rounded-md text-sm ${filter === f ? 'bg-nuit text-laine' : 'bg-white border border-stone-200'}`}>
            {label} <span className="opacity-60">{returns.filter((r) => f === 'all' || (f === 'open' ? isOpen(r) : r.status === f)).length}</span>
          </button>
        ))}
      </div>
      {list.length === 0 && <p className="mt-6 bg-white rounded-lg p-6 text-stone-500">Aucun retour dans cette liste.</p>}
      <ul className="mt-5 space-y-3">
        {list.map((r) => {
          const order = orders.find((o) => o.id === r.order_id);
          return (
            <li key={r.id} className="bg-white rounded-lg border border-stone-200">
              <button onClick={() => setOpenId(openId === r.id ? null : r.id)} aria-expanded={openId === r.id} className="w-full p-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-left">
                <span className="font-medium">{order?.shipping_name ?? r.email}</span>
                {order && <span className="text-sm font-mono text-stone-400">#{orderNumber(order)}</span>}
                <span className={`text-sm px-2.5 py-0.5 rounded ${RETURN_STATUS[r.status].tone}`}>{RETURN_STATUS[r.status].label}</span>
                <span className="text-sm text-stone-600">{r.items.map((i) => `${i.quantity} × ${i.name}`).join(', ')}</span>
                <span className="ml-auto text-sm text-stone-400">{formatDate(r.created_at)}</span>
                <ChevronDown className={`w-5 h-5 transition-transform ${openId === r.id ? 'rotate-180' : ''}`} />
              </button>
              {openId === r.id && (
                <Detail ret={r} order={order} onError={(m) => flash(m, 'error')}
                  onSaved={(u, m) => { setData((d) => d && [d[0].map((x) => (x.id === u.id ? u : x)), d[1]]); flash(m); }} />
              )}
            </li>
          );
        })}
      </ul>
      <Toast message={toast?.msg ?? null} tone={toast?.tone} />
    </div>
  );
}

function Detail({ ret, order, onSaved, onError }: { ret: ReturnRequest; order?: Order; onSaved: (r: ReturnRequest, m: string) => void; onError: (m: string) => void }) {
  const { settings } = useSettings();
  const [status, setStatus] = useState<ReturnStatus>(ret.status);
  const [note, setNote] = useState(ret.note ?? '');
  const [busy, setBusy] = useState(false);
  // Montant des articles retournés (hors frais de port, qui restent à la charge du client)
  const amount = ret.items.reduce((n, i) => n + (order?.order_items?.find((x) => x.name === i.name)?.unit_price_cents ?? 0) * i.quantity, 0);
  const remaining = order ? order.total_cents - (order.refunded_cents ?? 0) : 0;
  const refundable = Math.min(amount, remaining);

  const subject = encodeURIComponent('Votre demande de retour');
  const body = encodeURIComponent(`Bonjour,\n\nNous acceptons votre retour. Merci de renvoyer l’article, bien emballé, à l’adresse suivante :\n\n${settings.address}\n\nDès réception, nous vous remboursons ${formatPrice(refundable)} sur votre carte.\n\n${SHOP.name}`);

  async function save(next = status, message = 'Retour mis à jour') {
    setBusy(true);
    try { await updateReturn(ret.id, { status: next, note: note.trim() || null }); onSaved({ ...ret, status: next, note: note.trim() || null }, message); }
    catch (e) { onError(e instanceof Error ? e.message : 'Erreur'); }
    finally { setBusy(false); }
  }

  async function refund() {
    if (!order || !confirm(`Rembourser ${formatPrice(refundable)} au client et remettre les articles en stock ?`)) return;
    setBusy(true);
    try {
      await refundOrder(order.id, refundable, true, `Retour : ${ret.reason}`);
      setStatus('refunded');
      await updateReturn(ret.id, { status: 'refunded', note: note.trim() || null });
      onSaved({ ...ret, status: 'refunded' }, `${formatPrice(refundable)} remboursés, articles remis en stock`);
    } catch (e) { onError(e instanceof Error ? e.message : 'Remboursement impossible'); }
    finally { setBusy(false); }
  }

  return (
    <div className="border-t border-stone-200 p-4 sm:p-5 grid gap-6 md:grid-cols-2">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[15px] content-start">
        <dt className="text-stone-500">Motif</dt><dd>{ret.reason}</dd>
        {ret.comment && <><dt className="text-stone-500">Précisions</dt><dd className="whitespace-pre-line">{ret.comment}</dd></>}
        <dt className="text-stone-500">Articles</dt><dd>{ret.items.map((i) => `${i.quantity} × ${i.name}`).join(', ')}</dd>
        <dt className="text-stone-500">À rembourser</dt><dd className="font-medium">{formatPrice(refundable)} <span className="text-sm text-stone-500 font-normal">(hors frais de port)</span></dd>
        <dt className="text-stone-500">Client</dt><dd><a href={`mailto:${ret.email}`} className="text-garance underline break-all">{ret.email}</a></dd>
      </dl>
      <div className="space-y-4">
        <Field label="Étape">
          <Select value={status} onChange={(e) => setStatus(e.target.value as ReturnStatus)}>
            {(Object.keys(RETURN_STATUS) as ReturnStatus[]).map((s) => <option key={s} value={s}>{RETURN_STATUS[s].label}</option>)}
          </Select>
        </Field>
        <Field label="Note interne" optional><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => save()} disabled={busy} className="bg-nuit text-laine px-5 py-3 rounded-md hover:bg-garance disabled:opacity-60">Enregistrer</button>
          {ret.status === 'new' && (
            <a href={`mailto:${ret.email}?subject=${subject}&body=${body}`} onClick={() => save('accepted', 'Retour accepté : pensez à envoyer l’email ouvert')}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-md border border-stone-300"><Mail className="w-4 h-4" /> Accepter et envoyer l’adresse</a>
          )}
          {ret.status !== 'refunded' && ret.status !== 'declined' && order && refundable > 0 && (
            <button onClick={refund} disabled={busy} className="inline-flex items-center gap-2 px-4 py-3 rounded-md bg-violet-700 text-white hover:bg-violet-800 disabled:opacity-60">
              <RotateCcw className="w-4 h-4" /> Colis reçu : rembourser {formatPrice(refundable)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
