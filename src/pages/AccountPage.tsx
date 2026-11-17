import { FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, Download, FileText, Gift, Heart, LogOut, Mail, Package, RotateCcw, Settings, Store, Truck } from 'lucide-react';
import { SellerSpace } from './SellerSpace';
import { useCustomer } from '../context/CustomerContext';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { useSettings } from '../context/SettingsContext';
import { DEMO_MODE } from '../lib/supabase';
import { customerSignOut, DEMO_CUSTOMER, demoLogin, exportMyData, isSubscribed, listMyGiftCards, listMyOrders, listMyReturns, sendLoginLink, setSubscribed } from '../lib/customer';
import { downloadFile, listProducts } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { formatDate, formatPrice } from '../lib/format';
import { orderNumber, printInvoice } from '../lib/documents';
import { trackingUrl } from '../config';
import { ORDER_STATUS, RETURN_STATUS } from '../types';
import { ProductCard } from '../components/ProductCard';
import { ProductImage } from '../components/ProductImage';

type Tab = 'commandes' | 'favoris' | 'cadeaux' | 'atelier' | 'preferences';

export function AccountPage() {
  const { customer, ready } = useCustomer();
  if (!ready) return <p className="max-w-7xl mx-auto px-5 lg:px-8 pt-16 text-henne">Chargement…</p>;
  return customer ? <Dashboard email={customer.email} /> : <Login />;
}

function Login() {
  const [email, setEmail] = useState(DEMO_MODE ? DEMO_CUSTOMER : '');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState('sending'); setError(null);
    try {
      await sendLoginLink(email);
      if (DEMO_MODE) { demoLogin(email); return; }
      setState('sent');
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur'); setState('idle'); }
  }

  return (
    <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-12 grid gap-12 lg:grid-cols-2 items-start">
      <div>
        <div className="lisiere-fine w-16 mb-5" aria-hidden />
        <h1 className="font-display text-[2.8rem] sm:text-6xl md:text-7xl text-nuit">Mon compte</h1>
        <p className="lecture mt-5 text-[1.2rem] text-encre/80 max-w-md">Pas de mot de passe à retenir : indiquez votre email, nous vous envoyons un lien de connexion.</p>
        {state === 'sent' ? (
          <p className="mt-8 flex gap-3 bg-[#DCEBE2] text-menthe p-4 max-w-md" role="status">
            <Mail className="w-5 h-5 shrink-0 mt-0.5" /> Lien envoyé à {email}. Ouvrez l’email sur cet appareil et touchez « Se connecter ».
          </p>
        ) : (
          <form onSubmit={submit} className="mt-8 max-w-md space-y-3">
            <label className="block"><span className="font-medium block mb-1">Votre email</span>
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 bg-white border border-laine-fonce focus:border-nuit focus:outline-none text-lg" /></label>
            {error && <p className="text-garance text-sm" role="alert">{error}</p>}
            <button disabled={state === 'sending'} className="w-full bg-nuit text-laine py-4 text-lg font-medium hover:bg-garance disabled:opacity-60">
              {state === 'sending' ? 'Envoi…' : DEMO_MODE ? 'Se connecter (démonstration)' : 'Recevoir mon lien de connexion'}
            </button>
            <p className="text-sm text-henne">Utilisez l’email de vos commandes pour les retrouver. Le compte est créé à la première connexion.</p>
          </form>
        )}
      </div>
      <ul className="grid gap-5 lg:pt-24">
        {[
          [Package, 'Vos commandes', 'Suivi du colis, factures, retours en quelques clics.'],
          [Heart, 'Vos favoris partout', 'Retrouvez vos pièces préférées sur téléphone et ordinateur.'],
          [Gift, 'Vos cartes cadeaux', 'Les codes achetés ou reçus, au même endroit.'],
          [Settings, 'Vos données', 'Lettre d’information, export et suppression de vos données.'],
        ].map(([Icon, t, d]) => {
          const I = Icon as typeof Package;
          return (
            <li key={t as string} className="flex gap-4 border-t border-laine-fonce pt-5">
              <I className="w-6 h-6 text-garance shrink-0" />
              <span><span className="block font-display text-2xl text-nuit">{t as string}</span><span className="lecture text-base text-henne">{d as string}</span></span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Dashboard({ email }: { email: string }) {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('onglet') as Tab) ?? 'commandes';
  const tabs: { id: Tab; label: string; icon: typeof Package }[] = [
    { id: 'commandes', label: 'Commandes', icon: Package },
    { id: 'favoris', label: 'Favoris', icon: Heart },
    { id: 'cadeaux', label: 'Cartes cadeaux', icon: Gift },
    { id: 'atelier', label: 'Mon atelier', icon: Store },
    { id: 'preferences', label: 'Préférences et données', icon: Settings },
  ];
  return (
    <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-12">
      <div className="lisiere-fine w-16 mb-5" aria-hidden />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[2.8rem] sm:text-6xl md:text-7xl text-nuit">Mon compte</h1>
          <p className="mt-2 text-henne">{email}</p>
        </div>
        <button onClick={() => customerSignOut()} className="inline-flex items-center gap-2 text-nuit lien-tisse pb-0.5"><LogOut className="w-4 h-4" /> Se déconnecter</button>
      </div>
      <div className="mt-8 flex flex-wrap sm:flex-nowrap gap-1 sm:overflow-x-auto border-b border-laine-fonce" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setParams({ onglet: t.id }, { replace: true })}
            className={`inline-flex items-center gap-2 px-4 py-3 whitespace-nowrap border-b-2 -mb-px ${tab === t.id ? 'border-garance text-nuit font-medium' : 'border-transparent text-henne hover:text-nuit'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>
      <div className="mt-8">
        {tab === 'commandes' && <Orders email={email} />}
        {tab === 'favoris' && <Favorites />}
        {tab === 'cadeaux' && <GiftCards email={email} />}
        {tab === 'atelier' && <SellerSpace />}
        {tab === 'preferences' && <Preferences email={email} />}
      </div>
    </div>
  );
}

function Orders({ email }: { email: string }) {
  const { data, loading } = useAsync(() => Promise.all([listMyOrders(email), listMyReturns(email), listProducts()]), [email]);
  const { add, open } = useCart();
  const [done, setDone] = useState<string | null>(null);
  if (loading || !data) return <p className="text-henne">Chargement…</p>;
  const [orders, returns, products] = data;
  if (!orders.length) return (
    <div className="py-10 max-w-md">
      <p className="font-display text-3xl text-nuit">Pas encore de commande</p>
      <p className="lecture mt-2 text-henne">Vos commandes passées avec {email} apparaîtront ici.</p>
      <Link to="/boutique" className="inline-block mt-6 bg-nuit text-laine px-6 py-3 hover:bg-garance">Voir la boutique</Link>
    </div>
  );

  function reorder(orderId: string) {
    const o = orders.find((x) => x.id === orderId);
    let n = 0;
    o?.order_items?.forEach((i) => { const p = products.find((x) => x.id === i.product_id && x.stock > 0); if (p) { add(p, i.quantity); n++; } });
    setDone(n ? orderId : `vide-${orderId}`);
    if (n) open();
  }

  return (
    <ul className="space-y-5">
      {orders.map((o) => {
        const ret = returns.find((r) => r.order_id === o.id);
        const link = trackingUrl(o.tracking_carrier, o.tracking_number);
        const returnable = ['shipped', 'delivered'].includes(o.status) && Date.now() - new Date(o.created_at).getTime() < 30 * 86400000 && !ret;
        return (
          <li key={o.id} className="border border-laine-fonce bg-white/60">
            <div className="p-5 flex flex-wrap items-baseline gap-x-5 gap-y-1 border-b border-laine-fonce">
              <p className="font-display text-2xl text-nuit">Commande #{orderNumber(o)}</p>
              <p className="text-henne">{formatDate(o.created_at)}</p>
              <span className={`text-sm px-2.5 py-0.5 ${ORDER_STATUS[o.status].tone}`}>{o.status === 'check_stock' ? 'Payée — en préparation' : ORDER_STATUS[o.status].label.replace(' — à préparer', ' — en préparation')}</span>
              <p className="ml-auto font-semibold text-nuit">{formatPrice(o.total_cents)}</p>
            </div>
            <div className="p-5 grid gap-5 md:grid-cols-[1fr_auto]">
              <ul className="space-y-3">
                {o.order_items?.map((i) => {
                  const p = products.find((x) => x.id === i.product_id);
                  return (
                    <li key={i.id} className="flex items-center gap-4">
                      <ProductImage src={p?.images[0]} alt="" className="w-14 h-16 shrink-0" />
                      <span className="flex-1">{p ? <Link to={`/produit/${p.id}`} className="hover:text-garance">{i.name}</Link> : i.name}<span className="block text-sm text-henne">{i.quantity} × {formatPrice(i.unit_price_cents)}</span></span>
                    </li>
                  );
                })}
                {o.shipping_method && <li className="text-sm text-henne flex items-center gap-2"><Truck className="w-4 h-4" /> {o.shipping_method}{o.tracking_number && <> · suivi {o.tracking_number}</>}</li>}
                {ret && <li className={`text-sm inline-block px-2.5 py-1 ${RETURN_STATUS[ret.status].tone}`}>Retour : {RETURN_STATUS[ret.status].label}</li>}
              </ul>
              <div className="flex md:flex-col gap-2 flex-wrap">
                {link && <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 bg-nuit text-laine hover:bg-garance"><Truck className="w-4 h-4" /> Suivre le colis</a>}
                <button onClick={() => printInvoice(o)} className="inline-flex items-center gap-2 px-4 py-2.5 border border-nuit/20 hover:border-nuit"><FileText className="w-4 h-4" /> Facture</button>
                <button onClick={() => reorder(o.id)} className="inline-flex items-center gap-2 px-4 py-2.5 border border-nuit/20 hover:border-nuit"><RotateCcw className="w-4 h-4" /> Commander à nouveau</button>
                {returnable && <Link to="/suivi-commande" className="inline-flex items-center gap-2 px-4 py-2.5 border border-nuit/20 hover:border-nuit">Retourner un article</Link>}
                {done === `vide-${o.id}` && <p className="text-sm text-henne max-w-48">Ces pièces uniques ne sont plus disponibles. <Link to="/sur-mesure" className="underline">Les faire tisser ?</Link></p>}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Favorites() {
  const { ids } = useFavorites();
  const { data } = useAsync(listProducts, []);
  const list = ids.map((id) => (data ?? []).find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p);
  if (!list.length) return <p className="lecture text-henne">Aucun favori. Touchez le cœur sur une création pour la garder ici, sur tous vos appareils.</p>;
  return <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-12">{list.map((p) => <ProductCard key={p.id} product={p} />)}</div>;
}

function GiftCards({ email }: { email: string }) {
  const { data, loading } = useAsync(() => listMyGiftCards(email), [email]);
  if (loading) return <p className="text-henne">Chargement…</p>;
  if (!data?.length) return <p className="lecture text-henne">Aucune carte cadeau. <Link to="/carte-cadeau" className="text-garance underline">Offrir une carte</Link></p>;
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {data.map((g) => (
        <li key={g.code} className="bg-nuit text-laine p-6">
          <p className="font-display text-4xl text-safran">{formatPrice(g.amount_cents)}</p>
          <p className="mt-3 font-mono text-lg tracking-wider">{g.code}</p>
          <p className="mt-2 text-sm text-laine/70">{g.recipient_email === email ? 'Reçue' : 'Offerte'}{g.recipient_name ? ` · pour ${g.recipient_name}` : ''}{g.expires_at ? ` · valable jusqu’au ${new Date(g.expires_at).toLocaleDateString('fr-FR')}` : ''}</p>
        </li>
      ))}
    </ul>
  );
}

function Preferences({ email }: { email: string }) {
  const { settings } = useSettings();
  const [sub, setSub] = useState<boolean | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => { isSubscribed(email).then(setSub); }, [email]);

  async function toggle(v: boolean) {
    setSub(v); await setSubscribed(email, v); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl space-y-10">
      <section>
        <h2 className="font-display text-3xl text-nuit">Lettre d’information</h2>
        <label className="mt-4 flex items-center gap-3 cursor-pointer">
          <input type="checkbox" disabled={sub === null} checked={!!sub} onChange={(e) => toggle(e.target.checked)} className="w-5 h-5 accent-nuit" />
          <span>Recevoir un email quand de nouvelles pièces sortent de l’atelier (une fois par mois au plus)</span>
          {saved && <Check className="w-5 h-5 text-menthe" />}
        </label>
      </section>
      <section>
        <h2 className="font-display text-3xl text-nuit">Vos données</h2>
        <p className="lecture mt-3 text-encre/80">Vous pouvez télécharger toutes les informations liées à votre email (commandes, retours, cartes cadeaux), ou demander leur suppression.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={async () => downloadFile(`mes-donnees-${new Date().toISOString().slice(0, 10)}.json`, await exportMyData(email), 'application/json')}
            className="inline-flex items-center gap-2 px-5 py-3 bg-nuit text-laine hover:bg-garance"><Download className="w-4 h-4" /> Télécharger mes données</button>
          <a href={`mailto:${settings.email}?subject=${encodeURIComponent('Suppression de mon compte')}&body=${encodeURIComponent(`Bonjour,\n\nJe souhaite la suppression de mon compte et de mes données personnelles (${email}).\n\nMerci.`)}`}
            className="px-5 py-3 border border-nuit/20 hover:border-garance hover:text-garance">Demander la suppression</a>
        </div>
        <p className="mt-3 text-sm text-henne">Les factures sont conservées 10 ans, comme l’exige la loi ; le reste est supprimé sous 30 jours.</p>
      </section>
    </div>
  );
}
