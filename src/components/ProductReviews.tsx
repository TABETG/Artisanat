import { FormEvent, useState } from 'react';
import { Check, ShieldCheck } from 'lucide-react';
import { createReview } from '../lib/api';
import { useReviews } from '../context/ReviewsContext';
import { Stars, StarInput } from './Stars';

export function ProductReviews({ productId }: { productId: string }) {
  const { reviews, summary } = useReviews();
  const list = reviews.filter((r) => r.product_id === productId);
  const s = summary(productId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ author_name: '', email: '', rating: 0, comment: '' });
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState('sending'); setError(null);
    try {
      await createReview({ ...form, product_id: productId });
      setState('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
      setState('idle');
    }
  }

  const input = 'w-full px-3.5 py-3 bg-white border border-laine-fonce rounded-sm';

  return (
    <section id="avis" className="mt-20 scroll-mt-24">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <h2 className="font-display text-3xl text-nuit">Avis clients</h2>
        {s && (
          <p className="flex items-center gap-2"><Stars value={s.average} size={20} />
            <span className="font-medium">{s.average.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} / 5</span>
            <span className="text-henne">({s.count} avis)</span></p>
        )}
        {!open && state !== 'done' && (
          <button onClick={() => setOpen(true)} className="ml-auto px-5 py-2.5 rounded-sm border border-nuit/25 text-nuit hover:border-nuit">Donner mon avis</button>
        )}
      </div>

      {state === 'done' ? (
        <p className="mt-6 bg-emerald-50 text-emerald-800 p-4 rounded-sm flex gap-3" role="status">
          <Check className="w-5 h-5 shrink-0 mt-0.5" /> Merci ! Votre avis sera publié après une rapide relecture.
        </p>
      ) : open && (
        <form onSubmit={submit} className="mt-6 bg-white/60 border border-laine-fonce rounded-sm p-5 grid gap-4 max-w-2xl">
          <div>
            <p className="font-medium mb-1">Votre note</p>
            <StarInput value={form.rating} onChange={(rating) => setForm({ ...form, rating })} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <label><span className="font-medium block mb-1">Prénom</span>
              <input required maxLength={60} value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} className={input} /></label>
            <label><span className="font-medium block mb-1">Email <span className="font-normal text-sm text-henne">(jamais publié)</span></span>
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input} /></label>
          </div>
          <label><span className="font-medium block mb-1">Votre avis</span>
            <textarea rows={4} maxLength={1500} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} className={input}
              placeholder="Qualité, couleurs, livraison…" /></label>
          {error && <p className="text-sm text-garance" role="alert">{error}</p>}
          <div className="flex gap-3">
            <button disabled={state === 'sending'} className="bg-nuit text-laine px-6 py-3 rounded-sm hover:bg-garance disabled:opacity-60">
              {state === 'sending' ? 'Envoi…' : 'Envoyer mon avis'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-3 text-henne">Annuler</button>
          </div>
        </form>
      )}

      {list.length === 0 && !open && state !== 'done' && <p className="mt-4 text-henne">Pas encore d’avis sur cette pièce. Soyez le premier à partager votre expérience.</p>}
      <ul className="mt-8 grid gap-6 md:grid-cols-2">
        {list.map((r) => (
          <li key={r.id} className="border-t border-laine-fonce pt-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Stars value={r.rating} />
              <span className="font-medium">{r.author_name}</span>
              {r.verified && <span className="inline-flex items-center gap-1 text-xs text-emerald-800"><ShieldCheck className="w-3.5 h-3.5" /> Achat vérifié</span>}
              <span className="text-sm text-henne ml-auto">{new Date(r.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
            </div>
            {r.comment && <p className="mt-2 leading-relaxed text-encre/85 whitespace-pre-line">{r.comment}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
