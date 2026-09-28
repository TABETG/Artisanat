import { FormEvent, useEffect, useState } from 'react';
import { getSettings, saveSettings } from '../../lib/api';
import { centsToInput, formatPrice, parsePriceToCents } from '../../lib/format';
import { useSettings } from '../../context/SettingsContext';
import { ShopSettings } from '../../types';
import { Field, Input, Section, Stepper, Textarea, Toast, Toggle, UnitInput } from './ui';

export function AdminSettings() {
  const { reload } = useSettings();
  const [form, setForm] = useState<ShopSettings | null>(null);
  const [shipping, setShipping] = useState('');
  const [free, setFree] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'ok' | 'error' } | null>(null);

  useEffect(() => {
    getSettings().then((s) => {
      setForm(s);
      setShipping(centsToInput(s.shipping_cents));
      setFree(s.free_shipping_from_cents ? centsToInput(s.free_shipping_from_cents) : '');
    });
  }, []);

  if (!form) return <p className="text-stone-500">Chargement…</p>;
  const set = <K extends keyof ShopSettings>(k: K, v: ShopSettings[K]) => setForm({ ...form, [k]: v });

  async function submit(e: FormEvent) {
    e.preventDefault();
    const s = parsePriceToCents(shipping || '0');
    const f = free.trim() ? parsePriceToCents(free) : 0;
    const next: Record<string, string> = {};
    if (s === null) next.shipping = 'Exemple : 15 ou 12,90';
    if (f === null) next.free = 'Exemple : 300';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form!.email)) next.email = 'Adresse email invalide.';
    if (form!.whatsapp && !/^\d{8,15}$/.test(form!.whatsapp)) next.whatsapp = 'Chiffres uniquement, avec l’indicatif : 33612345678';
    if (form!.shipping_min_days > form!.shipping_max_days) next.days = 'Le délai minimum doit être inférieur au maximum.';
    setErrors(next);
    if (Object.keys(next).length) { setToast({ msg: 'Quelques champs sont à corriger.', tone: 'error' }); setTimeout(() => setToast(null), 3000); return; }
    setSaving(true);
    try {
      await saveSettings({ ...form!, shipping_cents: s!, free_shipping_from_cents: f! });
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
    <form onSubmit={submit} noValidate className="max-w-3xl">
      <h1 className="font-display text-3xl text-nuit">Réglages de la boutique</h1>
      <p className="text-stone-500 mt-1">Les changements sont visibles immédiatement sur le site.</p>

      <div className="mt-6 space-y-6">
        <Section title="Bandeau d’annonce" description="Une phrase affichée tout en haut du site : promotion, fermeture pour congés, nouvelle collection…">
          <Toggle checked={form.announcement_active} onChange={(v) => set('announcement_active', v)} title="Afficher le bandeau" />
          <Field label="Texte du bandeau" counter={{ value: form.announcement.length, max: 120 }}>
            <Input value={form.announcement} maxLength={120} onChange={(e) => set('announcement', e.target.value)} placeholder="Soldes d’hiver : −20 % sur les kilims jusqu’au 31 janvier" />
          </Field>
          {form.announcement_active && form.announcement && (
            <p className="bg-nuit text-laine text-center text-sm px-4 py-2.5 rounded">{form.announcement}</p>
          )}
        </Section>

        <Section title="Livraison" description="Utilisé dans le panier, sur les fiches produit et au moment du paiement.">
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Frais de livraison" required error={errors.shipping} hint="0 pour une livraison toujours gratuite.">
              <UnitInput unit="€" inputMode="decimal" value={shipping} invalid={!!errors.shipping} onChange={(e) => setShipping(e.target.value)} />
            </Field>
            <Field label="Livraison offerte à partir de" optional error={errors.free}
              hint={free.trim() && parsePriceToCents(free) ? `Offerte pour un panier de ${formatPrice(parsePriceToCents(free)!)} ou plus.` : 'Laissez vide : jamais offerte.'}>
              <UnitInput unit="€" inputMode="decimal" value={free} invalid={!!errors.free} onChange={(e) => setFree(e.target.value)} />
            </Field>
            <Field label="Délai minimum" hint="En jours ouvrés." error={errors.days}>
              <div><Stepper label="Délai minimum" value={form.shipping_min_days} min={1} max={60} onChange={(v) => set('shipping_min_days', v)} /></div>
            </Field>
            <Field label="Délai maximum" hint="En jours ouvrés.">
              <div><Stepper label="Délai maximum" value={form.shipping_max_days} min={1} max={60} onChange={(v) => set('shipping_max_days', v)} /></div>
            </Field>
          </div>
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
  );
}
