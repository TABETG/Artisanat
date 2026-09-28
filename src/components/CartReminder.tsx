import { useEffect, useState } from 'react';
import { ShoppingBag, X } from 'lucide-react';
import { useCart } from '../context/CartContext';

const KEY = 'artisanat-derniere-visite';

/** Rappel discret quand un visiteur revient avec un panier non terminé. */
export function CartReminder() {
  const { count, open, isOpen } = useCart();
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const last = Number(localStorage.getItem(KEY) ?? 0);
      if (count > 0 && last && Date.now() - last > 60 * 60 * 1000) setShow(true);
      localStorage.setItem(KEY, String(Date.now()));
    } catch { /* ignoré */ }
    // à l'arrivée sur le site uniquement
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!show || isOpen || count === 0) return null;
  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:w-96 z-40 bg-nuit text-laine rounded-sm shadow-2xl p-4 flex items-start gap-3" role="status">
      <ShoppingBag className="w-6 h-6 text-safran shrink-0" />
      <div className="flex-1">
        <p className="font-medium">Votre panier vous attend</p>
        <p className="text-sm text-laine/75">{count} article{count > 1 ? 's' : ''} mis de côté. Les pièces uniques peuvent partir vite.</p>
        <button onClick={() => { setShow(false); open(); }} className="mt-3 bg-safran text-encre px-4 py-2 rounded-sm text-sm font-medium">Voir mon panier</button>
      </div>
      <button onClick={() => setShow(false)} className="p-1 text-laine/60 hover:text-laine" aria-label="Fermer"><X className="w-4 h-4" /></button>
    </div>
  );
}
