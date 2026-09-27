import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Outlet } from 'react-router-dom';
import { LogOut, Package, ShoppingBag, Store } from 'lucide-react';
import { DEMO_MODE, supabase } from '../../lib/supabase';
import { isCurrentUserAdmin } from '../../lib/api';
import { SHOP } from '../../config';

type State = 'checking' | 'anonymous' | 'forbidden' | 'ok';

export function AdminLayout() {
  const [state, setState] = useState<State>('checking');

  useEffect(() => {
    if (!supabase) return;
    const check = async () => {
      const { data } = await supabase!.auth.getSession();
      if (!data.session) return setState('anonymous');
      setState((await isCurrentUserAdmin()) ? 'ok' : 'forbidden');
    };
    check();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setState('anonymous');
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (DEMO_MODE) {
    return (
      <AdminMessage title="Espace vendeur pas encore branché">
        Suivez le guide de mise en ligne (étape Supabase) pour activer l’ajout de produits.
      </AdminMessage>
    );
  }
  if (state === 'checking') return <AdminMessage title="Vérification…" />;
  if (state === 'anonymous') return <Navigate to="/admin/connexion" replace />;
  if (state === 'forbidden') {
    return (
      <AdminMessage title="Ce compte n’a pas accès à l’espace vendeur">
        <button className="underline" onClick={() => supabase!.auth.signOut()}>Se déconnecter</button>
      </AdminMessage>
    );
  }

  const tab = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-4 py-2 rounded-sm ${isActive ? 'bg-laine text-nuit' : 'text-laine/80 hover:text-laine'}`;

  return (
    <div className="min-h-screen bg-stone-100">
      <header className="bg-nuit text-laine">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-2">
          <p className="font-display text-xl mr-4">{SHOP.name} <span className="text-laine/60 text-base">· vendeur</span></p>
          <nav className="flex gap-1">
            <NavLink to="/admin" end className={tab}><Package className="w-4 h-4" />Produits</NavLink>
            <NavLink to="/admin/commandes" className={tab}><ShoppingBag className="w-4 h-4" />Commandes</NavLink>
          </nav>
          <div className="ml-auto flex gap-1">
            <Link to="/" target="_blank" className="flex items-center gap-2 px-3 py-2 text-laine/80 hover:text-laine"><Store className="w-4 h-4" /><span className="hidden sm:inline">Voir la boutique</span></Link>
            <button onClick={() => supabase!.auth.signOut()} className="flex items-center gap-2 px-3 py-2 text-laine/80 hover:text-laine">
              <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Se déconnecter</span>
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
