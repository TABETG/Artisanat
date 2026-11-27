import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Mail } from 'lucide-react';
import { subscribeNewsletter } from '../lib/api';

/** Inscription à la lettre d'information. « clair » : sur fond blanc, avec mention RGPD complète. */
export function NewsletterForm({ variant = 'sombre' }: { variant?: 'sombre' | 'clair' }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState('sending'); setError(null);
    try { await subscribeNewsletter(email); setState('done'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur'); setState('idle'); }
  }

  if (variant === 'clair') {
    if (state === 'done') return <p className="flex items-center gap-2 bg-[#DCEBE2] text-menthe p-4 rounded-xl" role="status"><Check className="w-5 h-5" /> Merci ! Vous recevrez nos nouveautés et bons plans.</p>;
    return (
      <form onSubmit={submit} className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <label className="relative flex-1">
            <span className="sr-only">Votre adresse email</span>
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-henne" aria-hidden />
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Votre adresse email"
              className="w-full pl-11 pr-4 py-3.5 bg-white border border-laine-fonce rounded-full focus:border-nuit focus:outline-none placeholder:text-henne/80" />
          </label>
          <button disabled={state === 'sending'} className="btn btn-primaire disabled:opacity-60">
            {state === 'sending' ? 'Inscription…' : 'S’abonner'}
          </button>
        </div>
        {error && <p className="text-sm text-garance" role="alert">{error}</p>}
        <p className="text-xs leading-relaxed text-henne">
          Nouvelles pièces, offres et actualités. Désinscription à tout moment grâce au lien présent dans chaque email.{' '}
          <Link to="/confidentialite" className="underline text-nuit">Gestion de vos données et de vos droits</Link>.
        </p>
      </form>
    );
  }

  if (state === 'done') return <p className="text-safran" role="status">Merci ! Vous serez prévenu(e) des nouvelles pièces.</p>;
  return (
    <form onSubmit={submit}>
      <div className="flex border-b-2 border-laine/40 focus-within:border-safran">
        <label className="flex-1"><span className="sr-only">Votre email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.fr"
            className="w-full py-3 bg-transparent text-lg text-laine placeholder:text-laine/40 focus:outline-none" /></label>
        <button disabled={state === 'sending'} className="font-medium text-safran px-2 hover:text-laine disabled:opacity-60">S’inscrire</button>
      </div>
      {error && <p className="text-sm text-safran mt-2" role="alert">{error}</p>}
      <p className="text-xs text-laine/45 mt-2">Désinscription en un clic depuis chaque email.</p>
    </form>
  );
}
