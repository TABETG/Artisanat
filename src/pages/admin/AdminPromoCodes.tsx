import { FormEvent, useState } from 'react';
import { Check, Copy, Plus, Ticket } from 'lucide-react';
import { adminListPromoCodes, createPromoCode, deactivatePromoCode } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { formatPrice, parsePriceToCents } from '../../lib/format';
import { PromoCode } from '../../types';
import { Field, Input, Section, Toast, UnitInput } from './ui';

function status(p: PromoCode): { label: string; tone: string } {
  if (!p.active) return { label: 'Désactivé', tone: 'bg-stone-200 text-stone-600' };
  if (p.expires_at && new Date(p.expires_at) < new Date()) return { label: 'Expiré', tone: 'bg-stone-200 text-stone-600' };
  if (p.max_redemptions && p.times_redeemed >= p.max_redemptions) return { label: 'Épuisé', tone: 'bg-stone-200 text-stone-600' };
  return { label: 'Actif', tone: 'bg-emerald-100 text-emerald-800' };
}

export function AdminPromoCodes() {
  const { data, loading, error, setData } = useAsync(adminListPromoCodes, []);
  const [code, setCode] = useState('');
  const [kind, setKind] = useState<'percent' | 'amount'>('percent');
  const [value, setValue] = useState('10');
  const [expires, setExpires] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [minimum, setMinimum] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function generate() {
    const words = ['LAINE', 'ATLAS', 'TAPIS', 'KILIM', 'ATELIER'];
    setCode(`${words[Math.floor(Math.random() * words.length)]}${Math.floor(10 + Math.random() * 89)}`);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const v = kind === 'percent' ? parseInt(value, 10) : parsePriceToCents(value);
    if (!v || (kind === 'percent' && (v < 1 || v > 90))) return setFormError(kind === 'percent' ? 'Indiquez un pourcentage entre 1 et 90.' : 'Indiquez un montant, par exemple 20.');
    const min = minimum.trim() ? parsePriceToCents(minimum) : null;
    if (minimum.trim() && !min) return setFormError('Montant minimum invalide.');
    setBusy(true);
    try {
      const created = await createPromoCode({
        code, kind, value: v,
        expires_at: expires ? new Date(`${expires}T23:59:59`).toISOString() : null,
        max_redemptions: maxUses ? parseInt(maxUses, 10) : null,
        minimum_amount_cents: min,
      });
      setData((l) => [created, ...(l ?? [])]);
      setCode(''); setExpires(''); setMaxUses(''); setMinimum('');
      setToast(`Code ${created.code} créé : il fonctionne dès maintenant`); setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Création impossible');
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(p: PromoCode) {
    if (!confirm(`Désactiver le code ${p.code} ? Il ne pourra plus être utilisé (cette action est définitive).`)) return;
    await deactivatePromoCode(p.id);
    setData((l) => l?.map((x) => (x.id === p.id ? { ...x, active: false } : x)) ?? null);
  }

  async function copy(c: string) {
    await navigator.clipboard?.writeText(c);
    setCopied(c); setTimeout(() => setCopied(null), 1500);
  }

  const describe = (p: PromoCode) => p.percent_off ? `−${p.percent_off} %` : `−${formatPrice(p.amount_off_cents ?? 0)}`;

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-3xl text-nuit flex items-center gap-3"><Ticket className="w-7 h-7 text-garance" /> Codes promo</h1>
      <p className="text-stone-500 mt-1">Le client saisit le code sur la page de paiement. À partager dans une lettre d’information, sur Instagram ou dans un colis.</p>

      <form onSubmit={submit} className="mt-6">
        <Section title="Créer un code">
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Code" required hint="Lettres, chiffres ou tirets. Ex. : BIENVENUE10">
              <div className="flex gap-2">
                <Input value={code} maxLength={30} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))} placeholder="NOEL2026" />
                <button type="button" onClick={generate} className="shrink-0 px-3 rounded-md border border-stone-300 text-sm hover:bg-stone-50">Générer</button>
              </div>
            </Field>
            <Field label="Réduction" required>
              <div className="flex gap-2">
                <div className="inline-flex rounded-md border border-stone-300 overflow-hidden shrink-0" role="group" aria-label="Type de réduction">
                  <button type="button" onClick={() => { setKind('percent'); setValue('10'); }} aria-pressed={kind === 'percent'} className={`px-3.5 ${kind === 'percent' ? 'bg-nuit text-laine' : 'bg-white'}`}>%</button>
                  <button type="button" onClick={() => { setKind('amount'); setValue('20'); }} aria-pressed={kind === 'amount'} className={`px-3.5 ${kind === 'amount' ? 'bg-nuit text-laine' : 'bg-white'}`}>€</button>
                </div>
                <UnitInput unit={kind === 'percent' ? '%' : '€'} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} className="flex-1" />
              </div>
            </Field>
            <Field label="Valable jusqu’au" optional>
              <Input type="date" value={expires} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setExpires(e.target.value)} />
            </Field>
            <Field label="Nombre d’utilisations maximum" optional hint="Vide : illimité.">
              <Input type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="50" />
            </Field>
            <Field label="Montant minimum de commande" optional>
              <UnitInput unit="€" inputMode="decimal" value={minimum} onChange={(e) => setMinimum(e.target.value)} placeholder="200" />
            </Field>
          </div>
          {formError && <p className="text-sm text-garance font-medium" role="alert">{formError}</p>}
          <button disabled={busy || code.length < 3} className="inline-flex items-center gap-2 bg-garance text-laine px-6 py-3.5 rounded-md text-lg hover:bg-nuit disabled:opacity-50">
            <Plus className="w-5 h-5" /> {busy ? 'Création…' : 'Créer le code'}
          </button>
        </Section>
      </form>

      <h2 className="font-display text-2xl text-nuit mt-10">Codes existants</h2>
      {loading && <p className="mt-4 text-stone-500">Chargement…</p>}
      {error && <p className="mt-4 text-garance">Impossible de charger les codes : {error}</p>}
      {!loading && data?.length === 0 && <p className="mt-4 bg-white rounded-lg p-6 text-stone-500">Aucun code pour l’instant.</p>}
      <ul className="mt-4 space-y-3">
        {data?.map((p) => {
          const st = status(p);
          return (
            <li key={p.id} className="bg-white rounded-lg border border-stone-200 p-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              <button onClick={() => copy(p.code)} className="font-mono text-lg font-semibold tracking-wide inline-flex items-center gap-2 hover:text-garance" title="Copier le code">
                {p.code} {copied === p.code ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4 text-stone-400" />}
              </button>
              <span className="font-medium text-garance">{describe(p)}</span>
              <span className={`text-sm px-2.5 py-0.5 rounded ${st.tone}`}>{st.label}</span>
              <span className="text-sm text-stone-500">
                {p.times_redeemed} utilisation{p.times_redeemed > 1 ? 's' : ''}{p.max_redemptions ? ` sur ${p.max_redemptions}` : ''}
                {p.minimum_amount_cents ? ` · dès ${formatPrice(p.minimum_amount_cents)}` : ''}
                {p.expires_at ? ` · jusqu’au ${new Date(p.expires_at).toLocaleDateString('fr-FR')}` : ''}
              </span>
              {p.active && <button onClick={() => deactivate(p)} className="ml-auto text-sm px-3.5 py-2 rounded-md border border-stone-300 hover:border-garance hover:text-garance">Désactiver</button>}
            </li>
          );
        })}
      </ul>
      <p className="mt-6 text-sm text-stone-500">Un code ne peut pas être modifié après sa création : désactivez-le et créez-en un nouveau.</p>
      <Toast message={toast} />
    </div>
  );
}
