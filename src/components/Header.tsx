import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Heart, Menu, ShoppingBag, X } from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext';
import { useCart } from '../context/CartContext';
import { SHOP } from '../config';

const links = [
  { to: '/boutique', label: 'Boutique' },
  { to: '/notre-histoire', label: 'Notre histoire' },
  { to: '/livraison-et-retours', label: 'Livraison' },
  { to: '/contact', label: 'Contact' },
];

export function Header() {
  const { count, open } = useCart();
  const { ids: favorites } = useFavorites();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-laine/95 backdrop-blur border-b border-laine-fonce">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-baseline gap-2" onClick={() => setMenuOpen(false)}>
          <span className="font-display text-2xl font-extrabold text-nuit tracking-tight">{SHOP.name}</span>
          <span className="hidden sm:inline text-sm text-henne">depuis {SHOP.since}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7" aria-label="Navigation principale">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to}
              className={({ isActive }) => `text-[15px] hover:text-garance ${isActive ? 'text-garance font-medium' : 'text-encre'}`}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Link to="/favoris" className="relative p-2.5 rounded hover:bg-laine-fonce" aria-label={`Mes favoris (${favorites.length})`}>
            <Heart className="w-6 h-6 text-nuit" />
            {favorites.length > 0 && (
              <span className="absolute top-1 right-1 min-w-5 h-5 px-1 rounded-full bg-nuit text-laine text-xs font-semibold flex items-center justify-center">{favorites.length}</span>
            )}
          </Link>
          <button onClick={open} className="relative p-2.5 rounded hover:bg-laine-fonce" aria-label={`Ouvrir le panier (${count} article${count > 1 ? 's' : ''})`}>
            <ShoppingBag className="w-6 h-6 text-nuit" />
            {count > 0 && (
              <span className="absolute top-1 right-1 min-w-5 h-5 px-1 rounded-full bg-garance text-laine text-xs font-semibold flex items-center justify-center">
                {count}
              </span>
            )}
          </button>
          <button className="md:hidden p-2.5 rounded hover:bg-laine-fonce" onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={menuOpen}>
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="md:hidden border-t border-laine-fonce bg-laine px-5 py-3" aria-label="Navigation mobile">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} onClick={() => setMenuOpen(false)}
              className="block py-3 text-lg font-display text-nuit border-b border-laine-fonce last:border-0">
              {l.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
