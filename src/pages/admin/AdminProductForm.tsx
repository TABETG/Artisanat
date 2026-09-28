import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Copy, ExternalLink, ImagePlus, Star, Trash2, X } from 'lucide-react';
import {
  adminListProducts, adminListStockAlerts, deleteProduct, duplicateProduct, saveProduct, uploadProductImage,
} from '../../lib/api';
import { centsToInput, formatPrice, parsePriceToCents } from '../../lib/format';
import { COLORS, TECHNIQUES } from '../../config';
import { useCategories } from '../../context/SettingsContext';
import { Product, ProductInput } from '../../types';
import { Field, Input, Section, Select, Stepper, Textarea, Toast, Toggle, UnitInput } from './ui';
import { ProductCard } from '../../components/ProductCard';
import { RestockModal, restockMessage } from './RestockModal';
import { MANUAL_BADGES } from '../../badges';
import { useBadges } from '../../context/BadgesContext';
import { BadgePill } from '../../components/ProductBadges';

const EMPTY: ProductInput = {
  name: '', description: '', category: 'tapis', price_cents: 0, stock: 1,
  width_cm: null, length_cm: null, material: 'Laine de mouton', origin: '',
  images: [], featured: false, active: true,
  reference: '', compare_at_price_cents: null, technique: 'Noué main', colors: [],
  pile_height_mm: null, weight_kg: null, care: '', made_to_order: false, low_stock_threshold: 2,
  badges: [], promo_ends_at: null, sales_count: 0,
  publish_at: null, views_count: 0, cart_adds_count: 0,
};

const NAME_MAX = 120;
const DESC_MAX = 2000;

export function AdminProductForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const { categories } = useCategories();
  const { badgesFor } = useBadges();

  const [form, setForm] = useState<ProductInput>(EMPTY);
  const snapshot = (f: ProductInput, p: string, o: string, w: string) => JSON.stringify([f, p, o, w]);
  const [original, setOriginal] = useState<string>(snapshot(EMPTY, '', '', ''));
  const [originalStock, setOriginalStock] = useState(0);
  const [price, setPrice] = useState('');
  const [oldPrice, setOldPrice] = useState('');
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [uploading, setUploading] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ msg: string; tone: 'ok' | 'error' } | null>(null);
  const [restock, setRestock] = useState<{ product: Product; waiting: number } | null>(null);

  const flash = (msg: string, tone: 'ok' | 'error' = 'ok') => { setToast({ msg, tone }); setTimeout(() => setToast(null), 3500); };

  // Chargement du produit à modifier
  useEffect(() => {
    if (isNew) { setForm(EMPTY); setPrice(''); setOldPrice(''); setWeight(''); setOriginal(snapshot(EMPTY, '', '', '')); return; }
    adminListProducts().then((list) => {
      const p = list.find((x) => x.id === id);
      if (!p) { navigate('/admin/produits', { replace: true }); return; }
      const { id: _id, created_at: _c, ...rest } = p;
      void _id; void _c;
      const normalized = { ...EMPTY, ...rest };
      const pr = centsToInput(p.price_cents);
      const op = p.compare_at_price_cents ? centsToInput(p.compare_at_price_cents) : '';
      const wg = p.weight_kg ? String(p.weight_kg).replace('.', ',') : '';
      setForm(normalized); setPrice(pr); setOldPrice(op); setWeight(wg);
      setOriginal(snapshot(normalized, pr, op, wg));
      setOriginalStock(p.stock);
      setLoading(false);
    });
  }, [id, isNew, navigate]);

  const priceCents = parsePriceToCents(price);
  const oldPriceCents = oldPrice.trim() ? parsePriceToCents(oldPrice) : null;
  const discount = priceCents && oldPriceCents && oldPriceCents > priceCents
    ? Math.round((1 - priceCents / oldPriceCents) * 100) : null;
  const surface = form.width_cm && form.length_cm ? (form.width_cm * form.length_cm) / 10000 : null;
  const dirty = snapshot(form, price, oldPrice, weight) !== original;

  // Avertit avant de quitter la page avec des modifications non enregistrées
  useEffect(() => {
    if (!dirty || saving) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty, saving]);

  const set = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => { const n = { ...e }; delete n[key as string]; return n; });
  };
  const toInt = (v: string) => (v.trim() === '' ? null : Math.max(0, parseInt(v, 10) || 0));

  // ---------- Photos ----------
  async function addFiles(files: File[]) {
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (!images.length) return;
    setErrors((e) => { const n = { ...e }; delete n.images; return n; });
    setUploading((n) => n + images.length);
    for (const file of images) {
      try {
        const url = await uploadProductImage(file);
        setForm((f) => ({ ...f, images: [...f.images, url] }));
      } catch {
        flash(`La photo « ${file.name} » n’a pas pu être envoyée.`, 'error');
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }
  const onPick = (e: ChangeEvent<HTMLInputElement>) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ''; };
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDragging(false); addFiles(Array.from(e.dataTransfer.files)); };

  function movePhoto(index: number, target: number) {
    setForm((f) => {
      if (target < 0 || target >= f.images.length) return f;
      const images = [...f.images];
      const [moved] = images.splice(index, 1);
      images.splice(target, 0, moved);
      return { ...f, images };
    });
  }

  function toggleColor(colorId: string) {
    set('colors', form.colors.includes(colorId) ? form.colors.filter((c) => c !== colorId) : [...form.colors, colorId]);
  }

  function generateReference() {
    const cat = form.category.slice(0, 3).toUpperCase();
    const word = form.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z ]/g, '').split(' ')
      .filter((w) => w.length > 3)[0]?.slice(0, 3).toUpperCase() ?? 'ART';
    set('reference', `${cat}-${word}-${String(Date.now()).slice(-4)}`);
  }

  // ---------- Validation et enregistrement ----------
  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = 'Donnez un nom au produit.';
    else if (form.name.length > NAME_MAX) next.name = `${NAME_MAX} caractères maximum.`;
    if (priceCents === null || priceCents <= 0) next.price = 'Indiquez un prix, par exemple 450 ou 89,90.';
    if (oldPrice.trim() && (oldPriceCents === null || (priceCents !== null && oldPriceCents <= priceCents))) {
      next.oldPrice = 'L’ancien prix doit être plus élevé que le prix de vente.';
    }
    if (weight.trim() && !/^\d+([.,]\d{1,2})?$/.test(weight.trim())) next.weight = 'Exemple : 8,5';
    if (form.images.length === 0) next.images = 'Ajoutez au moins une photo : c’est ce qui fait vendre.';
    if (form.description.length > DESC_MAX) next.description = `${DESC_MAX} caractères maximum.`;
    return next;
  }

  async function submit(e: FormEvent, andNew = false) {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) {
      flash('Quelques champs sont à compléter (en rouge).', 'error');
      const first = ['images', 'name', 'price', 'oldPrice', 'weight', 'description'].find((k) => next[k]);
      document.getElementById(`champ-${first}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSaving(true);
    try {
      const saved = await saveProduct({
        ...form,
        name: form.name.trim(),
        reference: form.reference.trim(),
        price_cents: priceCents!,
        compare_at_price_cents: oldPriceCents,
        promo_ends_at: oldPriceCents ? form.promo_ends_at : null,
        weight_kg: weight.trim() ? parseFloat(weight.replace(',', '.')) : null,
      }, id);

      // Retour en stock avec des clients en attente → proposer de les prévenir
      if (!isNew && originalStock === 0 && saved.stock > 0 && saved.active) {
        const waiting = (await adminListStockAlerts()).filter((a) => a.product_id === saved.id && !a.notified).length;
        if (waiting > 0) { setOriginal(snapshot(form, price, oldPrice, weight)); setRestock({ product: saved, waiting }); setSaving(false); return; }
      }
      if (andNew) {
        setSaving(false);
        navigate('/admin/produits/nouveau', { replace: true });
        setForm({ ...EMPTY, category: form.category, technique: form.technique, material: form.material, origin: form.origin });
        setPrice(''); setOldPrice(''); setWeight(''); setErrors({});
        setOriginal(snapshot({ ...EMPTY, category: form.category, technique: form.technique, material: form.material, origin: form.origin }, '', '', ''));
        window.scrollTo({ top: 0, behavior: 'smooth' });
        flash(`« ${saved.name} » enregistré. Vous pouvez ajouter le suivant.`);
        return;
      }
      navigate('/admin/produits', { replace: true, state: { flash: isNew ? `« ${saved.name} » ajouté à la boutique` : 'Modifications enregistrées' } });
    } catch (err) {
      flash(`Enregistrement impossible : ${err instanceof Error ? err.message : 'erreur'}`, 'error');
      setSaving(false);
    }
  }

  async function onDuplicate() {
    if (!id) return;
    const list = await adminListProducts();
    const p = list.find((x) => x.id === id);
    if (!p) return;
    const copy = await duplicateProduct(p);
    navigate(`/admin/produits/${copy.id}`, { replace: true });
    flash('Copie créée (masquée de la boutique). Modifiez-la puis mettez-la en ligne.');
  }

  async function onDelete() {
    if (!id) return;
    if (!confirm(`Supprimer définitivement « ${form.name} » ?\n\nPour le retirer temporairement, désactivez plutôt « En ligne ».`)) return;
    const list = await adminListProducts();
    const p = list.find((x) => x.id === id);
    if (p) await deleteProduct(p);
    navigate('/admin/produits', { replace: true, state: { flash: 'Produit supprimé' } });
  }

  function cancel() {
    if (dirty && !confirm('Quitter sans enregistrer vos modifications ?')) return;
    navigate('/admin/produits');
  }

  // Aperçu tel qu'il apparaîtra dans la boutique
  const preview: Product = useMemo(() => ({
    ...form, id: id ?? 'apercu', created_at: new Date().toISOString(),
    name: form.name || 'Nom du produit', price_cents: priceCents ?? 0, compare_at_price_cents: oldPriceCents,
  }), [form, id, priceCents, oldPriceCents]);

  if (loading) return <p className="text-stone-500">Chargement…</p>;

  return (
    <form onSubmit={(e) => submit(e)} noValidate>
      <button type="button" onClick={cancel} className="text-stone-500 hover:text-encre text-sm">← Retour aux produits</button>
      <div className="flex flex-wrap items-center gap-3 mt-2">
        <h1 className="font-display text-3xl text-nuit mr-auto">{isNew ? 'Ajouter un produit' : 'Modifier le produit'}</h1>
        {!isNew && (
          <>
            {form.active && <Link to={`/produit/${id}`} target="_blank" className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-md border border-stone-300 bg-white"><ExternalLink className="w-4 h-4" /> Voir sur la boutique</Link>}
            <button type="button" onClick={onDuplicate} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-md border border-stone-300 bg-white"><Copy className="w-4 h-4" /> Dupliquer</button>
            <button type="button" onClick={onDelete} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-md border border-garance/40 text-garance bg-white"><Trash2 className="w-4 h-4" /> Supprimer</button>
          </>
        )}
      </div>
      <p className="text-sm text-stone-500 mt-1">Les champs marqués <span className="text-garance">*</span> sont obligatoires.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px] items-start">
        <div className="space-y-6 min-w-0">
          {/* ---------- Photos ---------- */}
          <Section id="champ-images" title="Photos *" description="La première photo est celle affichée dans la boutique. Conseil : lumière du jour, une photo entière, un gros plan des nœuds, le dos du tapis.">
            <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
              className={`rounded-lg p-2 -m-2 ${dragging ? 'bg-emerald-50 ring-2 ring-emerald-600' : ''}`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {form.images.map((src, i) => (
                  <figure key={src} className="relative rounded-md overflow-hidden border border-stone-200 bg-stone-50">
                    <img src={src} alt={`Photo ${i + 1}`} className="w-full aspect-[4/5] object-cover" />
                    <span className={`absolute top-2 left-2 text-xs px-2 py-1 rounded ${i === 0 ? 'bg-nuit text-laine' : 'bg-white/90 text-encre'}`}>
                      {i === 0 ? 'Photo principale' : `Photo ${i + 1}`}
                    </span>
                    <button type="button" onClick={() => set('images', form.images.filter((x) => x !== src))}
                      className="absolute top-2 right-2 bg-white/95 rounded-full p-1.5 shadow hover:bg-garance hover:text-white" aria-label={`Retirer la photo ${i + 1}`}>
                      <X className="w-4 h-4" />
                    </button>
                    <figcaption className="absolute bottom-0 inset-x-0 flex items-center justify-between gap-1 p-1.5 bg-gradient-to-t from-black/50 to-transparent">
                      <button type="button" onClick={() => movePhoto(i, i - 1)} disabled={i === 0} className="bg-white/95 rounded-full p-1.5 disabled:invisible" aria-label="Déplacer avant"><ArrowLeft className="w-4 h-4" /></button>
                      {i > 0 && (
                        <button type="button" onClick={() => movePhoto(i, 0)} className="bg-white/95 rounded-full px-2 py-1 text-xs inline-flex items-center gap-1" aria-label="Mettre en photo principale">
                          <Star className="w-3.5 h-3.5" /> Principale
                        </button>
                      )}
                      <button type="button" onClick={() => movePhoto(i, i + 1)} disabled={i === form.images.length - 1} className="bg-white/95 rounded-full p-1.5 disabled:invisible" aria-label="Déplacer après"><ArrowRight className="w-4 h-4" /></button>
                    </figcaption>
                  </figure>
                ))}
                {Array.from({ length: uploading }).map((_, i) => (
                  <div key={`u${i}`} className="aspect-[4/5] rounded-md bg-stone-100 animate-pulse flex items-center justify-center text-sm text-stone-500">Envoi…</div>
                ))}
                <button type="button" onClick={() => fileInput.current?.click()}
                  className={`aspect-[4/5] rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-2 text-stone-600 hover:border-nuit hover:text-nuit ${errors.images ? 'border-garance' : 'border-stone-300'}`}>
                  <ImagePlus className="w-9 h-9" />
                  <span className="text-sm font-medium text-center px-2">Ajouter des photos</span>
                  <span className="text-xs text-stone-400 text-center px-2 hidden sm:block">ou glissez-les ici</span>
                </button>
              </div>
            </div>
            <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={onPick} />
            {errors.images && <p className="text-sm text-garance font-medium" role="alert">{errors.images}</p>}
          </Section>

          {/* ---------- Informations ---------- */}
          <Section title="Informations principales">
            <div id="champ-name">
              <Field label="Nom du produit" required error={errors.name} counter={{ value: form.name.length, max: NAME_MAX }}
                hint="Soyez précis : type, motif, couleur. Ex. : Tapis Beni Ouarain écru à losanges bruns">
                <Input value={form.name} invalid={!!errors.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex. : Tapis Azilal multicolore" />
              </Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Catégorie" required>
                <Select value={form.category} onChange={(e) => set('category', e.target.value)}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  {!categories.some((c) => c.id === form.category) && <option value={form.category}>{form.category} (catégorie supprimée)</option>}
                </Select>
              </Field>
              <Field label="Référence" optional hint="Pour retrouver la pièce dans votre atelier.">
                <div className="flex gap-2">
                  <Input value={form.reference} onChange={(e) => set('reference', e.target.value.toUpperCase())} placeholder="TAP-BEN-012" />
                  <button type="button" onClick={generateReference} className="shrink-0 px-3 rounded-md border border-stone-300 text-sm hover:bg-stone-50">Générer</button>
                </div>
              </Field>
            </div>
            <div id="champ-description">
              <Field label="Description" optional error={errors.description} counter={{ value: form.description.length, max: DESC_MAX }}
                hint="Couleurs, motifs, toucher, histoire de la pièce, pièce idéale (salon, chambre…). Un saut de ligne crée un paragraphe.">
                <Textarea rows={7} value={form.description} invalid={!!errors.description} onChange={(e) => set('description', e.target.value)}
                  placeholder="Tissé à la main dans notre atelier, ce tapis en pure laine…" />
              </Field>
            </div>
          </Section>

          {/* ---------- Prix et stock ---------- */}
          <Section title="Prix et stock">
            <div className="grid sm:grid-cols-2 gap-5">
              <div id="champ-price">
                <Field label="Prix de vente" required error={errors.price} hint="TTC, tel que le client le paiera.">
                  <UnitInput unit="€" inputMode="decimal" value={price} invalid={!!errors.price}
                    onChange={(e) => { setPrice(e.target.value); setErrors((x) => ({ ...x, price: '' })); }} placeholder="450" />
                </Field>
              </div>
              <div id="champ-oldPrice" className="space-y-4">
                <Field label="Ancien prix (promotion)" optional error={errors.oldPrice}
                  hint={discount ? `Affiché barré, avec le badge « −${discount} % ».` : 'Laissez vide s’il n’y a pas de promotion.'}>
                  <UnitInput unit="€" inputMode="decimal" value={oldPrice} invalid={!!errors.oldPrice}
                    onChange={(e) => { setOldPrice(e.target.value); setErrors((x) => ({ ...x, oldPrice: '' })); }} placeholder="520" />
                </Field>
                {oldPrice.trim() && (
                  <Field label="Fin de la promotion" optional
                    hint={form.promo_ends_at ? 'Le lendemain, le prix d’origine revient tout seul. Un badge « Fin dans X jours » s’affiche la dernière semaine.' : 'Laissez vide pour une promotion sans date de fin.'}>
                    <div className="flex gap-2">
                      <Input type="date" min={new Date().toISOString().slice(0, 10)}
                        value={form.promo_ends_at ? toLocalDate(form.promo_ends_at) : ''}
                        onChange={(e) => set('promo_ends_at', e.target.value ? new Date(`${e.target.value}T23:59:59`).toISOString() : null)} />
                      {form.promo_ends_at && <button type="button" onClick={() => set('promo_ends_at', null)} className="shrink-0 px-3 rounded-md border border-stone-300 text-sm">Effacer</button>}
                    </div>
                  </Field>
                )}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Quantité disponible" required
                hint={form.stock === 0 ? 'À 0, le produit affiche « Rupture de stock » et les clients peuvent demander à être prévenus.' : form.stock === 1 ? 'Affiché « Pièce unique ».' : undefined}>
                <div><Stepper label="Quantité" value={form.stock} onChange={(v) => set('stock', v)} /></div>
              </Field>
              <Field label="Alerte stock bas à partir de" hint="Vous êtes averti quand il en reste ce nombre ou moins.">
                <div><Stepper label="Seuil d’alerte" value={form.low_stock_threshold} onChange={(v) => set('low_stock_threshold', v)} max={50} /></div>
              </Field>
            </div>
            <Toggle checked={form.made_to_order} onChange={(v) => set('made_to_order', v)}
              title="Fabrication sur mesure possible" description="Affiche un bouton « Demander un modèle sur mesure » sur la fiche produit." />
          </Section>

          {/* ---------- Badges ---------- */}
          <Section title="Badges" description="De petites étiquettes sur la photo qui attirent l’œil. Choisissez-en une ou deux au maximum pour rester lisible.">
            <div className="grid sm:grid-cols-2 gap-2">
              {MANUAL_BADGES.map((b) => {
                const on = form.badges.includes(b.id);
                return (
                  <button key={b.id} type="button" aria-pressed={on}
                    onClick={() => set('badges', on ? form.badges.filter((x) => x !== b.id) : [...form.badges, b.id])}
                    className={`text-left flex items-start gap-3 p-3 rounded-md border ${on ? 'border-nuit ring-1 ring-nuit bg-nuit/5' : 'border-stone-200 hover:border-stone-400'}`}>
                    <input type="checkbox" readOnly checked={on} tabIndex={-1} className="mt-1 w-4 h-4 accent-nuit pointer-events-none" />
                    <span>
                      <BadgePill badge={{ id: b.id, label: b.label, tone: b.tone, auto: false }} size="sm" />
                      <span className="block text-sm text-stone-500 mt-1">{b.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="bg-stone-50 rounded-md p-4">
              <p className="text-sm font-medium">Badges ajoutés automatiquement</p>
              <p className="text-sm text-stone-500 mt-0.5">« −X % » (ancien prix), « Fin dans X jours », « Meilleure vente » (3 produits les plus vendus), « Nouveauté », « Pièce unique », « Plus que X », « Rupture de stock ».</p>
              {(() => {
                const auto = badgesFor(preview).filter((b) => b.auto);
                return auto.length > 0 && <p className="mt-3 flex flex-wrap gap-2 items-center"><span className="text-sm text-stone-500">Pour ce produit :</span>{auto.map((b) => <BadgePill key={b.id} badge={b} size="sm" />)}</p>;
              })()}
            </div>
          </Section>

          {/* ---------- Caractéristiques ---------- */}
          <Section title="Caractéristiques" description="Ces informations rassurent l’acheteur et apparaissent dans la fiche produit.">
            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Largeur" optional>
                <UnitInput unit="cm" type="number" min={1} value={form.width_cm ?? ''} onChange={(e) => set('width_cm', toInt(e.target.value))} placeholder="160" />
              </Field>
              <Field label="Longueur" optional hint={surface ? `Surface : ${surface.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} m²` : undefined}>
                <UnitInput unit="cm" type="number" min={1} value={form.length_cm ?? ''} onChange={(e) => set('length_cm', toInt(e.target.value))} placeholder="240" />
              </Field>
              <Field label="Hauteur des poils" optional>
                <UnitInput unit="mm" type="number" min={0} value={form.pile_height_mm ?? ''} onChange={(e) => set('pile_height_mm', toInt(e.target.value))} placeholder="20" />
              </Field>
              <div id="champ-weight">
                <Field label="Poids" optional error={errors.weight}>
                  <UnitInput unit="kg" inputMode="decimal" value={weight} invalid={!!errors.weight} onChange={(e) => setWeight(e.target.value)} placeholder="8,5" />
                </Field>
              </div>
              <Field label="Technique">
                <Select value={form.technique} onChange={(e) => set('technique', e.target.value)}>
                  <option value="">Non précisée</option>
                  {TECHNIQUES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </Field>
              <Field label="Matière">
                <Input value={form.material} onChange={(e) => set('material', e.target.value)} placeholder="Laine de mouton" />
              </Field>
              <Field label="Origine" optional hint="Région, village ou atelier.">
                <Input value={form.origin} onChange={(e) => set('origin', e.target.value)} placeholder="Moyen Atlas" />
              </Field>
            </div>

            <fieldset>
              <legend className="font-medium text-[15px] mb-1.5">Couleurs <span className="font-normal text-stone-500 text-sm">(facultatif — permet aux clients de filtrer)</span></legend>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => {
                  const on = form.colors.includes(c.id);
                  return (
                    <button key={c.id} type="button" onClick={() => toggleColor(c.id)} aria-pressed={on}
                      className={`inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border text-sm ${on ? 'border-nuit bg-nuit text-laine' : 'border-stone-300 bg-white hover:border-stone-500'}`}>
                      <span className="w-5 h-5 rounded-full border border-black/10" style={{ background: c.hex }} />
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <Field label="Conseils d’entretien" optional hint="Laissez vide pour afficher les conseils généraux.">
              <Textarea rows={3} value={form.care} onChange={(e) => set('care', e.target.value)} placeholder="Aspirateur sans brosse rotative…" />
            </Field>
          </Section>
        </div>

        {/* ---------- Colonne de droite : visibilité + aperçu ---------- */}
        <aside className="space-y-6 lg:sticky lg:top-6">
          <Section title="Visibilité">
            <Toggle checked={form.active} onChange={(v) => set('active', v)} title="En ligne"
              description={form.active ? 'Visible et achetable sur la boutique.' : 'Masqué : vous pouvez le préparer tranquillement.'} />
            {form.active && (
              <Field label="Mise en ligne programmée" optional
                hint={form.publish_at && new Date(form.publish_at) > new Date() ? `Invisible pour les clients jusqu’au ${new Date(form.publish_at).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}.` : 'Pour préparer une nouvelle collection à l’avance.'}>
                <div className="flex gap-2">
                  <Input type="datetime-local" value={form.publish_at ? toLocalDateTime(form.publish_at) : ''}
                    onChange={(e) => set('publish_at', e.target.value ? new Date(e.target.value).toISOString() : null)} />
                  {form.publish_at && <button type="button" onClick={() => set('publish_at', null)} className="shrink-0 px-3 rounded-md border border-stone-300 text-sm">Effacer</button>}
                </div>
              </Field>
            )}
            <Toggle checked={form.featured} onChange={(v) => set('featured', v)} title="Mettre en avant"
              description="Affiché en premier sur la page d’accueil." />
          </Section>
          {!isNew && (
            <div className="bg-white rounded-lg border border-stone-200 p-5 grid grid-cols-3 gap-2 text-center">
              <div><p className="font-display text-2xl text-nuit">{form.views_count}</p><p className="text-xs text-stone-500">vues</p></div>
              <div><p className="font-display text-2xl text-nuit">{form.cart_adds_count}</p><p className="text-xs text-stone-500">ajouts au panier</p></div>
              <div><p className="font-display text-2xl text-nuit">{form.sales_count}</p><p className="text-xs text-stone-500">vendus</p></div>
            </div>
          )}
          <div className="bg-white rounded-lg border border-stone-200 p-5">
            <p className="text-sm font-medium text-stone-500 mb-3">Aperçu dans la boutique</p>
            <div className="pointer-events-none"><ProductCard product={preview} /></div>
            {priceCents !== null && priceCents > 0 && (
              <p className="text-xs text-stone-500 mt-3">Vous recevrez environ {formatPrice(Math.round(priceCents * 0.985 - 25))} après la commission Stripe (carte européenne).</p>
            )}
          </div>
        </aside>
      </div>

      {/* Barre d'enregistrement toujours visible */}
      <div className="sticky bottom-0 z-30 mt-8 -mx-4 px-4 py-3 bg-stone-100/95 backdrop-blur border-t border-stone-200 flex flex-wrap items-center gap-3">
        <button disabled={saving || uploading > 0} className="flex-1 sm:flex-none bg-garance text-laine px-8 py-3.5 rounded-md text-lg hover:bg-nuit disabled:opacity-60">
          {saving ? 'Enregistrement…' : uploading > 0 ? 'Photos en cours d’envoi…' : isNew ? 'Ajouter à la boutique' : 'Enregistrer les modifications'}
        </button>
        {isNew && (
          <button type="button" disabled={saving || uploading > 0} onClick={(e) => submit(e, true)}
            className="px-5 py-3.5 rounded-md border border-stone-300 bg-white disabled:opacity-60">Enregistrer et ajouter un autre</button>
        )}
        <button type="button" onClick={cancel} className="px-5 py-3.5 rounded-md text-stone-600 hover:text-encre">Annuler</button>
        {dirty && !saving && <span className="text-sm text-henne ml-auto hidden sm:inline">Modifications non enregistrées</span>}
      </div>

      {restock && (
        <RestockModal productId={restock.product.id} productName={restock.product.name} waiting={restock.waiting}
          onClose={(result) => navigate('/admin/produits', { replace: true, state: { flash: result ? restockMessage(result) : 'Modifications enregistrées' } })} />
      )}
      <Toast message={toast?.msg ?? null} tone={toast?.tone} />
    </form>
  );
}

function toLocalDateTime(iso: string): string {
  const d = new Date(iso);
  return `${toLocalDate(iso)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Date ISO → « AAAA-MM-JJ » à l'heure locale, pour le champ date. */
function toLocalDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
