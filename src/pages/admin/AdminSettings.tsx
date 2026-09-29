import { FormEvent, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { adminListProducts, getSettings, saveSettings } from '../../lib/api';
import { slugify } from '../../settings';
import { guessKind, KIND_LABELS, ProductKind } from '../../config';
import { parsePriceToCents } from '../../lib/format';
import { useSettings } from '../../context/SettingsContext';
import { ShopSettings } from '../../types';
import { Field, Input, Section, Stepper, Textarea, Toast, Toggle, UnitInput } from './ui';
import { SecuritySection } from './SecuritySection';

export function AdminSettings() {
  const { reload } = useSettings();
  const [form, setForm] = useState<ShopSettings | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [newCategory, setNewCategory] = useState('');
  const [toast, setToast] = useState<{ msg: string; tone: 'ok' | 'error' } | null>(null);

  useEffect(() => {
    adminListProducts().then((list) => {
      const u: Record<string, number> = {};
      list.forEach((p) => { u[p.category] = (u[p.category] ?? 0) + 1; });
      setUsage(u);
    });
    getSettings().then((s) => {
      setForm(s);
    });
  }, []);

  if (!form) return <p className="text-stone-500">Chargement…</p>;
  const set = <K extends keyof ShopSettings>(k: K, v: ShopSettings[K]) => setForm({ ...form, [k]: v });

  function addCategory() {
    const label = newCategory.trim();
    if (!label) return;
    let id = slugify(label) || `categorie-${Date.now()}`;
    while (form!.categories.some((c) => c.id === id)) id = `${id}-2`;
    set('categories', [...form!.categories, { id, label, kind: guessKind(id) }]);
    setNewCategory('');
  }
  function renameCategory(i: number, label: string) {
    set('categories', form!.categories.map((c, j) => (j === i ? { ...c, label } : c)));
  }
  function moveCategory(i: number, delta: number) {
    const list = [...form!.categories];
    const t = i + delta;
    if (t < 0 || t >= list.length) return;
    [list[i], list[t]] = [list[t], list[i]];
    set('categories', list);
  }
  function removeCategory(i: number) {
    const c = form!.categories[i];
    const n = usage[c.id] ?? 0;
    if (n > 0) { alert(`« ${c.label} » contient ${n} produit${n > 1 ? 's' : ''}. Changez d’abord leur catégorie.`); return; }
    set('categories', form!.categories.filter((_, j) => j !== i));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form!.email)) next.email = 'Adresse email invalide.';
    if (form!.whatsapp && !/^\d{8,15}$/.test(form!.whatsapp)) next.whatsapp = 'Chiffres uniquement, avec l’indicatif : 33612345678';
    if (form!.categories.length === 0) next.categories = 'Gardez au moins une catégorie.';
    if (form!.categories.some((c) => !c.label.trim())) next.categories = 'Chaque catégorie doit avoir un nom.';
    if (!form!.hero_title.trim()) next.hero_title = 'Le titre de la page d’accueil est obligatoire.';
    setErrors(next);
    if (Object.keys(next).length) { setToast({ msg: 'Quelques champs sont à corriger.', tone: 'error' }); setTimeout(() => setToast(null), 3000); return; }
    setSaving(true);
    try {
      await saveSettings(form!);
      reload();
      setToast({ msg: 'Réglages enregistrés : la boutique est à jour', tone: 'ok' });
    } catch (err) {
      setToast({ msg: `Enregistrement impossible : ${err instanceof Error ? err.message : 'erreur'}`, tone: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  }

  return (
    <>
    <form onSubmit={submit} noValidate className="max-w-3xl">
      <h1 className="font-display text-3xl text-nuit">Réglages de la boutique</h1>
      <p className="text-stone-500 mt-1">Les changements sont visibles immédiatement sur le site.</p>

      <div className="mt-6 space-y-6">
        <Section title="Bandeau d’annonce" description="Une phrase affichée tout en haut du site : promotion, fermeture pour congés, nouvelle collection…">
          <Toggle checked={form.announcement_active} onChange={(v) => set('announcement_active', v)} title="Afficher le bandeau" />
          <Field label="Texte du bandeau" counter={{ value: form.announcement.length, max: 120 }}>
            <Input value={form.announcement} maxLength={120} onChange={(e) => set('announcement', e.target.value)} placeholder="Soldes d’hiver : −20 % sur les kilims jusqu’au 31 janvier" />
          </Field>
          <Field label="Compte à rebours jusqu’au" optional hint="Pour une vente flash : le bandeau affiche « encore 2 j 03 h » puis disparaît tout seul.">
            <div className="flex gap-2">
              <Input type="datetime-local" value={form.announcement_ends_at ? (() => { const d = new Date(form.announcement_ends_at!); const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; })() : ''}
                onChange={(e) => set('announcement_ends_at', e.target.value ? new Date(e.target.value).toISOString() : null)} />
              {form.announcement_ends_at && <button type="button" onClick={() => set('announcement_ends_at', null)} className="shrink-0 px-3 rounded-md border border-stone-300 text-sm">Effacer</button>}
            </div>
          </Field>
          {form.announcement_active && form.announcement && (
            <p className="bg-nuit text-laine text-center text-sm px-4 py-2.5 rounded">{form.announcement}</p>
          )}
        </Section>

        <Section title="Page d’accueil et histoire" description="Les premiers mots que voient vos visiteurs, et le récit de votre atelier.">
          <Field label="Grand titre de la page d’accueil" required error={errors.hero_title} counter={{ value: form.hero_title.length, max: 80 }}>
            <Input value={form.hero_title} maxLength={80} invalid={!!errors.hero_title} onChange={(e) => set('hero_title', e.target.value)} />
          </Field>
          <Field label="Phrase sous le titre" counter={{ value: form.hero_subtitle.length, max: 200 }}>
            <Textarea rows={2} maxLength={200} value={form.hero_subtitle} onChange={(e) => set('hero_subtitle', e.target.value)} />
          </Field>
          <Field label="Texte de la page « Notre histoire »" hint="Laissez une ligne vide entre deux paragraphes." counter={{ value: form.story.length, max: 5000 }}>
            <Textarea rows={9} maxLength={5000} value={form.story} onChange={(e) => set('story', e.target.value)} />
          </Field>
        </Section>

        <Section title="Catégories" description="L’ordre ici est celui de la boutique. Les catégories vides n’apparaissent pas aux visiteurs. Le type (textile, bijoux, beauté…) décide des champs proposés dans la fiche produit.">
          <ul className="space-y-2">
            {form.categories.map((c, i) => (
              <li key={c.id} className="flex items-center gap-2">
                <Input value={c.label} maxLength={40} onChange={(e) => renameCategory(i, e.target.value)} aria-label={`Nom de la catégorie ${i + 1}`} />
                <select value={c.kind ?? guessKind(c.id)} onChange={(e) => set('categories', form.categories.map((x, j) => (j === i ? { ...x, kind: e.target.value as ProductKind } : x)))}
                  className="shrink-0 w-40 px-2 py-3 border border-stone-300 rounded-md bg-white text-sm" aria-label={`Type de produit de ${c.label}`} title="Type de produit : décide des champs à remplir">
                  {(Object.keys(KIND_LABELS) as ProductKind[]).map((k) => <option key={k} value={k}>{KIND_LABELS[k].split(' (')[0]}</option>)}
                </select>
                <span className="text-sm text-stone-500 w-24 shrink-0 text-right">{usage[c.id] ?? 0} produit{(usage[c.id] ?? 0) > 1 ? 's' : ''}</span>
                <button type="button" onClick={() => moveCategory(i, -1)} disabled={i === 0} className="p-2.5 rounded-md hover:bg-stone-100 disabled:opacity-30" aria-label="Monter"><ArrowUp className="w-4 h-4" /></button>
                <button type="button" onClick={() => moveCategory(i, 1)} disabled={i === form.categories.length - 1} className="p-2.5 rounded-md hover:bg-stone-100 disabled:opacity-30" aria-label="Descendre"><ArrowDown className="w-4 h-4" /></button>
                <button type="button" onClick={() => removeCategory(i)} className="p-2.5 rounded-md text-garance hover:bg-red-50" aria-label={`Supprimer ${c.label}`}><Trash2 className="w-4 h-4" /></button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Input value={newCategory} maxLength={40} onChange={(e) => setNewCategory(e.target.value)} placeholder="Nouvelle catégorie, ex. : Poufs"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } }} />
            <button type="button" onClick={addCategory} className="shrink-0 inline-flex items-center gap-2 px-4 rounded-md border border-stone-300 bg-white hover:bg-stone-50"><Plus className="w-4 h-4" /> Ajouter</button>
          </div>
          {errors.categories && <p className="text-sm text-garance font-medium" role="alert">{errors.categories}</p>}
        </Section>

        <Section title="Badges">
          <Field label="Badge « Nouveauté » pendant" hint="Nombre de jours après l’ajout d’un produit. 0 pour ne jamais l’afficher.">
            <div className="flex items-center gap-3"><Stepper label="Jours de nouveauté" value={form.new_days} min={0} max={180} onChange={(v) => set('new_days', v)} /><span className="text-stone-500">jours</span></div>
          </Field>
        </Section>

        <Section title="Place de marché" description="D’autres artisans peuvent candidater pour vendre leurs créations sur la boutique.">
          <Toggle checked={form.marketplace_enabled} onChange={(v) => set('marketplace_enabled', v)} title="Accepter les candidatures d’artisans" description="Page « Vendre mes créations » ouverte au public." />
          <Field label="Commission par défaut" hint="Prélevée sur le prix des articles vendus par les artisans (hors frais d’envoi). Modifiable artisan par artisan.">
            <div className="flex items-center gap-3"><Stepper label="Commission" value={form.marketplace_commission_percent} min={0} max={50} onChange={(v) => set('marketplace_commission_percent', v)} /><span className="text-stone-500">%</span></div>
          </Field>
        </Section>

        <Section title="Paiement">
          <Toggle checked={form.gift_message_enabled} onChange={(v) => set('gift_message_enabled', v)} title="Champ « Message ou précisions » au paiement"
            description="Le client peut écrire un message cadeau ou une précision de livraison. Vous le retrouvez dans la commande." />
        </Section>

        <p className="bg-white border border-stone-200 rounded-lg p-5">Les zones, modes et tarifs de livraison se règlent dans l’onglet <a href="/admin/livraison" className="text-garance underline">Livraison</a>.</p>

        <Section title="Paiement en plusieurs fois" description="Klarna permet au client de payer en 3 fois sans frais ; vous êtes payé en une fois.">
          <Toggle checked={form.installments_enabled} onChange={(v) => set('installments_enabled', v)} title="Afficher « Payez en 3 fois » sur les fiches produit"
            description="À activer après avoir activé Klarna dans Stripe → Paramètres → Moyens de paiement." />
          {form.installments_enabled && (
            <Field label="À partir de" hint="Klarna n’est proposé qu’au-dessus d’un certain montant.">
              <UnitInput unit="€" inputMode="decimal" value={(form.installments_min_cents / 100).toString()}
                onChange={(e) => { const c = parsePriceToCents(e.target.value || '0'); if (c !== null) set('installments_min_cents', c); }} />
            </Field>
          )}
        </Section>

        <Section title="Coordonnées" description="Affichées sur la page Contact, dans le pied de page et sur le bon de livraison.">
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Email de contact" required error={errors.email}>
              <Input type="email" value={form.email} invalid={!!errors.email} onChange={(e) => set('email', e.target.value.trim())} />
            </Field>
            <Field label="Téléphone" optional>
              <Input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+33 6 12 34 56 78" />
            </Field>
            <Field label="Numéro WhatsApp" optional error={errors.whatsapp} hint="Avec l’indicatif, sans + ni espace : 33612345678">
              <Input inputMode="numeric" value={form.whatsapp} invalid={!!errors.whatsapp} onChange={(e) => set('whatsapp', e.target.value.replace(/[^\d]/g, ''))} />
            </Field>
            <Field label="Instagram" optional hint="Lien complet vers votre page.">
              <Input value={form.instagram} onChange={(e) => set('instagram', e.target.value.trim())} placeholder="https://instagram.com/…" />
            </Field>
          </div>
          <Field label="Médiateur de la consommation" hint="Nom et site du médiateur auquel vous adhérez (obligatoire pour vendre aux particuliers). Affiché dans les CGV.">
            <Input value={form.mediator} maxLength={200} onChange={(e) => set('mediator', e.target.value)} placeholder="CM2C — 49 rue de Ponthieu, 75008 Paris — cm2c.net" />
          </Field>
          <Field label="Adresse de l’atelier" optional>
            <Textarea rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} />
          </Field>
        </Section>

        <p className="text-sm text-stone-500">Raison sociale, SIRET et TVA (pages légales) se modifient dans le fichier <code>src/config.ts</code>.</p>
      </div>

      <div className="sticky bottom-0 z-30 mt-8 -mx-4 px-4 py-3 bg-stone-100/95 backdrop-blur border-t border-stone-200">
        <button disabled={saving} className="bg-garance text-laine px-8 py-3.5 rounded-md text-lg hover:bg-nuit disabled:opacity-60">
          {saving ? 'Enregistrement…' : 'Enregistrer les réglages'}
        </button>
      </div>
      <Toast message={toast?.msg ?? null} tone={toast?.tone} />
    </form>
    <div className="max-w-3xl mt-10"><SecuritySection /></div>
    </>
  );
}
