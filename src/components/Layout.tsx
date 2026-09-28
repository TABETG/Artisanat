import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { CartDrawer } from './CartDrawer';
import { DEMO_MODE } from '../lib/supabase';
import { useSettings } from '../context/SettingsContext';

export function Layout() {
  const { pathname } = useLocation();
  const { settings } = useSettings();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      {DEMO_MODE && (
        <p className="bg-safran text-encre text-center text-sm px-4 py-2">
          Mode démonstration : paiement simulé, aucune carte débitée.{' '}
          <a href="/admin" className="underline font-medium">Tester l’espace vendeur</a>
        </p>
      )}
      {settings.announcement_active && settings.announcement.trim() && (
        <p className="bg-nuit text-laine text-center text-sm px-4 py-2.5 tracking-wide">{settings.announcement}</p>
      )}
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
    </div>
  );
}
