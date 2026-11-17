import { FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { createCustomRequest, getProduct } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { ProductImage } from '../components/ProductImage';

const ROOMS = ['Salon', 'Chambre', 'Salle à manger', 'Entrée / couloir', 'Bureau', 'Chambre d’enfant', 'Autre'];
const BUDGETS = ['Moins de 500 €', '500 à 1 000 €', '1 000 à 1 500 €', '1 500 à 2 500 €', 'Plus de 2 500 €', 'Je ne sais pas encore'];

export function CustomOrderPage() {
  const [params] = useSearchParams();
  const productId = params.get('produit');
  const { data: product } = useAsync(() => (productId ? getProduct(productId) : Promise.resolve(null)), [productId]);
  const [f, setF] = useState({ name: '', email: '', phone: '', room: '', width: '', length: '', colors: '', budget: '', message: '' });
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v });
  const num = (v: string) => (v.trim() ? parseInt(v, 10) || null : null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState('sending'); setError(null);
    try {
      await createCustomRequest({
        name: f.name, email: f.email, phone: f.phone.trim() || null, product_id: product?.id ?? null, room: f.room || null,
        width_cm: num(f.width), length_cm: num(f.length), colors: f.colors.trim() || null, budget: f.budget || null, message: f.message,
      });
      setState('done');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
      setState('idle');
    }
  }

  const input = 'w-full px-3.5 py-3 bg-white border border-laine-fonce rounded-sm';

  if (state === 'done') {
    return (
      <div className="max-w-2xl mx-auto px-5 pt-20 text-center">
        <Check className="w-12 h-12 mx-auto text-emerald-700" />
        <h1 className="font-display text-4xl text-nuit mt-4">Demande bien reçue</h1>
        <p className="mt-4 text-lg">Nous étudions votre projet et vous répondons sous 48 heures avec un devis et un délai de fabrication.</p>
        <Link to="/boutique" className="inline-block mt-8 bg-nuit text-laine px-7 py-3.5 rounded-sm hover:bg-garance">Continuer la visite</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 pt-12">
      <div className="lisiere-fine w-16 mb-5" aria-hidden />
      <h1 className="font-display text-[2.8rem] sm:text-6xl md:text-7xl text-nuit">Tapis sur mesure</h1>
      <p className="lecture mt-5 text-[1.2rem] text-encre/80">Une dimension précise, vos couleurs, un motif qui vous ressemble : nous tissons la pièce pour vous. Comptez en général 4 à 10 semaines selon la taille.</p>

      {product && (
        <div className="mt-6 flex items-center gap-4 bg-white/60 border border-laine-fonce rounded-sm p-3">
          <ProductImage src={product.images[0]} alt={product.name} className="w-16 h-20 rounded-sm" />
          <p>Inspiré de : <strong>{product.name}</strong></p>
        </div>
      )}

      <form onSubmit={submit} className="mt-8 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <label><span className="font-medium block mb-1">Pièce</span>
            <select value={f.room} onChange={(e) => set('room', e.target.value)} className={input}><option value="">Choisir…</option>{ROOMS.map((r) => <option key={r}>{r}</option>)}</select></label>
          <label><span className="font-medium block mb-1">Budget</span>
            <select value={f.budget} onChange={(e) => set('budget', e.target.value)} className={input}><option value="">Choisir…</option>{BUDGETS.map((b) => <option key={b}>{b}</option>)}</select></label>
        </div>
        <div>
          <span className="font-medium block mb-1">Dimensions souhaitées</span>
          <div className="flex items-center gap-2">
            <input inputMode="numeric" value={f.width} onChange={(e) => set('width', e.target.value.replace(/\D/g, ''))} placeholder="Largeur" className={`${input} max-w-36`} aria-label="Largeur en centimètres" />
            <span>×</span>
            <input inputMode="numeric" value={f.length} onChange={(e) => set('length', e.target.value.replace(/\D/g, ''))} placeholder="Longueur" className={`${input} max-w-36`} aria-label="Longueur en centimètres" />
            <span className="text-henne">cm</span>
          </div>
        </div>
        <label className="block"><span className="font-medium block mb-1">Couleurs et motifs</span>
          <input value={f.colors} maxLength={200} onChange={(e) => set('colors', e.target.value)} placeholder="Ex. : écru avec losanges bruns, touches de rouge" className={input} /></label>
        <label className="block"><span className="font-medium block mb-1">Votre projet</span>
          <textarea rows={5} maxLength={3000} value={f.message} onChange={(e) => set('message', e.target.value)} className={input}
            placeholder="Décrivez la pièce, les meubles autour, l’ambiance recherchée… Vous pourrez nous envoyer des photos en réponse à notre email." /></label>
        <div className="grid sm:grid-cols-3 gap-4">
          <label><span className="font-medium block mb-1">Nom</span><input required maxLength={100} value={f.name} onChange={(e) => set('name', e.target.value)} className={input} autoComplete="name" /></label>
          <label><span className="font-medium block mb-1">Email</span><input required type="email" value={f.email} onChange={(e) => set('email', e.target.value)} className={input} autoComplete="email" /></label>
          <label><span className="font-medium block mb-1">Téléphone <span className="font-normal text-sm text-henne">(facultatif)</span></span><input type="tel" maxLength={40} value={f.phone} onChange={(e) => set('phone', e.target.value)} className={input} autoComplete="tel" /></label>
        </div>
        {error && <p className="text-garance" role="alert">{error}</p>}
        <button disabled={state === 'sending'} className="bg-garance text-laine px-8 py-4 rounded-sm text-lg hover:bg-nuit disabled:opacity-60">
          {state === 'sending' ? 'Envoi…' : 'Demander un devis gratuit'}
        </button>
        <p className="text-sm text-henne">Sans engagement. Vos informations servent uniquement à vous répondre.</p>
      </form>
    </div>
  );
}
