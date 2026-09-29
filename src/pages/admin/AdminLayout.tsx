import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Bell, Gift, Inbox, LayoutDashboard, LogOut, Menu, MessageSquare, Package, RotateCcw, Ruler, Send, Settings, ShoppingBag, Store, Ticket, Truck, Undo2, UserCog, Users, X } from 'lucide-react';
import { DEMO_MODE } from '../../lib/supabase';
import { adminCounts, AdminStatus, getAdminStatus, onSignedOut, signOut } from '../../lib/api';
import { demoReset } from '../../lib/demoStore';
import { AdminCounts } from '../../types';
import { SHOP } from '../../config';

export function AdminLayout() {
  const [state, setState] = useState<AdminStatus | 'checking'>('checking');
  const [counts, setCounts] = useState<AdminCounts | null>(null);
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Permet d'installer l'espace vendeur comme une application sur le téléphone
  useEffect(() => {
    const links = [
      Object.assign(document.createElement('link'), { rel: 'manifest', href: '/vendeur.webmanifest' }),
      Object.assign(document.createElement('link'), { rel: 'apple-touch-icon', href: '/icone-vendeur-192.png' }),
    ];
    links.forEach((l) => document.head.appendChild(l));
    return () => links.forEach((l) => l.remove());
  }, []);

  useEffect(() => {
    getAdminStatus().then(setState);
    return onSignedOut(() => setState('anonymous'));
  }, []);

  // Pastilles de notification, rafraîchies à chaque changement de page
  useEffect(() => {
    if (state !== 'ok') return;
    adminCounts().then(setCounts).catch(() => setCounts(null));
  }, [state, pathname]);

  if (state === 'checking') return <AdminMessage title="Vérification…" />;
  if (state === 'anonymous') return <Navigate to="/admin/connexion" replace />;
  if (state === 'mfa') return <Navigate to="/admin/connexion?etape=code" replace />;
  if (state === 'forbidden') {
    return (
      <AdminMessage title="Ce compte n’a pas accès à l’espace vendeur">
        <button className="underline" onClick={() => signOut()}>Se déconnecter</button>
      </AdminMessage>
    );
  }

  const alertTotal = (counts?.outOfStock ?? 0) + (counts?.alertsPending ?? 0);
  const groups: { title: string; items: { to: string; label: string; icon: ReactNode; badge?: number; end?: boolean }[] }[] = [
    { title: 'Ventes', items: [
      { to: '/admin', label: 'Tableau de bord', icon: <LayoutDashboard className="w-4 h-4" />, end: true },
      { to: '/admin/commandes', label: 'Commandes', icon: <ShoppingBag className="w-4 h-4" />, badge: counts?.ordersToPrepare },
      { to: '/admin/messages', label: 'Messages', icon: <Inbox className="w-4 h-4" />, badge: counts?.messagesNew },
      { to: '/admin/clients', label: 'Clients', icon: <Users className="w-4 h-4" /> },
      { to: '/admin/retours', label: 'Retours', icon: <Undo2 className="w-4 h-4" />, badge: counts?.returnsNew },
      { to: '/admin/sur-mesure', label: 'Demandes sur mesure', icon: <Ruler className="w-4 h-4" />, badge: counts?.customRequestsNew },
    ] },
    { title: 'Catalogue', items: [
      { to: '/admin/produits', label: 'Produits', icon: <Package className="w-4 h-4" /> },
      { to: '/admin/artisans', label: 'Artisans partenaires', icon: <Store className="w-4 h-4" />, badge: (counts?.sellersPending ?? 0) + (counts?.productsToReview ?? 0) },
      { to: '/admin/alertes', label: 'Alertes stock', icon: <Bell className="w-4 h-4" />, badge: alertTotal },
      { to: '/admin/avis', label: 'Avis clients', icon: <MessageSquare className="w-4 h-4" />, badge: counts?.reviewsPending },
    ] },
    { title: 'Marketing', items: [
      { to: '/admin/codes-promo', label: 'Codes promo', icon: <Ticket className="w-4 h-4" /> },
      { to: '/admin/cartes-cadeaux', label: 'Cartes cadeaux', icon: <Gift className="w-4 h-4" /> },
      { to: '/admin/lettre', label: 'Lettre d’information', icon: <Send className="w-4 h-4" /> },
    ] },
    { title: 'Boutique', items: [
      { to: '/admin/livraison', label: 'Livraison', icon: <Truck className="w-4 h-4" /> },
      { to: '/admin/reglages', label: 'Réglages', icon: <Settings className="w-4 h-4" /> },
      { to: '/admin/equipe', label: 'Équipe et journal', icon: <UserCog className="w-4 h-4" /> },
    ] },
  ];

  const nav = (
    <nav className="space-y-6" aria-label="Espace vendeur">
      {groups.map((g) => (
        <div key={g.title}>
          <p className="px-3 text-xs uppercase tracking-wider text-laine/50 mb-1.5">{g.title}</p>
          <ul className="space-y-0.5">
            {g.items.map((it) => (
              <li key={it.to}>
                <NavLink to={it.to} end={it.end} onClick={() => setMenuOpen(false)}
                  className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-md ${isActive ? 'bg-laine text-nuit font-medium' : 'text-laine/85 hover:bg-laine/10'}`}>
                  {it.icon}<span className="flex-1">{it.label}</span><Badge value={it.badge} />
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="border-t border-laine/15 pt-4 space-y-0.5">
        <Link to="/" target="_blank" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-laine/85 hover:bg-laine/10"><Store className="w-4 h-4" />Voir la boutique</Link>
        <button onClick={() => signOut()} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-laine/85 hover:bg-laine/10"><LogOut className="w-4 h-4" />Se déconnecter</button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-stone-100">
      {DEMO_MODE && (
        <div className="bg-safran text-encre text-sm px-4 py-2 flex flex-wrap justify-center items-center gap-x-4 gap-y-1">
          <span>Démonstration : vos modifications restent dans ce navigateur.</span>
          <button className="inline-flex items-center gap-1 underline"
            onClick={() => { if (confirm('Remettre les produits et commandes d’exemple ?')) { demoReset(); window.location.reload(); } }}>
            <RotateCcw className="w-3.5 h-3.5" /> Réinitialiser la démonstration
          </button>
        </div>
      )}
      {/* Téléphone : barre du haut + menu déroulant */}
      <header className="lg:hidden sticky top-0 z-40 bg-nuit text-laine px-4 h-14 flex items-center justify-between">
        <p className="font-display text-lg">{SHOP.name} <span className="text-laine/60 text-sm">· vendeur</span></p>
        <button onClick={() => setMenuOpen(true)} className="relative p-2" aria-label="Ouvrir le menu">
          <Menu className="w-6 h-6" />
          {(counts?.ordersToPrepare ?? 0) + alertTotal + (counts?.reviewsPending ?? 0) + (counts?.customRequestsNew ?? 0) + (counts?.returnsNew ?? 0) + (counts?.messagesNew ?? 0) > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-garance" />}
        </button>
      </header>
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-encre/50" onClick={() => setMenuOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-nuit text-laine p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <p className="font-display text-xl">{SHOP.name}</p>
              <button onClick={() => setMenuOpen(false)} className="p-2" aria-label="Fermer le menu"><X className="w-5 h-5" /></button>
            </div>
            {nav}
          </aside>
        </div>
      )}
      <div className="lg:flex">
        {/* Ordinateur : menu latéral fixe */}
        <aside className="hidden lg:block w-64 shrink-0 bg-nuit text-laine min-h-screen sticky top-0 self-start max-h-screen overflow-y-auto p-4">
          <p className="font-display text-2xl px-3 mb-8">{SHOP.name} <span className="block text-sm text-laine/60 font-sans">Espace vendeur</span></p>
          {nav}
        </aside>
        <main className="flex-1 min-w-0 px-4 sm:px-6 py-8 max-w-6xl">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Badge({ value }: { value?: number }) {
  if (!value) return null;
  return <span className="min-w-5 h-5 px-1.5 rounded-full bg-garance text-laine text-xs font-semibold flex items-center justify-center">{value}</span>;
}

export function AdminMessage({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100 px-5">
      <div className="bg-white p-8 rounded-md shadow-sm max-w-md text-center">
        <h1 className="font-display text-2xl text-nuit">{title}</h1>
        {children && <div className="mt-3 text-encre/80">{children}</div>}
        <Link to="/" className="inline-block mt-6 text-garance underline">Retour à la boutique</Link>
      </div>
    </div>
  );
}
