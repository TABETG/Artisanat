import { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { CartDrawer } from './CartDrawer';
import { DEMO_MODE } from '../lib/supabase';
import { useSettings } from '../context/SettingsContext';
import { SHOP } from '../config';
import { CartReminder } from './CartReminder';
import { Countdown } from './Countdown';
import { MenuDrawer } from './MenuDrawer';
import { ContactSidebar } from './ContactSidebar';
import { PrivacyBanner } from './PrivacyBanner';
import { PanelsContext } from '../context/PanelsContext';

export function Layout() {
  const { pathname } = useLocation();
  const { settings } = useSettings();
  const [menu, setMenu] = useState(false);
  const [contact, setContact] = useState<null | 'contact' | 'donnees'>(null);
  useEffect(() => { window.scrollTo(0, 0); setMenu(false); }, [pathname]);
  const closeMenu = useCallback(() => setMenu(false), []);
  const closeContact = useCallback(() => setContact(null), []);
  // Données structurées pour Google : la boutique et sa recherche interne
  useEffect(() => {
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.text = JSON.stringify([
      { '@context': 'https://schema.org', '@type': 'Organization', name: SHOP.name, url: window.location.origin, logo: `${window.location.origin}/icone-vendeur-512.png`,
        email: settings.email, telephone: settings.phone || undefined, foundingDate: String(SHOP.since), sameAs: [settings.instagram, settings.facebook].filter(Boolean) },
      { '@context': 'https://schema.org', '@type': 'WebSite', name: SHOP.name, url: window.location.origin,
        potentialAction: { '@type': 'SearchAction', target: `${window.location.origin}/boutique?recherche={search_term_string}`, 'query-input': 'required name=search_term_string' } },
    ]);
    document.head.appendChild(el);
    return () => el.remove();
  }, [settings.email, settings.phone, settings.instagram, settings.facebook]);

  const panels = useMemo(() => ({ openMenu: () => setMenu(true), openContact: (tab: 'contact' | 'donnees' = 'contact') => setContact(tab) }), []);

  return (
    <PanelsContext.Provider value={panels}>
    <div className="min-h-screen flex flex-col">
      {DEMO_MODE && (
        <p className="bg-safran text-encre text-center text-xs sm:text-sm px-4 py-2">
          Mode démonstration : paiement simulé, aucune carte débitée.{' '}
          <a href="/admin" className="underline font-medium">Tester l’espace vendeur</a>
        </p>
      )}
      {settings.announcement_active && settings.announcement.trim() &&
        (!settings.announcement_ends_at || new Date(settings.announcement_ends_at).getTime() > Date.now()) && (
        <p className="bg-nuit text-laine text-center text-xs sm:text-sm px-4 py-2 sm:py-2.5 tracking-wide">
          {settings.announcement}
          {settings.announcement_ends_at && <Countdown until={settings.announcement_ends_at} />}
        </p>
      )}
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
      <CartReminder />

      {/* Onglet fixe sur le bord droit : ouvre la barre latérale Contact / Vos données */}
      <button onClick={() => setContact('contact')}
        className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-30 bg-nuit text-laine hover:bg-garance py-4 px-2.5 flex-col items-center gap-2 shadow-lg"
        aria-label="Nous contacter">
        <MessageCircle className="w-5 h-5" />
        <span className="text-sm font-medium tracking-wide [writing-mode:vertical-rl] rotate-180">Contact</span>
      </button>
      {/* Téléphone : bouton rond, au-dessus de la barre d'achat des fiches produit */}
      <button onClick={() => setContact('contact')}
        className={`md:hidden fixed right-4 z-30 w-12 h-12 rounded-full bg-nuit text-laine shadow-xl flex items-center justify-center ${pathname.startsWith('/produit/') ? 'bottom-24' : 'bottom-5'}`}
        style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Nous contacter">
        <MessageCircle className="w-5 h-5" />
      </button>

      {menu && <MenuDrawer onClose={closeMenu} onContact={() => setContact('contact')} />}
      {contact && <ContactSidebar initialTab={contact} onClose={closeContact} />}
      <PrivacyBanner onDetails={() => setContact('donnees')} />
    </div>
    </PanelsContext.Provider>
  );
}
