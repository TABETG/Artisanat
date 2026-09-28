import { FormEvent, useState } from 'react';
import { subscribeNewsletter } from '../lib/api';

export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState('sending'); setError(null);
    try { await subscribeNewsletter(email); setState('done'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur'); setState('idle'); }
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
