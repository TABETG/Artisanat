import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ImagePlus, X } from 'lucide-react';
import { adminListProducts, saveProduct, uploadProductImage } from '../../lib/api';
import { centsToInput, parsePriceToCents } from '../../lib/format';
import { CATEGORIES } from '../../config';
import { ProductInput } from '../../types';
import { Field, Input, Select, Textarea, Toast } from './ui';

const EMPTY: ProductInput = {
  name: '', description: '', category: 'tapis', price_cents: 0, stock: 1,
  width_cm: null, length_cm: null, material: 'Laine de mouton', origin: '',
  images: [], featured: false, active: true,
};

export function AdminProductForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ProductInput>(EMPTY);
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [uploading, setUploading] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ msg: string; tone: 'ok' | 'error' } | null>(null);

  useEffect(() => {
    if (isNew) return;
    adminListProducts().then((list) => {
      const p = list.find((x) => x.id === id);
      if (!p) { navigate('/admin', { replace: true }); return; }
      const { id: _id, created_at: _c, ...rest } = p;
      void _id; void _c;
      setForm(rest);
      setPrice(centsToInput(p.price_cents));
      setLoading(false);
    });
  }, [id, isNew, navigate]);

  const set = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) => setForm((f) => ({ ...f, [key]: value }));
  const toInt = (v: string) => (v.trim() === '' ? null : Math.max(0, parseInt(v, 10) || 0));

  async function addPhotos(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'));
    e.target.value = '';
    if (!files.length) return;
    setUploading((n) => n + files.length);
    for (const file of files) {
      try {
        const url = await uploadProductImage(file);
        setForm((f) => ({ ...f, images: [...f.images, url] }));
      } catch {
        setToast({ msg: `La photo « ${file.name} » n’a pas pu être envoyée.`, tone: 'error' });
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  function movePhoto(index: number, delta: number) {
    setForm((f) => {
      const images = [...f.images];
      const target = index + delta;
      if (target < 0 || target >= images.length) return f;
      [images[index], images[target]] = [images[target], images[index]];
      return { ...f, images };
    });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const cents = parsePriceToCents(price);
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = 'Donnez un nom au produit.';
    if (cents === null || cents <= 0) next.price = 'Indiquez un prix, par exemple 450 ou 89,90.';
    if (form.images.length === 0) next.images = 'Ajoutez au moins une photo : c’est ce qui fait vendre.';
    setErrors(next);
    if (Object.keys(next).length) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }

    setSaving(true);
    try {
      await saveProduct({ ...form, name: form.name.trim(), price_cents: cents! }, id);
      navigate('/admin', { replace: true });
    } catch (err) {
      setToast({ msg: `Enregistrement impossible : ${err instanceof Error ? err.message : 'erreur'}`, tone: 'error' });
      setSaving(false);
    }
  }

  if (loading) return <p className="text-stone-500">Chargement…</p>;

  return (
    <form onSubmit={submit} className="max-w-2xl">
      <Link to="/admin" className="text-stone-500 hover:text-encre text-sm">← Retour aux produits</Link>
      <h1 className="font-display text-3xl text-nuit mt-2">{isNew ? 'Ajouter un produit' : 'Modifier le produit'}</h1>

      {/* Photos */}
      <section className="mt-8 bg-white rounded-md p-5">
        <h2 className="font-medium text-lg">Photos</h2>
        <p className="text-sm text-stone-500">La première photo est celle affichée dans la boutique. Utilisez les flèches pour changer l’ordre.</p>
        <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-3">
          {form.images.map((src, i) => (
            <div key={src} className="relative group">
              <img src={src} alt={`Photo ${i + 1}`} className="w-full aspect-[4/5] object-cover rounded" />
              {i === 0 && <span className="absolute top-1.5 left-1.5 bg-nuit text-laine text-xs px-2 py-0.5 rounded">Principale</span>}
              <button type="button" onClick={() => set('images', form.images.filter((x) => x !== src))}
                className="absolute top-1.5 right-1.5 bg-white/90 rounded-full p-1.5 hover:bg-garance hover:text-white" aria-label="Retirer cette photo">
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-1.5 inset-x-1.5 flex justify-between">
                <button type="button" onClick={() => movePhoto(i, -1)} disabled={i === 0} className="bg-white/90 rounded-full p-1.5 disabled:invisible" aria-label="Déplacer à gauche"><ArrowLeft className="w-4 h-4" /></button>
                <button type="button" onClick={() => movePhoto(i, 1)} disabled={i === form.images.length - 1} className="bg-white/90 rounded-full p-1.5 disabled:invisible" aria-label="Déplacer à droite"><ArrowRight className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {Array.from({ length: uploading }).map((_, i) => (
            <div key={`u${i}`} className="aspect-[4/5] rounded bg-stone-100 animate-pulse flex items-center justify-center text-sm text-stone-500">Envoi…</div>
          ))}
          <button type="button" onClick={() => fileInput.current?.click()}
            className="aspect-[4/5] rounded border-2 border-dashed border-stone-300 hover:border-nuit flex flex-col items-center justify-center gap-2 text-stone-600">
            <ImagePlus className="w-8 h-8" />
            <span className="text-sm text-center px-2">Ajouter des photos</span>
          </button>
        </div>
        <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={addPhotos} />
        {errors.images && <p className="text-sm text-garance mt-2" role="alert">{errors.images}</p>}
      </section>

      {/* Informations */}
      <section className="mt-5 bg-white rounded-md p-5 space-y-5">
        <Field label="Nom du produit" error={errors.name}>
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex. : Tapis Beni Ouarain écru" maxLength={200} />
        </Field>

        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Prix (€)" error={errors.price}>
            <Input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="450" />
          </Field>
          <Field label="Quantité disponible" hint="1 pour une pièce unique. 0 = affiché comme vendu.">
            <Input type="number" min={0} value={form.stock} onChange={(e) => set('stock', toInt(e.target.value) ?? 0)} />
          </Field>
        </div>

        <Field label="Catégorie">
          <Select value={form.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-5">
          <Field label="Largeur (cm)">
            <Input type="number" min={1} value={form.width_cm ?? ''} onChange={(e) => set('width_cm', toInt(e.target.value))} placeholder="160" />
          </Field>
          <Field label="Longueur (cm)">
            <Input type="number" min={1} value={form.length_cm ?? ''} onChange={(e) => set('length_cm', toInt(e.target.value))} placeholder="240" />
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Matière">
            <Input value={form.material} onChange={(e) => set('material', e.target.value)} />
          </Field>
          <Field label="Origine" hint="Région ou atelier (facultatif)">
            <Input value={form.origin} onChange={(e) => set('origin', e.target.value)} placeholder="Moyen Atlas" />
          </Field>
        </div>

        <Field label="Description" hint="Couleurs, motifs, épaisseur, histoire de la pièce…">
          <Textarea rows={6} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
      </section>

      {/* Affichage */}
      <section className="mt-5 bg-white rounded-md p-5 space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} className="mt-1 w-5 h-5 accent-emerald-700" />
          <span><span className="font-medium">En ligne</span><span className="block text-sm text-stone-500">Décochez pour préparer le produit sans le montrer.</span></span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} className="mt-1 w-5 h-5 accent-emerald-700" />
          <span><span className="font-medium">Mettre en avant sur l’accueil</span><span className="block text-sm text-stone-500">Apparaît en premier sur la page d’accueil.</span></span>
        </label>
      </section>

      <div className="sticky bottom-0 mt-6 -mx-4 px-4 py-4 bg-stone-100/95 backdrop-blur flex gap-3">
        <button disabled={saving || uploading > 0} className="flex-1 sm:flex-none bg-garance text-laine px-8 py-3.5 rounded-md text-lg hover:bg-nuit disabled:opacity-60">
          {saving ? 'Enregistrement…' : uploading > 0 ? 'Photos en cours d’envoi…' : 'Enregistrer le produit'}
        </button>
        <Link to="/admin" className="px-6 py-3.5 rounded-md border border-stone-300 bg-white">Annuler</Link>
      </div>
      <Toast message={toast?.msg ?? null} tone={toast?.tone} />
    </form>
  );
}
