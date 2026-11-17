import { useEffect, useState } from 'react';
import { Copy, Plus, Trash2, Truck } from 'lucide-react';
import { getSettings, saveSettings } from '../../lib/api';
import { centsToInput, formatPrice, parsePriceToCents } from '../../lib/format';
import { useSettings } from '../../context/SettingsContext';
import { COUNTRIES, KIND_LABELS, OVERSIZE_M2, ShippingKind, ShippingMethod, ShippingZone } from '../../shipping';
import { ShopSettings } from '../../types';
import { Field, Input, Section, Select, Stepper, Textarea, Toast, Toggle, UnitInput } from './ui';

/** Champ prix en euros : vide = non proposé / jamais. */
function PriceField({ cents, onChange, emptyLabel, invalid }: { cents: number | null; onChange: (c: number | null) => void; emptyLabel: string; invalid?: boolean }) {
  const [text, setText] = useState(cents == null ? '' : centsToInput(cents));
  useEffect(() => { setText(cents == null ? '' : centsToInput(cents)); }, [cents]);
  return (
    <UnitInput unit="€" inputMode="decimal" value={text} placeholder={emptyLabel} invalid={invalid}
      onChange={(e) => { setText(e.target.value); if (!e.target.value.trim()) onChange(null); else { const c = parsePriceToCents(e.target.value); if (c !== null) onChange(c); } }} />
  );
}

export function AdminShipping() {
  const { reload } = useSettings();
  const [s, setS] = useState<ShopSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'ok' | 'error' } | null>(null);
  const flash = (msg: string, tone: 'ok' | 'error' = 'ok') => { setToast({ msg, tone }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => { getSettings().then(setS); }, []);
  if (!s) return <p className="text-stone-500">Chargement…</p>;

  const setMethods = (fn: (l: ShippingMethod[]) => ShippingMethod[]) => setS({ ...s, shipping_methods: fn(s.shipping_methods) });
  const setZones = (fn: (l: ShippingZone[]) => ShippingZone[]) => setS({ ...s, shipping_zones: fn(s.shipping_zones) });
  const patchMethod = (id: string, p: Partial<ShippingMethod>) => setMethods((l) => l.map((m) => (m.id === id ? { ...m, ...p } : m)));
  const patchZone = (id: string, p: Partial<ShippingZone>) => setZones((l) => l.map((z) => (z.id === id ? { ...z, ...p } : z)));
  const usedElsewhere = (zoneId: string, code: string) => s.shipping_zones.some((z) => z.id !== zoneId && z.countries.includes(code));

  function addMethod(copyOf?: ShippingMethod) {
    const id = `mode-${Date.now()}`;
    const base: ShippingMethod = copyOf
      ? { ...copyOf, id, name: `${copyOf.name} (copie)`, active: false }
      : { id, name: 'Nouveau mode', description: '', kind: 'domicile', active: false, prices: Object.fromEntries(s!.shipping_zones.map((z) => [z.id, null])), free_from_cents: null, oversize_cents: 0, min_days: 3, max_days: 6 };
    setMethods((l) => [...l, base]);
  }
  function addZone() {
    const id = `zone-${Date.now()}`;
    setZones((l) => [...l, { id, label: 'Nouvelle zone', countries: [] }]);
  }
  function removeZone(z: ShippingZone) {
    if (!confirm(`Supprimer la zone « ${z.label} » ? Les tarifs de cette zone seront effacés.`)) return;
    setS({ ...s!, shipping_zones: s!.shipping_zones.filter((x) => x.id !== z.id),
      shipping_methods: s!.shipping_methods.map((m) => { const prices = { ...m.prices }; delete prices[z.id]; return { ...m, prices }; }) });
  }

  const problems: string[] = [];
  if (!s.shipping_methods.some((m) => m.active)) problems.push('Activez au moins un mode de livraison, sinon personne ne pourra commander.');
  s.shipping_methods.forEach((m) => {
    if (!m.name.trim()) problems.push('Chaque mode doit avoir un nom.');
    if (m.min_days > m.max_days) problems.push(`« ${m.name} » : le délai minimum dépasse le maximum.`);
    if (m.active && !Object.values(m.prices).some((p) => p != null)) problems.push(`« ${m.name} » est actif mais n’a de prix dans aucune zone.`);
  });

  async function save() {
    if (problems.length) { flash(problems[0], 'error'); return; }
    setSaving(true);
    try { await saveSettings(s!); reload(); flash('Livraison enregistrée : le panier et le paiement sont à jour'); }
    catch (e) { flash(e instanceof Error ? e.message : 'Erreur', 'error'); }
    finally { setSaving(false); }
  }

  return (
    <div className="max-w-5xl">
      <h1 className="font-display text-3xl text-nuit flex items-center gap-3"><Truck className="w-7 h-7 text-garance" /> Livraison</h1>
      <p className="text-stone-500 mt-1">Le client choisit son pays et son mode dans le panier. Le prix est recalculé au paiement à partir de ces réglages.</p>

      <div className="mt-6 space-y-6">
        <Section title="Préparation">
          <Field label="Délai de préparation avant expédition" hint="Ajouté aux délais de chaque mode pour calculer la date de livraison affichée au client.">
            <div className="flex items-center gap-3"><Stepper label="Jours de préparation" value={s.preparation_days} min={0} max={30} onChange={(v) => setS({ ...s, preparation_days: v })} /><span className="text-stone-500">jours ouvrés</span></div>
          </Field>
        </Section>

        {/* ---------- Modes ---------- */}
        <Section title="Modes de livraison" description={`Laissez un prix vide pour ne pas proposer le mode dans une zone. Le supplément « grand tapis » s’applique aux pièces de plus de ${OVERSIZE_M2} m².`}>
          <div className="space-y-4">
            {s.shipping_methods.map((m) => (
              <div key={m.id} className={`rounded-lg border p-4 sm:p-5 space-y-4 ${m.active ? 'border-stone-300 bg-white' : 'border-dashed border-stone-300 bg-stone-50'}`}>
                <div className="flex flex-wrap items-start gap-4">
                  <Toggle checked={m.active} onChange={(v) => patchMethod(m.id, { active: v })} title={m.active ? 'Proposé' : 'Désactivé'} />
                  <div className="ml-auto flex gap-1">
                    <button type="button" onClick={() => addMethod(m)} className="p-2.5 rounded-md hover:bg-stone-100" aria-label={`Dupliquer ${m.name}`} title="Dupliquer"><Copy className="w-4 h-4" /></button>
                    <button type="button" onClick={() => { if (confirm(`Supprimer « ${m.name} » ?`)) setMethods((l) => l.filter((x) => x.id !== m.id)); }}
                      className="p-2.5 rounded-md text-garance hover:bg-red-50" aria-label={`Supprimer ${m.name}`} title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="grid sm:grid-cols-[1fr_220px] gap-4">
                  <Field label="Nom affiché au client" required><Input value={m.name} maxLength={60} onChange={(e) => patchMethod(m.id, { name: e.target.value })} /></Field>
                  <Field label="Type">
                    <Select value={m.kind} onChange={(e) => patchMethod(m.id, { kind: e.target.value as ShippingKind })}>
                      {(Object.keys(KIND_LABELS) as ShippingKind[]).map((k) => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
                    </Select>
                  </Field>
                </div>
                <Field label="Précision pour le client" optional hint="Affichée dans le panier quand ce mode est choisi.">
                  <Textarea rows={2} maxLength={200} value={m.description} onChange={(e) => patchMethod(m.id, { description: e.target.value })} />
                </Field>
                <div>
                  <p className="font-medium text-[15px] mb-1.5">Prix par zone</p>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {s.shipping_zones.map((z) => (
                      <label key={z.id} className="block">
                        <span className="block text-sm text-stone-600 mb-1 truncate">{z.label}</span>
                        <PriceField cents={m.prices[z.id] ?? null} emptyLabel="Non proposé" onChange={(c) => patchMethod(m.id, { prices: { ...m.prices, [z.id]: c } })} />
                      </label>
                    ))}
                  </div>
                </div>
                <label className="flex items-start gap-3 text-[15px] cursor-pointer">
                  <input type="checkbox" checked={m.allow_oversize !== false} onChange={(e) => patchMethod(m.id, { allow_oversize: e.target.checked })} className="mt-0.5 w-5 h-5 accent-emerald-700 shrink-0" />
                  <span>Accepte les grands tapis (plus de {OVERSIZE_M2} m²)
                    <span className="block text-sm text-stone-500">Décochez pour un point relais, limité en poids et en taille.</span></span>
                </label>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Field label="Offerte dès" optional hint="Vide : jamais offerte.">
                    <PriceField cents={m.free_from_cents} emptyLabel="Jamais" onChange={(c) => patchMethod(m.id, { free_from_cents: c })} />
                  </Field>
                  <Field label="Supplément grand tapis" hint="Par pièce.">
                    <PriceField cents={m.oversize_cents} emptyLabel="0" onChange={(c) => patchMethod(m.id, { oversize_cents: c ?? 0 })} />
                  </Field>
                  <Field label="Délai minimum" hint="Jours ouvrés."><div><Stepper label="Délai minimum" value={m.min_days} min={0} max={60} onChange={(v) => patchMethod(m.id, { min_days: v })} /></div></Field>
                  <Field label="Délai maximum" hint="Jours ouvrés."><div><Stepper label="Délai maximum" value={m.max_days} min={0} max={60} onChange={(v) => patchMethod(m.id, { max_days: v })} /></div></Field>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => addMethod()} className="inline-flex items-center gap-2 px-4 py-3 rounded-md border border-stone-300 bg-white hover:bg-stone-50"><Plus className="w-4 h-4" /> Ajouter un mode de livraison</button>
        </Section>

        {/* ---------- Zones ---------- */}
        <Section title="Zones de livraison" description="Regroupez les pays qui ont les mêmes tarifs. Un pays ne peut appartenir qu’à une seule zone.">
          <div className="space-y-4">
            {s.shipping_zones.map((z) => (
              <div key={z.id} className="rounded-lg border border-stone-300 bg-white p-4 space-y-3">
                <div className="flex gap-2 items-end">
                  <Field label="Nom de la zone"><Input value={z.label} maxLength={40} onChange={(e) => patchZone(z.id, { label: e.target.value })} /></Field>
                  <button type="button" onClick={() => removeZone(z)} className="p-3 rounded-md text-garance hover:bg-red-50" aria-label={`Supprimer la zone ${z.label}`}><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Pays de la zone ${z.label}`}>
                  {COUNTRIES.map((c) => {
                    const on = z.countries.includes(c.code);
                    const taken = !on && usedElsewhere(z.id, c.code);
                    return (
                      <button key={c.code} type="button" disabled={taken} aria-pressed={on}
                        onClick={() => patchZone(z.id, { countries: on ? z.countries.filter((x) => x !== c.code) : [...z.countries, c.code] })}
                        className={`text-sm px-2.5 py-1 rounded-full border ${on ? 'bg-nuit text-laine border-nuit' : taken ? 'opacity-30 cursor-not-allowed border-stone-200' : 'border-stone-300 hover:border-stone-500'}`}
                        title={taken ? 'Déjà dans une autre zone' : undefined}>{c.name}</button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addZone} className="inline-flex items-center gap-2 px-4 py-3 rounded-md border border-stone-300 bg-white hover:bg-stone-50"><Plus className="w-4 h-4" /> Ajouter une zone</button>
        </Section>

        <Section title="Aperçu">
          <p className="text-sm text-stone-500">Exemple : un panier de {formatPrice(20000)} livré en France.</p>
          <ul className="text-[15px] divide-y divide-stone-100">
            {s.shipping_methods.filter((m) => m.active && m.prices.france != null).map((m) => {
              const free = m.free_from_cents && 20000 >= m.free_from_cents;
              return <li key={m.id} className="py-2 flex justify-between"><span>{m.name}</span><span className="tabular-nums">{free || m.prices.france === 0 ? 'Gratuit' : formatPrice(m.prices.france!)}</span></li>;
            })}
          </ul>
        </Section>
      </div>

      {problems.length > 0 && <p className="mt-6 bg-garance/10 text-garance p-3 rounded-md text-sm">{problems[0]}</p>}
      <div className="sticky bottom-0 z-30 mt-6 -mx-4 px-4 py-3 bg-stone-100/95 backdrop-blur border-t border-stone-200">
        <button onClick={save} disabled={saving} className="bg-garance text-laine px-8 py-3.5 rounded-md text-lg hover:bg-nuit disabled:opacity-60">{saving ? 'Enregistrement…' : 'Enregistrer la livraison'}</button>
      </div>
      <Toast message={toast?.msg ?? null} tone={toast?.tone} />
    </div>
  );
}
