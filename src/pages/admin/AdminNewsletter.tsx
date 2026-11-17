import { useMemo, useState } from 'react';
import { Check, Download, Send } from 'lucide-react';
import { adminListCampaigns, adminListProducts, adminListSubscribers, downloadFile, sendCampaign } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { formatDate, formatPrice } from '../../lib/format';
import { ProductImage } from '../../components/ProductImage';
import { Field, Input, Section, Textarea, Toast } from './ui';

export function AdminNewsletter() {
  const { data, loading, error, setData } = useAsync(() => Promise.all([adminListSubscribers(), adminListProducts(), adminListCampaigns()]), []);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'ok' | 'error' } | null>(null);
  const flash = (msg: string, tone: 'ok' | 'error' = 'ok') => { setToast({ msg, tone }); setTimeout(() => setToast(null), 4000); };

  const candidates = useMemo(() => (data?.[1] ?? []).filter((p) => p.active && p.stock > 0).slice(0, 24), [data]);
  if (loading) return <p className="text-stone-500">Chargement…</p>;
  if (error || !data) return <p className="text-garance">Impossible de charger : {error}</p>;
  const [subscribers, , campaigns] = data;

  async function send(test: boolean) {
    if (!test && !confirm(`Envoyer « ${subject} » à ${subscribers.length} inscrit${subscribers.length > 1 ? 's' : ''} ?`)) return;
    setBusy(true);
    try {
      const r = await sendCampaign({ subject, message, productIds: picked, test });
      if (test) flash('Email de test envoyé à votre adresse');
      else {
        flash(`Lettre envoyée à ${r.sent} inscrit${r.sent > 1 ? 's' : ''}`);
        setData((d) => d && [d[0], d[1], [{ id: Date.now(), subject, sent_count: r.sent, created_at: new Date().toISOString() }, ...d[2]]]);
        setSubject(''); setMessage(''); setPicked([]);
      }
    } catch (e) { flash(e instanceof Error ? e.message : 'Envoi impossible', 'error'); }
    finally { setBusy(false); }
  }

  function exportCsv() {
    downloadFile(`inscrits-${new Date().toISOString().slice(0, 10)}.csv`,
      '\uFEFF"Email";"Date d’inscription"\r\n' + subscribers.map((s) => `"${s.email}";"${new Date(s.created_at).toLocaleDateString('fr-FR')}"`).join('\r\n'));
  }

  const toggle = (id: string) => setPicked((l) => (l.includes(id) ? l.filter((x) => x !== id) : l.length < 6 ? [...l, id] : l));

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <h1 className="font-display text-3xl text-nuit">Lettre d’information</h1>
        <button onClick={exportCsv} disabled={!subscribers.length} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-stone-300 bg-white disabled:opacity-50">
          <Download className="w-4 h-4" /> {subscribers.length} inscrit{subscribers.length > 1 ? 's' : ''} (Excel)
        </button>
      </div>

      <Section title="Nouvel envoi" description="Chaque email contient automatiquement un lien de désinscription, comme l’exige la loi.">
        <Field label="Objet" required counter={{ value: subject.length, max: 150 }}>
          <Input value={subject} maxLength={150} onChange={(e) => setSubject(e.target.value)} placeholder="Nouvelle collection : 5 kilims tout juste sortis de l’atelier" />
        </Field>
        <Field label="Message" required hint="Laissez une ligne vide entre deux paragraphes.">
          <Textarea rows={7} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Bonjour,&#10;&#10;Cet automne, nous avons tissé…" />
        </Field>
        <fieldset>
          <legend className="font-medium text-[15px] mb-2">Produits à montrer <span className="font-normal text-sm text-stone-500">(jusqu’à 6, avec photo et lien)</span></legend>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {candidates.map((p) => {
              const on = picked.includes(p.id);
              return (
                <button key={p.id} type="button" onClick={() => toggle(p.id)} aria-pressed={on}
                  className={`relative text-left rounded-md overflow-hidden border-2 ${on ? 'border-nuit' : 'border-transparent'}`}>
                  <ProductImage src={p.images[0]} alt={p.name} className="w-full aspect-[4/5]" />
                  {on && <span className="absolute top-1.5 right-1.5 bg-nuit text-laine rounded-full p-1"><Check className="w-3.5 h-3.5" /></span>}
                  <span className="block text-xs p-1.5 truncate bg-white">{p.name}</span>
                  <span className="block text-xs px-1.5 pb-1.5 bg-white text-stone-500">{formatPrice(p.price_cents)}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="flex flex-wrap gap-3">
          <button disabled={busy || !subject.trim() || !message.trim()} onClick={() => send(true)} className="px-5 py-3 rounded-md border border-stone-300 bg-white disabled:opacity-50">M’envoyer un test</button>
          <button disabled={busy || !subject.trim() || !message.trim() || !subscribers.length} onClick={() => send(false)}
            className="inline-flex items-center gap-2 bg-garance text-laine px-6 py-3 rounded-md hover:bg-nuit disabled:opacity-50">
            <Send className="w-4 h-4" /> {busy ? 'Envoi…' : `Envoyer à ${subscribers.length} inscrit${subscribers.length > 1 ? 's' : ''}`}
          </button>
        </div>
      </Section>

      <Section title="Envois précédents">
        {campaigns.length === 0 ? <p className="text-stone-500">Aucun envoi pour l’instant.</p> : (
          <ul className="divide-y divide-stone-100">
            {campaigns.map((c) => (
              <li key={c.id} className="py-3 flex flex-wrap gap-x-4 gap-y-1">
                <span className="font-medium flex-1">{c.subject}</span>
                <span className="text-sm text-stone-500">{c.sent_count} destinataire{c.sent_count > 1 ? 's' : ''}</span>
                <span className="text-sm text-stone-400">{formatDate(c.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Toast message={toast?.msg ?? null} tone={toast?.tone} />
    </div>
  );
}
