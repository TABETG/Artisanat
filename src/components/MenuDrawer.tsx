import { Link } from 'react-router-dom';
import { Gift, Heart, Mail, Package, Ruler, Store, Truck, User } from 'lucide-react';
import { Drawer } from './Drawer';
import { useCategories, useSettings } from '../context/SettingsContext';
import { useFavorites } from '../context/FavoritesContext';
import { listProducts } from '../lib/api';
import { useAsync } from '../lib/useAsync';

/** Menu burger : catégories, pages et aide, sur ordinateur comme sur téléphone. */
export function MenuDrawer({ onClose, onContact }: { onClose: () => void; onContact: () => void }) {
  const { categories } = useCategories();
  const { settings } = useSettings();
  const { ids } = useFavorites();
  const { data: products } = useAsync(listProducts, []);
  const shown = products ? categories.filter((c) => products.some((p) => p.category === c.id)) : categories;
  const big = 'block py-3 font-display text-[2rem] leading-none text-nuit hover:text-garance';
  const small = 'flex items-center gap-3 py-2.5 text-nuit hover:text-garance';

  return (
    <Drawer side="left" title="Menu" onClose={onClose}>
      <nav className="px-6 py-6" aria-label="Menu principal">
        <ul>
          <li><Link to="/boutique" onClick={onClose} className={big}>Toute la boutique</Link></li>
          {shown.map((c) => (
            <li key={c.id}><Link to={`/boutique?categorie=${c.id}`} onClick={onClose} className="block py-2 pl-4 text-lg text-henne hover:text-garance border-l-2 border-laine-fonce hover:border-garance">{c.label}</Link></li>
          ))}
          <li className="mt-3"><Link to="/boutique?promotion=1" onClick={onClose} className={`${big} text-garance`}>Promotions</Link></li>
          <li><Link to="/boutique?nouveautes=1" onClick={onClose} className={big}>Nouveautés</Link></li>
          <li><Link to="/sur-mesure" onClick={onClose} className={big}>Sur mesure</Link></li>
          <li><Link to="/artisans" onClick={onClose} className={big}>Nos artisans</Link></li>
          <li><Link to="/nos-realisations" onClick={onClose} className={big}>Réalisations</Link></li>
          <li><Link to="/notre-histoire" onClick={onClose} className={big}>L’atelier</Link></li>
        </ul>

        <div className="lisiere-fine w-16 my-8" aria-hidden />
        <ul className="text-[15px]">
          <li><Link to="/compte" onClick={onClose} className={small}><User className="w-4 h-4" /> Mon compte</Link></li>
          <li><Link to="/favoris" onClick={onClose} className={small}><Heart className="w-4 h-4" /> Mes favoris ({ids.length})</Link></li>
          <li><Link to="/carte-cadeau" onClick={onClose} className={small}><Gift className="w-4 h-4" /> Carte cadeau</Link></li>
          <li><Link to="/vendre" onClick={onClose} className={small}><Store className="w-4 h-4" /> Vendre mes créations</Link></li>
          <li><Link to="/suivi-commande" onClick={onClose} className={small}><Package className="w-4 h-4" /> Suivre ma commande</Link></li>
          <li><Link to="/livraison-et-retours" onClick={onClose} className={small}><Truck className="w-4 h-4" /> Livraison et retours</Link></li>
          <li><Link to="/questions-frequentes" onClick={onClose} className={small}><Ruler className="w-4 h-4" /> Questions fréquentes</Link></li>
          <li><button onClick={() => { onClose(); onContact(); }} className={small}><Mail className="w-4 h-4" /> Nous contacter</button></li>
        </ul>
        {settings.phone && <p className="mt-8 text-sm text-henne">Une question ? <a href={`tel:${settings.phone.replace(/\s/g, '')}`} className="text-nuit underline">{settings.phone}</a></p>}
      </nav>
    </Drawer>
  );
}
