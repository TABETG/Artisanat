import { useState } from 'react';
import { BookOpen, Check, Download } from 'lucide-react';
import { adminListCatalogRequests, downloadFile, markCatalogsSent } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { formatDate } from '../../lib/format';
import { countryName } from '../../shipping';
import { Toast } from './ui';

export function AdminCatalogs() {
  const { data, loading, error, reload } = useAsync(adminListCatalogRequests, []);
  const [tab, setTab] = useState<'new' | 'sent'>('new');
  const [selected, setSelected] = useState<number[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  if (loading) return <p className="text-stone-500">Chargement…</p>;
  if (error || !data) return <p className="text-garance">Impossible de charger : {error}</p>;
  const list = data.filter((c) => c.status === tab);

  /** Fichier pour imprimer les étiquettes (publipostage Word, site de La Poste…). */
  function exportLabels() {
    const rows = list.filter((c) => !selected.length || selected.includes(c.id));
    const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
    downloadFile(`etiquettes-catalogue-${new Date().toISOString().slice(0, 10)}.csv`,
      '\uFEFF' + ['Nom;Adresse;Complément;Code postal;Ville;Pays;Email', ...rows.map((c) => [c.name, c.line1, c.line2, c.postal_code, c.city, countryName(c.country), c.email].map(q).join(';'))].join('\r\n'));
  }

  async function markSent() {
    const ids = selected.length ? selected : list.map((c) => c.id);
    if (!ids.length || !confirm(`Marquer ${ids.length} catalogue(s) comme envoyé(s) ?`)) return;
    await markCatalogsSent(ids); setSelected([]); reload();
    setToast('Catalogues marqués comme envoyés'); setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="max-w-5xl">
      <h1 className="font-display text-3xl text-nuit flex items-center gap-3"><BookOpen className="w-7 h-7 text-garance" /> Demandes de catalogue</h1>
      <p className="text-stone-500 mt-1">Envoyées depuis la page Catalogue. Exportez les adresses pour imprimer vos étiquettes, puis marquez-les comme envoyées.</p>
      <div className="mt-5 flex flex-wrap gap-2 items-center">
        {([['new', 'À envoyer'], ['sent', 'Envoyés']] as const).map(([id, l]) => (
          <button key={id} onClick={() => { setTab(id); setSelected([]); }} aria-pressed={tab === id} className={`px-3.5 py-2 rounded-md text-sm ${tab === id ? 'bg-nuit text-laine' : 'bg-white border border-stone-200'}`}>
            {l} <span className="opacity-60">{data.filter((c) => c.status === id).length}</span>
          </button>
        ))}
        <span className="flex-1" />
        <button onClick={exportLabels} disabled={!list.length} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-stone-300 bg-white disabled:opacity-50"><Download className="w-4 h-4" /> Adresses pour étiquettes (Excel)</button>
        {tab === 'new' && <button onClick={markSent} disabled={!list.length} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50"><Check className="w-4 h-4" /> Marquer envoyés{selected.length ? ` (${selected.length})` : ''}</button>}
      </div>
      {list.length === 0 ? <p className="mt-6 bg-white rounded-lg p-6 text-stone-500">Aucune demande dans cette liste.</p> : (
        <ul className="mt-5 bg-white rounded-lg border border-stone-200 divide-y divide-stone-100">
          {list.map((c) => (
            <li key={c.id} className="p-4 flex flex-wrap gap-x-5 gap-y-1 items-start">
              {tab === 'new' && <input type="checkbox" checked={selected.includes(c.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, c.id] : selected.filter((x) => x !== c.id))} className="mt-1 w-4 h-4" aria-label={`Sélectionner ${c.name}`} />}
              <div className="flex-1 min-w-56">
                <p className="font-medium">{c.name} {c.newsletter && <span className="ml-2 text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">inscrit à la lettre</span>}</p>
                <p className="text-sm text-stone-600">{c.line1}{c.line2 ? `, ${c.line2}` : ''} · {c.postal_code} {c.city} · {countryName(c.country)}</p>
                <p className="text-sm text-stone-500">{c.email}</p>
              </div>
              <span className="text-sm text-stone-400">{c.sent_at ? `envoyé le ${formatDate(c.sent_at)}` : formatDate(c.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
      <Toast message={toast} />
    </div>
  );
}
