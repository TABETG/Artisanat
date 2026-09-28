import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Heart, Menu, Search, ShoppingBag, X } from 'lucide-react';
import { SearchOverlay } from './SearchOverlay';
import { useFavorites } from '../context/FavoritesContext';
import { useCart } from '../context/CartContext';
import { SHOP } from '../config';

const links = [
  { to: '/boutique', label: 'Boutique' },
  { to: '/sur-mesure', label: 'Sur mesure' },
  { to: '/nos-realisations', label: 'Réalisations' },
  { to: '/notre-histoire', label: 'L’atelier' },
  { to: '/carte-cadeau', label: 'Carte cadeau' },
];

export function Header() {
  const { count, open } = useCart();
  const { ids: favorites } = useFavorites();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const icon = 'relative p-2 sm:p-2.5 text-nuit hover:text-garance';

  return (
    <header className="sticky top-0 z-40 bg-laine/95 backdrop-blur-sm border-b border-laine-fonce">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 h-[72px] flex items-center gap-3 sm:gap-6">
        <Link to="/" className="flex items-center gap-3 shrink-0" onClick={() => setMenuOpen(false)} aria-label={`${SHOP.name}, accueil`}>
          <Mark />
          <span className="leading-none">
            <span className="block font-display text-[1.7rem] text-nuit">{SHOP.name}</span>
            <span className="hidden sm:block text-[11px] tracking-wide text-henne mt-0.5">tissé à la main depuis {SHOP.since}</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-7 ml-6" aria-label="Navigation principale">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className="lien-tisse text-[15px] text-nuit pb-0.5">{l.label}</NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center">
          <button onClick={() => setSearchOpen(true)} className={icon} aria-label="Rechercher"><Search className="w-[22px] h-[22px]" /></button>
          <Link to="/favoris" className={`${icon} hidden sm:block`} aria-label={`Mes favoris (${favorites.length})`}>
            <Heart className="w-[22px] h-[22px]" />
            {favorites.length > 0 && <Dot n={favorites.length} tone="bg-nuit" />}
          </Link>
          <button onClick={open} className={`${icon} ml-1 flex items-center gap-2 pl-3 pr-3.5 py-2 border border-nuit/15 hover:border-nuit rounded-full`}
            aria-label={`Ouvrir le panier (${count} article${count > 1 ? 's' : ''})`}>
            <ShoppingBag className="w-5 h-5" />
            <span className="text-sm font-medium tabular-nums">{count}</span>
          </button>
          <button className={`${icon} lg:hidden ml-1`} onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={menuOpen}>
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="lg:hidden border-t border-laine-fonce bg-laine px-5 pb-6" aria-label="Navigation mobile">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} onClick={() => setMenuOpen(false)}
              className="block py-4 font-display text-3xl text-nuit border-b border-laine-fonce">
              {l.label}
            </NavLink>
          ))}
          <Link to="/favoris" onClick={() => setMenuOpen(false)} className="block pt-5 text-henne">Mes favoris ({favorites.length})</Link>
          <Link to="/contact" onClick={() => setMenuOpen(false)} className="block pt-3 text-henne">Nous contacter</Link>
        </nav>
      )}
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </header>
  );
}

function Dot({ n, tone }: { n: number; tone: string }) {
  return <span className={`absolute top-1 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full ${tone} text-laine text-[11px] font-semibold flex items-center justify-center`}>{n}</span>;
}

/** Monogramme : un losange tissé, motif le plus courant des tapis berbères. */
export function Mark({ className = 'w-10 h-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect width="40" height="40" fill="#1F2452" />
      <path d="M20 6 34 20 20 34 6 20Z" fill="none" stroke="#E3A725" strokeWidth="3" />
      <path d="M20 13 27 20 20 27 13 20Z" fill="#B0281F" />
      <path d="M20 17.5 22.5 20 20 22.5 17.5 20Z" fill="#FBFAF7" />
    </svg>
  );
}
