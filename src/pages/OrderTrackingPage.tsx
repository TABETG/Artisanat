import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Package, Truck } from 'lucide-react';
import { requestReturn, trackOrders } from '../lib/api';
import { formatPrice } from '../lib/format';
import { RETURN_REASONS, TrackedOrder } from '../types';
import { useSettings } from '../context/SettingsContext';

const STEPS = [
  { id: 'paid', label: 'Commande payée' },
  { id: 'shipped', label: 'Expédiée' },
  { id: 'delivered', label: 'Livrée' },
] as const;

export function OrderTrackingPage() {
  const { settings } = useSettings();
  const [email, setEmail] = useState('');
  const [postal, setPostal] = useState('');
  const [orders, setOrders] = useState<TrackedOrder[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try { setOrders(await trackOrders(email, postal)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur'); }
    finally { setBusy(false); }
  }

  const input = 'w-full px-3.5 py-3 bg-white border border-laine-fonce rounded-sm';

  return (
    <div className="max-w-3xl mx-auto px-5 pt-14">
      <div className="lisiere-fine w-16 mb-5" aria-hidden />
      <h1 className="font-display text-[2.8rem] sm:text-6xl md:text-7xl text-nuit">Suivre ma commande</h1>
      <p className="lecture mt-5 text-[1.2rem] text-encre/80">Indiquez l’email utilisé lors du paiement et le code postal de livraison.</p>

      <form onSubmit={submit} className="mt-8 grid sm:grid-cols-[1fr_180px_auto] gap-3 items-end">
        <label><span className="font-medium block mb-1">Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} autoComplete="email" /></label>
        <label><span className="font-medium block mb-1">Code postal</span>
          <input required value={postal} onChange={(e) => setPostal(e.target.value)} className={input} autoComplete="postal-code" /></label>
        <button disabled={busy} className="bg-nuit text-laine px-6 py-3 rounded-sm hover:bg-garance disabled:opacity-60">{busy ? 'Recherche…' : 'Rechercher'}</button>
      </form>
      {error && <p className="mt-4 text-garance" role="alert">{error}</p>}

      {orders && orders.length === 0 && (
        <p className="mt-10 bg-laine-fonce p-5 rounded-sm">
          Aucune commande trouvée avec ces informations. Vérifiez l’email (celui du reçu de paiement) ou <Link to="/contact" className="text-garance underline">contactez-nous</Link>.
        </p>
      )}

      <ul className="mt-10 space-y-6">
        {orders?.map((o) => {
          const cancelled = o.status === 'cancelled' || o.status === 'refunded';
          const reached = o.status === 'delivered' ? 2 : o.status === 'shipped' ? 1 : 0;
          return (
            <li key={o.number} className="bg-white/60 border border-laine-fonce rounded-sm p-5">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <p className="font-display text-xl text-nuit">Commande #{o.number}</p>
                <p className="text-henne">du {new Date(o.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p className="ml-auto font-medium">{formatPrice(o.total_cents)}</p>
              </div>
              <p className="mt-1 text-sm text-henne">{o.items.map((i) => `${i.quantity} × ${i.name}`).join(', ')}</p>

              {cancelled ? (
                <p className="mt-5 text-garance font-medium">{o.status === 'refunded' ? 'Commande remboursée' : 'Commande annulée'}. Pour toute question : {settings.email}</p>
              ) : (
                <ol className="mt-6 grid grid-cols-3" aria-label="Avancement">
                  {STEPS.map((s, i) => (
                    <li key={s.id} className="relative flex flex-col items-center text-center">
                      {i > 0 && <span className={`absolute top-4 right-1/2 w-full h-0.5 ${i <= reached ? 'bg-emerald-700' : 'bg-laine-fonce'}`} aria-hidden />}
                      <span className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${i <= reached ? 'bg-emerald-700 text-white' : 'bg-laine-fonce text-henne'}`}>
                        {i < reached || (i === reached && i === 2) ? <Check className="w-4 h-4" /> : i === 1 ? <Truck className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                      </span>
                      <span className={`mt-2 text-sm ${i <= reached ? 'font-medium' : 'text-henne'}`}>{s.label}</span>
                    </li>
                  ))}
                </ol>
              )}

              {o.status === 'paid' && <p className="mt-5 text-sm">Votre commande est en préparation à l’atelier. Vous recevrez le numéro de suivi dès l’expédition.</p>}
              {o.returnable && o.id && <ReturnForm order={o} email={email} postal={postal} />}
              {o.tracking_number && (
                <p className="mt-5 text-sm">
                  {o.carrier && <>{o.carrier} · </>}Suivi n° <strong>{o.tracking_number}</strong>
                  {o.tracking_url && <> — <a href={o.tracking_url} target="_blank" rel="noreferrer" className="text-garance underline">suivre le colis</a></>}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ReturnForm({ order, email, postal }: { order: TrackedOrder; email: string; postal: string }) {
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<string[]>(order.items.length === 1 ? [order.items[0].name] : []);
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState('sending'); setError(null);
    try {
      await requestReturn({ email, postalCode: postal, orderId: order.id!, reason, comment,
        items: order.items.filter((i) => chosen.includes(i.name)) });
      setState('done');
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur'); setState('idle'); }
  }

  if (state === 'done') return <p className="mt-5 bg-emerald-50 text-emerald-800 p-3 rounded-sm text-sm">Demande de retour envoyée. Nous vous écrivons sous 48 heures avec les instructions d’envoi.</p>;
  if (!open) return <button onClick={() => setOpen(true)} className="mt-5 text-sm px-4 py-2.5 rounded-sm border border-nuit/25 hover:border-nuit">Retourner un article</button>;
  return (
    <form onSubmit={submit} className="mt-5 border-t border-laine-fonce pt-4 space-y-3 text-sm">
      <p className="font-medium">Quels articles souhaitez-vous retourner ?</p>
      {order.items.map((i) => (
        <label key={i.name} className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={chosen.includes(i.name)} onChange={(e) => setChosen(e.target.checked ? [...chosen, i.name] : chosen.filter((x) => x !== i.name))} className="w-4 h-4 accent-garance" />
          {i.quantity} × {i.name}
        </label>
      ))}
      <label className="block"><span className="font-medium block mb-1">Motif</span>
        <select required value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-laine-fonce rounded-sm">
          <option value="">Choisir…</option>{RETURN_REASONS.map((r) => <option key={r}>{r}</option>)}
        </select></label>
      <label className="block"><span className="font-medium block mb-1">Précisions <span className="font-normal text-henne">(facultatif)</span></span>
        <textarea rows={3} maxLength={1500} value={comment} onChange={(e) => setComment(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-laine-fonce rounded-sm" /></label>
      {error && <p className="text-garance" role="alert">{error}</p>}
      <div className="flex gap-3">
        <button disabled={state === 'sending' || !chosen.length} className="bg-nuit text-laine px-5 py-2.5 rounded-sm hover:bg-garance disabled:opacity-50">{state === 'sending' ? 'Envoi…' : 'Envoyer la demande'}</button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 text-henne">Annuler</button>
      </div>
    </form>
  );
}
