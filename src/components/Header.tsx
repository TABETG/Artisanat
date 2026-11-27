import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ChevronDown, Heart, Menu, Search, ShoppingBag, User } from 'lucide-react';
import { useCustomer } from '../context/CustomerContext';
import { SearchOverlay } from './SearchOverlay';
import { usePanels } from '../context/PanelsContext';
import { useFavorites } from '../context/FavoritesContext';
import { useCart } from '../context/CartContext';
import { SHOP } from '../config';
import { FEATURES } from '../features';
import { useSettings } from '../context/SettingsContext';
import { Logo } from './Brand';

export { Mark } from './Brand';

/** Navigation principale (la « Boutique » ouvre le menu des catégories). */
const links = [
  { to: '/sur-mesure', label: 'Sur mesure', show: () => FEATURES.customOrdersEnabled },
  { to: '/nos-realisations', label: 'L’atelier', show: () => true },
  { to: '/notre-histoire', label: 'Notre histoire', show: () => true },
  { to: '/artisans', label: 'Nos artisans', show: (marketplace: boolean) => marketplace },
  { to: '/carte-cadeau', label: 'Carte cadeau', show: () => true },
];

export function Header() {
  const { count, open } = useCart();
  const { ids: favorites } = useFavorites();
  const [searchOpen, setSearchOpen] = useState(false);
  const { openMenu } = usePanels();
  const { customer } = useCustomer();
  const { settings } = useSettings();
  const icon = 'relative p-2 sm:p-2.5 text-nuit hover:text-garance rounded-full';
  const nav = 'lien-tisse text-[0.78rem] uppercase tracking-[0.14em] font-medium text-nuit pb-0.5 whitespace-nowrap';

  return (
    <header className="sticky top-0 z-40 bg-laine/95 backdrop-blur-sm border-b border-laine-fonce/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-5 lg:px-8 h-[68px] sm:h-[76px] flex items-center gap-2 sm:gap-6">
        <button onClick={openMenu} className="lg:hidden -ml-2 p-2 text-nuit hover:text-garance shrink-0" aria-label="Ouvrir le menu">
          <Menu className="w-6 h-6" />
        </button>
        <Link to="/" className="shrink min-w-0" aria-label={`${SHOP.name}, accueil`}>
          <Logo />
        </Link>

        <nav className="hidden lg:flex items-center gap-6 xl:gap-8 mx-auto" aria-label="Navigation principale">
          <span className="flex items-center gap-1">
            <NavLink to="/boutique" className={nav}>Boutique</NavLink>
            <button onClick={openMenu} className="p-1 text-nuit hover:text-garance" aria-label="Voir les catégories de la boutique">
              <ChevronDown className="w-4 h-4" />
            </button>
          </span>
          {links.filter((l) => l.show(settings.marketplace_enabled)).map((l) => (
            <NavLink key={l.to} to={l.to} className={nav}>{l.label}</NavLink>
          ))}
        </nav>

        <div className="ml-auto lg:ml-0 flex items-center shrink-0">
          <button onClick={() => setSearchOpen(true)} className={icon} aria-label="Rechercher"><Search className="w-[21px] h-[21px]" /></button>
          <Link to="/compte" className={`${icon} hidden min-[380px]:block`} aria-label={customer ? 'Mon compte (connecté)' : 'Mon compte'}>
            <User className="w-[21px] h-[21px]" />
            {customer && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-menthe ring-2 ring-laine" />}
          </Link>
          <Link to="/favoris" className={`${icon} hidden sm:block`} aria-label={`Mes favoris (${favorites.length})`}>
            <Heart className="w-[21px] h-[21px]" />
            {favorites.length > 0 && <Dot n={favorites.length} />}
          </Link>
          <button onClick={open} className={icon} aria-label={`Ouvrir le panier (${count} article${count > 1 ? 's' : ''})`}>
            <ShoppingBag className="w-[21px] h-[21px]" />
            {count > 0 && <Dot n={count} />}
          </button>
        </div>
      </div>

      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </header>
  );
}

function Dot({ n }: { n: number }) {
  return <span className="absolute top-0.5 right-0 min-w-[18px] h-[18px] px-1 rounded-full bg-garance text-laine text-[11px] font-semibold flex items-center justify-center">{n}</span>;
}
