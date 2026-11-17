import { useState } from 'react';
import { Check, Mail, RotateCcw } from 'lucide-react';
import { adminListMessages, setMessageHandled } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { formatDate } from '../../lib/format';

export function AdminMessages() {
  const { data, loading, error, setData } = useAsync(adminListMessages, []);
  const [tab, setTab] = useState<'todo' | 'done'>('todo');
  if (loading) return <p className="text-stone-500">Chargement…</p>;
  if (error || !data) return <p className="text-garance">Impossible de charger : {error}</p>;
  const list = data.filter((m) => (tab === 'todo' ? !m.handled : m.handled));

  async function toggle(id: number, handled: boolean) {
    await setMessageHandled(id, handled);
    setData((l) => l?.map((m) => (m.id === id ? { ...m, handled } : m)) ?? null);
  }

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-3xl text-nuit">Messages</h1>
      <p className="text-stone-500 mt-1">Envoyés depuis l’onglet « Contact » du site.</p>
      <div className="mt-5 flex gap-2">
        {([['todo', 'À traiter'], ['done', 'Traités']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} aria-pressed={tab === id}
            className={`px-3.5 py-2 rounded-md text-sm ${tab === id ? 'bg-nuit text-laine' : 'bg-white border border-stone-200'}`}>
            {label} <span className="opacity-60">{data.filter((m) => (id === 'todo' ? !m.handled : m.handled)).length}</span>
          </button>
        ))}
      </div>
      {list.length === 0 && <p className="mt-6 bg-white rounded-lg p-6 text-stone-500">{tab === 'todo' ? 'Aucun message en attente.' : 'Aucun message traité.'}</p>}
      <ul className="mt-5 space-y-3">
        {list.map((m) => (
          <li key={m.id} className="bg-white rounded-lg border border-stone-200 p-5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-medium">{m.name}</span>
              <a href={`mailto:${m.email}`} className="text-sm text-garance underline break-all">{m.email}</a>
              <span className="text-sm text-stone-400 ml-auto">{formatDate(m.created_at)}</span>
            </div>
            {m.subject && <p className="mt-2 font-medium text-nuit">{m.subject}</p>}
            <p className="mt-2 whitespace-pre-line leading-relaxed">{m.message}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || 'Votre message'}`)}&body=${encodeURIComponent(`Bonjour ${m.name},\n\n\n\n> ${m.message.replace(/\n/g, '\n> ')}`)}`}
                onClick={() => toggle(m.id, true)} className="inline-flex items-center gap-2 bg-nuit text-laine px-4 py-2.5 rounded-md hover:bg-garance"><Mail className="w-4 h-4" /> Répondre</a>
              {m.handled
                ? <button onClick={() => toggle(m.id, false)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-stone-300"><RotateCcw className="w-4 h-4" /> Remettre à traiter</button>
                : <button onClick={() => toggle(m.id, true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-stone-300"><Check className="w-4 h-4" /> Marquer comme traité</button>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
