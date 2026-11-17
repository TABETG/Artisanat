import { useEffect, useState } from 'react';
import { Search, Truck } from 'lucide-react';
import { listDzRates, saveDzRates } from '../../lib/api';
import { centsToInput, parsePriceToCents } from '../../lib/format';
import { DzRate } from '../../market';
import { Input, Toast } from './ui';

/** Boutique Algérie : prix de livraison par wilaya, à domicile et au bureau du transporteur. */
export function AdminDzShipping() {
  const [rates, setRates] = useState<DzRate[] | null>(null);
  const [q, setQ] = useState('');
  const [bulk, setBulk] = useState({ home: '', desk: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'ok' | 'error' } | null>(null);
  const flash = (msg: string, tone: 'ok' | 'error' = 'ok') => { setToast({ msg, tone }); setTimeout(() => setToast(null), 3000); };
  useEffect(() => { listDzRates().then(setRates).catch(() => flash('Chargement impossible', 'error')); }, []);
  if (!rates) return <p className="text-stone-500">Chargement…</p>;

  const patch = (code: number, p: Partial<DzRate>) => setRates((l) => l!.map((r) => (r.code === code ? { ...r, ...p } : r)));
  const toCents = (v: string) => (v.trim() ? parsePriceToCents(v) : null);
  const shown = rates.filter((r) => !q.trim() || `${r.code} ${r.name}`.toLowerCase().includes(q.trim().toLowerCase()));

  function applyToAll() {
    const home = toCents(bulk.home), desk = toCents(bulk.desk);
    setRates((l) => l!.map((r) => (shown.includes(r) ? { ...r, ...(bulk.home ? { home_cents: home } : {}), ...(bulk.desk ? { desk_cents: desk } : {}) } : r)));
    flash(`Prix appliqués à ${shown.length} wilaya(s) : pensez à enregistrer`);
  }

  async function save() {
    setSaving(true);
    try { await saveDzRates(rates!); flash('Tarifs enregistrés'); } catch (e) { flash(e instanceof Error ? e.message : 'Erreur', 'error'); }
    finally { setSaving(false); }
  }

  const priceInput = (cents: number | null, onChange: (c: number | null) => void, label: string) => (
    <label className="flex items-center border border-stone-300 rounded-md bg-white focus-within:border-nuit">
      <span className="sr-only">{label}</span>
      <input inputMode="numeric" defaultValue={cents == null ? '' : centsToInput(cents)} placeholder="—"
        onBlur={(e) => onChange(toCents(e.target.value))} className="w-24 px-2.5 py-2 bg-transparent focus:outline-none tabular-nums" />
      <span className="pr-2 text-sm text-stone-500">DA</span>
    </label>
  );

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-3xl text-nuit flex items-center gap-3"><Truck className="w-7 h-7 text-garance" /> Livraison en Algérie</h1>
      <p className="text-stone-500 mt-1">Prix payés par le client, en dinars. Laissez vide pour ne pas proposer un mode ; décochez une wilaya pour ne pas la desservir.</p>

      <div className="mt-5 bg-white rounded-lg border border-stone-200 p-4 flex flex-wrap items-end gap-3">
        <label className="relative flex-1 min-w-48"><span className="sr-only">Rechercher une wilaya</span>
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <Input className="pl-9" placeholder="Rechercher une wilaya" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <label className="text-sm">Domicile<input inputMode="numeric" value={bulk.home} onChange={(e) => setBulk({ ...bulk, home: e.target.value })} className="block w-24 mt-1 px-2.5 py-2 border border-stone-300 rounded-md" placeholder="DA" /></label>
        <label className="text-sm">Bureau<input inputMode="numeric" value={bulk.desk} onChange={(e) => setBulk({ ...bulk, desk: e.target.value })} className="block w-24 mt-1 px-2.5 py-2 border border-stone-300 rounded-md" placeholder="DA" /></label>
        <button onClick={applyToAll} disabled={!bulk.home && !bulk.desk} className="px-4 py-2.5 rounded-md border border-stone-300 disabled:opacity-50">Appliquer aux {shown.length} wilayas affichées</button>
      </div>

      <div className="mt-4 bg-white rounded-lg border border-stone-200 overflow-x-auto">
        <table className="w-full min-w-[520px] text-[15px]">
          <thead className="text-left text-sm text-stone-500 border-b border-stone-200">
            <tr><th className="p-3">Wilaya</th><th className="p-3">À domicile</th><th className="p-3">Au bureau</th><th className="p-3">Desservie</th></tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={`${r.code}-${r.home_cents}-${r.desk_cents}`} className={`border-b border-stone-100 ${r.active ? '' : 'opacity-50'}`}>
                <td className="p-3"><span className="font-mono text-stone-400 mr-2">{String(r.code).padStart(2, '0')}</span>{r.name}</td>
                <td className="p-2">{priceInput(r.home_cents, (c) => patch(r.code, { home_cents: c }), `Prix à domicile, ${r.name}`)}</td>
                <td className="p-2">{priceInput(r.desk_cents, (c) => patch(r.code, { desk_cents: c }), `Prix au bureau, ${r.name}`)}</td>
                <td className="p-3"><input type="checkbox" checked={r.active} onChange={(e) => patch(r.code, { active: e.target.checked })} className="w-5 h-5 accent-emerald-700" aria-label={`Desservir ${r.name}`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="sticky bottom-0 mt-4 -mx-4 px-4 py-3 bg-stone-100/95 backdrop-blur border-t border-stone-200">
        <button onClick={save} disabled={saving} className="bg-garance text-laine px-8 py-3.5 rounded-md text-lg hover:bg-nuit disabled:opacity-60">{saving ? 'Enregistrement…' : 'Enregistrer les tarifs'}</button>
      </div>
      <Toast message={toast?.msg ?? null} tone={toast?.tone} />
    </div>
  );
}
