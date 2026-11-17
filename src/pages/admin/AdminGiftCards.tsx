import { Link } from 'react-router-dom';
import { ExternalLink, Gift } from 'lucide-react';
import { adminListGiftCards } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { formatDate, formatPrice } from '../../lib/format';
import { StatCard } from './ui';

export function AdminGiftCards() {
  const { data, loading, error } = useAsync(adminListGiftCards, []);
  if (loading) return <p className="text-stone-500">Chargement…</p>;
  if (error || !data) return <p className="text-garance">Impossible de charger : {error}</p>;
  const sold = data.reduce((n, g) => n + g.amount_cents, 0);
  const pending = data.filter((g) => !g.used && (!g.expires_at || new Date(g.expires_at) > new Date()));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <h1 className="font-display text-3xl text-nuit flex items-center gap-3"><Gift className="w-7 h-7 text-garance" /> Cartes cadeaux</h1>
        <Link to="/carte-cadeau" target="_blank" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-stone-300 bg-white"><ExternalLink className="w-4 h-4" /> Page de vente</Link>
      </div>
      <p className="text-stone-500 mt-1">Chaque carte achetée devient un code promo à usage unique, valable un an, envoyé automatiquement par email.</p>
      <div className="mt-6 grid gap-4 grid-cols-2 lg:grid-cols-3">
        <StatCard label="Cartes vendues" value={String(data.length)} sub={formatPrice(sold)} />
        <StatCard label="Pas encore utilisées" value={String(pending.length)} sub={formatPrice(pending.reduce((n, g) => n + g.amount_cents, 0))} />
      </div>
      {data.length === 0 && <p className="mt-6 bg-white rounded-lg p-6 text-stone-500">Aucune carte vendue pour l’instant. Pensez à mettre le lien « Carte cadeau » en avant avant les fêtes.</p>}
      <ul className="mt-6 space-y-3">
        {data.map((g) => {
          const expired = g.expires_at && new Date(g.expires_at) < new Date();
          return (
            <li key={g.id} className="bg-white rounded-lg border border-stone-200 p-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              <span className="font-mono font-semibold tracking-wide">{g.code}</span>
              <span className="font-display text-xl text-nuit">{formatPrice(g.amount_cents)}</span>
              <span className={`text-sm px-2.5 py-0.5 rounded ${g.used ? 'bg-stone-200 text-stone-600' : expired ? 'bg-stone-200 text-stone-600' : 'bg-emerald-100 text-emerald-800'}`}>
                {g.used ? 'Utilisée' : expired ? 'Expirée' : 'Valable'}
              </span>
              <span className="text-sm text-stone-500">
                De {g.buyer_name ?? g.buyer_email ?? '—'}{g.recipient_name || g.recipient_email ? ` pour ${g.recipient_name ?? g.recipient_email}` : ''} · {formatDate(g.created_at)}
                {g.expires_at ? ` · jusqu’au ${new Date(g.expires_at).toLocaleDateString('fr-FR')}` : ''}
              </span>
              {g.message && <p className="w-full text-sm italic text-stone-600">« {g.message} »</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
