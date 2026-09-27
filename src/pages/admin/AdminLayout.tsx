import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Bell, LogOut, Package, RotateCcw, ShoppingBag, Store } from 'lucide-react';
import { DEMO_MODE } from '../../lib/supabase';
import { adminCounts, AdminStatus, getAdminStatus, onSignedOut, signOut } from '../../lib/api';
import { demoReset } from '../../lib/demoStore';
import { AdminCounts } from '../../types';
import { SHOP } from '../../config';

export function AdminLayout() {
  const [state, setState] = useState<AdminStatus | 'checking'>('checking');
  const [counts, setCounts] = useState<AdminCounts | null>(null);
  const { pathname } = useLocation();

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
  if (state === 'forbidden') {
    return (
      <AdminMessage title="Ce compte n’a pas accès à l’espace vendeur">
        <button className="underline" onClick={() => signOut()}>Se déconnecter</button>
      </AdminMessage>
    );
  }

  const tab = ({ isActive }: { isActive: boolean }) =>
    `relative flex items-center gap-2 px-3 sm:px-4 py-2 rounded-sm ${isActive ? 'bg-laine text-nuit' : 'text-laine/80 hover:text-laine'}`;
  const alertTotal = (counts?.outOfStock ?? 0) + (counts?.alertsPending ?? 0);

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
      <header className="bg-nuit text-laine">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-2">
          <p className="font-display text-xl mr-3">{SHOP.name} <span className="text-laine/60 text-base">· vendeur</span></p>
          <nav className="flex gap-1 order-3 sm:order-none w-full sm:w-auto overflow-x-auto">
            <NavLink to="/admin" end className={tab}><Package className="w-4 h-4" />Produits</NavLink>
            <NavLink to="/admin/commandes" className={tab}>
              <ShoppingBag className="w-4 h-4" />Commandes<Badge value={counts?.ordersToPrepare} />
            </NavLink>
            <NavLink to="/admin/alertes" className={tab}>
              <Bell className="w-4 h-4" />Alertes stock<Badge value={alertTotal} />
            </NavLink>
          </nav>
          <div className="ml-auto flex gap-1">
            <Link to="/" target="_blank" className="flex items-center gap-2 px-3 py-2 text-laine/80 hover:text-laine"><Store className="w-4 h-4" /><span className="hidden md:inline">Voir la boutique</span></Link>
            <button onClick={() => signOut()} className="flex items-center gap-2 px-3 py-2 text-laine/80 hover:text-laine">
              <LogOut className="w-4 h-4" /><span className="hidden md:inline">Se déconnecter</span>
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Outlet />
      </main>
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
