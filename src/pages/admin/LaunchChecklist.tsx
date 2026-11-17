import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Circle, Rocket } from 'lucide-react';
import { DEMO_MODE, db } from '../../lib/supabase';
import { getMfaState } from '../../lib/api';
import { SHOP } from '../../config';
import { useSettings } from '../../context/SettingsContext';
import { Product } from '../../types';

interface Health {
  stripe_key: boolean; stripe_live: boolean; stripe_webhook_secret: boolean; stripe_webhook: string; stripe_connect: boolean;
  supabase_service: boolean; emails: boolean; owner_email: boolean; custom_domain: boolean;
}

type Level = 'bloquant' | 'conseille';
interface Item { ok: boolean; level: Level; label: string; how: ReactNode }

/** « Prêt pour l'ouverture ? » : ce qui manque avant d'encaisser de vrais clients. */
export function LaunchChecklist({ products }: { products: Product[] }) {
  const { settings } = useSettings();
  const [health, setHealth] = useState<Health | null>(null);
  const [mfa, setMfa] = useState<boolean | null>(null);
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem('artisanat-lancement-masque') === '1'; } catch { return false; } });

  useEffect(() => {
    getMfaState().then((s) => setMfa(s.enabled)).catch(() => setMfa(false));
    if (DEMO_MODE) return;
    db().auth.getSession().then(({ data }) => fetch('/.netlify/functions/admin-health', { headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}` } }))
      .then((r) => (r.ok ? r.json() : null)).then(setHealth).catch(() => setHealth(null));
  }, []);

  const placeholder = (v: string) => /compléter|exemple\.fr|00 00 00 00/i.test(v);
  const exampleProducts = products.filter((p) => p.images.some((i) => i.startsWith('/exemples/')));
  const items: Item[] = [
    { ok: !DEMO_MODE, level: 'bloquant', label: 'Boutique reliée à Supabase', how: <>Étapes 1 et 3 du guide : variables <code>VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_ANON_KEY</code> dans Netlify.</> },
    { ok: !!health?.supabase_service, level: 'bloquant', label: 'Clé serveur Supabase', how: <>Variable <code>SUPABASE_SERVICE_ROLE_KEY</code> dans Netlify.</> },
    { ok: !!health?.stripe_key, level: 'bloquant', label: 'Clé Stripe', how: <>Variable <code>STRIPE_SECRET_KEY</code> dans Netlify.</> },
    { ok: !!health?.stripe_webhook_secret && health?.stripe_webhook === 'ok', level: 'bloquant', label: 'Webhook Stripe (commandes enregistrées après paiement)',
      how: health?.stripe_webhook === 'incomplet' ? 'Le webhook existe mais il manque des événements (étape 4 du guide).' : 'Étape 4 du guide : créer le webhook et ajouter STRIPE_WEBHOOK_SECRET.' },
    { ok: !!health?.stripe_live, level: 'bloquant', label: 'Stripe en mode réel', how: 'Remplacer la clé sk_test_… par sk_live_… et recréer le webhook en mode réel (étape 5).' },
    { ok: !placeholder(SHOP.legalName) && !placeholder(SHOP.siret) && !placeholder(SHOP.address), level: 'bloquant', label: 'Raison sociale, SIRET et adresse',
      how: <>Dans <code>src/config.ts</code> : obligatoires sur les mentions légales et les factures.</> },
    { ok: !placeholder(settings.email) && !placeholder(settings.phone), level: 'bloquant', label: 'Coordonnées de contact', how: <Link to="/admin/reglages" className="underline">Réglages → Coordonnées</Link> },
    { ok: settings.mediator.trim().length > 3, level: 'bloquant', label: 'Médiateur de la consommation', how: <>Obligatoire pour vendre aux particuliers : adhérer à un médiateur (par exemple CM2C ou Medicys, environ 50 à 150 € par an), puis l’indiquer dans <Link to="/admin/reglages" className="underline">Réglages → Coordonnées</Link>.</> },
    { ok: products.filter((p) => p.active && !p.images.some((i) => i.startsWith('/exemples/'))).length > 0, level: 'bloquant', label: 'Vos vrais produits en ligne', how: <Link to="/admin/produits/nouveau" className="underline">Ajouter un produit avec vos photos</Link> },
    { ok: exampleProducts.length === 0, level: 'bloquant', label: 'Produits d’exemple retirés', how: `${exampleProducts.length} produit(s) utilisent encore les photos d’exemple : supprimez-les ou remplacez les photos.` },
    { ok: !!mfa, level: 'conseille', label: 'Double authentification de votre compte', how: <Link to="/admin/reglages" className="underline">Réglages → Sécurité du compte</Link> },
    { ok: !!health?.emails, level: 'conseille', label: 'Emails automatiques (confirmation, expédition, relances)', how: 'Étape 4 bis du guide : RESEND_API_KEY et EMAIL_FROM.' },
    { ok: !!health?.owner_email, level: 'conseille', label: 'Alertes par email pour vous', how: 'Variable OWNER_EMAIL dans Netlify.' },
    { ok: !!health?.custom_domain, level: 'conseille', label: 'Nom de domaine', how: 'Netlify → Domain management → Add a domain (environ 10 € par an).' },
    { ok: !settings.story.includes('Texte à personnaliser'), level: 'conseille', label: 'Texte « Notre histoire » personnalisé', how: <Link to="/admin/reglages" className="underline">Réglages → Page d’accueil et histoire</Link> },
    ...(settings.marketplace_enabled ? [{ ok: !!health?.stripe_connect, level: 'conseille' as Level, label: 'Stripe Connect activé (artisans partenaires)', how: 'Étape 4 quater du guide, ou désactiver la place de marché dans Réglages.' }] : []),
  ];
  const blocking = items.filter((i) => i.level === 'bloquant' && !i.ok);
  const done = items.filter((i) => i.ok).length;

  if (hidden && blocking.length === 0) return null;
  return (
    <section className={`rounded-lg border p-5 ${blocking.length ? 'border-garance/40 bg-white' : 'border-emerald-300 bg-emerald-50'}`}>
      <div className="flex flex-wrap items-center gap-3">
        <Rocket className="w-6 h-6 text-garance" />
        <h2 className="font-display text-xl text-nuit flex-1">Prêt pour l’ouverture ? <span className="text-stone-500 text-base font-sans">{done} / {items.length}</span></h2>
        {blocking.length === 0 && <button onClick={() => { setHidden(true); try { localStorage.setItem('artisanat-lancement-masque', '1'); } catch { /* ignoré */ } }} className="text-sm underline">Masquer</button>}
      </div>
      <div className="mt-2 h-2 bg-stone-100 rounded-full overflow-hidden"><div className="h-2 bg-emerald-600" style={{ width: `${(done / items.length) * 100}%` }} /></div>
      {blocking.length > 0 && <p className="mt-3 text-sm text-garance flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {blocking.length} point{blocking.length > 1 ? 's' : ''} à régler avant d’accepter de vrais clients.</p>}
      <ul className="mt-4 grid gap-2 md:grid-cols-2">
        {items.map((i) => (
          <li key={i.label} className="flex gap-3 text-[15px]">
            {i.ok ? <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" /> : <Circle className={`w-5 h-5 shrink-0 mt-0.5 ${i.level === 'bloquant' ? 'text-garance' : 'text-stone-400'}`} />}
            <span>
              <span className={`block ${i.ok ? 'text-stone-500 line-through' : 'font-medium'}`}>{i.label}{!i.ok && i.level === 'conseille' && <span className="text-xs text-stone-500 font-normal"> · conseillé</span>}</span>
              {!i.ok && <span className="block text-sm text-stone-600">{i.how}</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
