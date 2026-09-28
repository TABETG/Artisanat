import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, EyeOff, ShieldCheck, Trash2 } from 'lucide-react';
import { adminListOrders, adminListProducts, adminListReviews, deleteReview, moderateReview } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { formatDate } from '../../lib/format';
import { Stars } from '../../components/Stars';
import { useReviews } from '../../context/ReviewsContext';
import { Review } from '../../types';
import { Toast } from './ui';

export function AdminReviews() {
  const { data, loading, error, setData } = useAsync(
    () => Promise.all([adminListReviews(), adminListProducts(), adminListOrders()]), []);
  const { reload: reloadPublic } = useReviews();
  const [tab, setTab] = useState<'pending' | 'published'>('pending');
  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  if (loading) return <p className="text-stone-500">Chargement…</p>;
  if (error || !data) return <p className="text-garance">Impossible de charger : {error}</p>;
  const [reviews, products, orders] = data;
  const buyers = new Set(orders.map((o) => o.email?.toLowerCase()).filter(Boolean));
  const isBuyer = (r: Review) => !!r.email && buyers.has(r.email.toLowerCase());
  const pending = reviews.filter((r) => !r.approved);
  const published = reviews.filter((r) => r.approved);
  const list = tab === 'pending' ? pending : published;

  const patch = (id: number, p: Partial<Review>) =>
    setData((d) => d && [d[0].map((r) => (r.id === id ? { ...r, ...p } : r)), d[1], d[2]]);

  async function publish(r: Review) {
    const verified = isBuyer(r);
    await moderateReview(r.id, { approved: true, verified });
    patch(r.id, { approved: true, verified }); reloadPublic();
    flash('Avis publié sur la fiche produit');
  }
  async function unpublish(r: Review) {
    await moderateReview(r.id, { approved: false });
    patch(r.id, { approved: false }); reloadPublic();
    flash('Avis retiré de la boutique');
  }
  async function remove(r: Review) {
    if (!confirm('Supprimer définitivement cet avis ?')) return;
    await deleteReview(r.id);
    setData((d) => d && [d[0].filter((x) => x.id !== r.id), d[1], d[2]]); reloadPublic();
    flash('Avis supprimé');
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-nuit">Avis clients</h1>
      <p className="text-stone-500 mt-1">Aucun avis n’apparaît sur la boutique sans votre accord. « Achat vérifié » est ajouté automatiquement si l’email correspond à une commande.</p>
      <div className="mt-5 flex gap-2">
        {([['pending', `À valider`, pending.length], ['published', 'Publiés', published.length]] as const).map(([id, label, n]) => (
          <button key={id} onClick={() => setTab(id)} aria-pressed={tab === id}
            className={`px-3.5 py-2 rounded-md text-sm ${tab === id ? 'bg-nuit text-laine' : 'bg-white border border-stone-200'}`}>{label} <span className="opacity-60">{n}</span></button>
        ))}
      </div>
      {list.length === 0 && <p className="mt-6 bg-white rounded-lg p-6 text-stone-500">{tab === 'pending' ? 'Aucun avis en attente.' : 'Aucun avis publié pour l’instant.'}</p>}
      <ul className="mt-5 space-y-3">
        {list.map((r) => {
          const p = products.find((x) => x.id === r.product_id);
          return (
            <li key={r.id} className="bg-white rounded-lg border border-stone-200 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Stars value={r.rating} size={18} />
                <span className="font-medium">{r.author_name}</span>
                <a href={`mailto:${r.email}`} className="text-sm text-garance underline break-all">{r.email}</a>
                {isBuyer(r) && <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded"><ShieldCheck className="w-3.5 h-3.5" /> A déjà commandé</span>}
                <span className="text-sm text-stone-400 ml-auto">{formatDate(r.created_at)}</span>
              </div>
              <p className="text-sm text-stone-500 mt-1">Sur : {p ? <Link to={`/admin/produits/${p.id}`} className="underline">{p.name}</Link> : 'produit supprimé'}</p>
              {r.comment && <p className="mt-3 leading-relaxed whitespace-pre-line">{r.comment}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                {r.approved ? (
                  <button onClick={() => unpublish(r)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-stone-300"><EyeOff className="w-4 h-4" /> Retirer de la boutique</button>
                ) : (
                  <button onClick={() => publish(r)} className="inline-flex items-center gap-2 bg-emerald-700 text-white px-4 py-2.5 rounded-md hover:bg-emerald-800"><Check className="w-4 h-4" /> Publier</button>
                )}
                {r.email && <a href={`mailto:${r.email}?subject=${encodeURIComponent('Merci pour votre avis')}`} className="px-4 py-2.5 rounded-md border border-stone-300">Répondre</a>}
                <button onClick={() => remove(r)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-garance hover:bg-red-50 ml-auto"><Trash2 className="w-4 h-4" /> Supprimer</button>
              </div>
            </li>
          );
        })}
      </ul>
      <Toast message={toast} />
    </div>
  );
}
