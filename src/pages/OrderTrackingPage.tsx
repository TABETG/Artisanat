import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Package, Truck } from 'lucide-react';
import { trackOrders } from '../lib/api';
import { formatPrice } from '../lib/format';
import { TrackedOrder } from '../types';
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
      <h1 className="font-display text-4xl md:text-5xl text-nuit">Suivre ma commande</h1>
      <p className="mt-4 text-lg text-encre/80">Indiquez l’email utilisé lors du paiement et le code postal de livraison.</p>

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
          const cancelled = o.status === 'cancelled';
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
                <p className="mt-5 text-garance font-medium">Commande annulée. Pour toute question : {settings.email}</p>
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
