import { FormEvent, useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { createStockAlert } from '../lib/api';

export function StockAlertForm({ productId }: { productId: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState('sending'); setError(null);
    try {
      await createStockAlert(productId, email);
      setState('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
      setState('idle');
    }
  }

  if (state === 'done') {
    return (
      <div className="bg-emerald-50 text-emerald-800 p-4 rounded-sm flex gap-3" role="status">
        <Check className="w-5 h-5 shrink-0 mt-0.5" />
        <p>C’est noté. Nous vous écrirons dès qu’une pièce de ce type sera disponible.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-laine-fonce p-5 rounded-sm">
      <p className="font-medium flex items-center gap-2"><Bell className="w-4 h-4 text-garance" /> Rupture de stock</p>
      <p className="text-sm mt-1">Laissez votre email : nous vous prévenons dès qu’elle revient ou qu’une pièce semblable est tissée.</p>
      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <label className="flex-1">
          <span className="sr-only">Votre email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.fr"
            className="w-full px-3.5 py-3 bg-white border border-laine-fonce rounded-sm" />
        </label>
        <button disabled={state === 'sending'} className="bg-nuit text-laine px-5 py-3 rounded-sm hover:bg-garance disabled:opacity-60">
          {state === 'sending' ? 'Envoi…' : 'Me prévenir'}
        </button>
      </div>
      {error && <p className="text-sm text-garance mt-2" role="alert">{error}</p>}
    </form>
  );
}
