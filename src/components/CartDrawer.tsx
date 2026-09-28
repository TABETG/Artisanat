import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Lock, Minus, Plus, Trash2, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../lib/format';
import { shippingFor } from '../shipping';
import { useSettings } from '../context/SettingsContext';
import { listProducts, startCheckout } from '../lib/api';
import { Product } from '../types';
import { ProductImage } from './ProductImage';

export function CartDrawer() {
  const { lines, subtotal, isOpen, close, setQuantity, remove, lastAdded, add } = useCart();
  const [catalog, setCatalog] = useState<Product[]>([]);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { settings } = useSettings();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [isOpen, close]);

  useEffect(() => { setError(null); }, [lines]);
  useEffect(() => { if (isOpen) listProducts().then(setCatalog).catch(() => {}); }, [isOpen]);

  if (!isOpen) return null;

  const shipping = shippingFor(subtotal, settings);
  // Suggestions : petites pièces en stock, de préférence qui rapprochent de la livraison offerte
  const inCart = new Set(lines.map((l) => l.id));
  const suggestions = catalog
    .filter((p) => !inCart.has(p.id) && p.stock > 0 && p.price_cents <= Math.max(20000, subtotal * 0.4))
    .sort((a, b) => (b.sales_count ?? 0) - (a.sales_count ?? 0))
    .slice(0, 2);
  const missingForFree = settings.free_shipping_from_cents > 0 ? settings.free_shipping_from_cents - subtotal : 0;

  /** Ferme le panier ; depuis une fiche produit, ramène à la boutique pour continuer. */
  function continueShopping() {
    close();
    if (pathname.startsWith('/produit/') || pathname === '/merci' || pathname === '/commande-annulee') navigate('/boutique');
  }

  async function pay() {
    setPaying(true);
    setError(null);
    try {
      const url = await startCheckout(lines.map((l) => ({ id: l.id, quantity: l.quantity })));
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Le paiement n’a pas pu démarrer.');
      setPaying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Panier">
      <div className="absolute inset-0 bg-encre/50" onClick={close} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-laine shadow-2xl flex flex-col">
        <div className="lisiere shrink-0" aria-hidden />
        <div className="flex items-center justify-between px-6 h-[72px] border-b border-laine-fonce">
          <h2 className="font-display text-3xl text-nuit">Votre panier</h2>
          <button onClick={close} className="p-2 rounded hover:bg-laine-fonce" aria-label="Fermer le panier"><X className="w-5 h-5" /></button>
        </div>

        {lastAdded && (
          <div className="mx-6 mt-4 flex items-center gap-2 bg-emerald-50 text-emerald-800 px-4 py-3 rounded-sm" role="status">
            <Check className="w-5 h-5 shrink-0" />
            <span>« {lastAdded} » a été ajouté au panier.</span>
          </div>
        )}

        {lines.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
            <p className="font-display text-2xl text-nuit">Votre panier est vide</p>
            <p className="mt-2 text-henne">Chaque pièce est tissée à la main. Prenez le temps de choisir.</p>
            <Link to="/boutique" onClick={close} className="mt-6 bg-nuit text-laine px-6 py-3 rounded-sm hover:bg-garance">
              Voir la boutique
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-laine-fonce">
              {lines.map((l) => (
                <li key={l.id} className="py-4 flex gap-4">
                  <ProductImage src={l.image} alt={l.name} className="w-20 h-24 rounded-sm shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-nuit leading-snug">{l.name}</p>
                    <p className="text-sm text-henne mt-1">{formatPrice(l.price_cents)}</p>
                    <div className="mt-3 flex items-center gap-3">
                      {l.stock > 1 ? (
                        <div className="flex items-center border border-laine-fonce rounded-sm">
                          <button className="p-2 disabled:opacity-30" onClick={() => setQuantity(l.id, l.quantity - 1)} disabled={l.quantity <= 1} aria-label="Retirer un"><Minus className="w-4 h-4" /></button>
                          <span className="w-8 text-center">{l.quantity}</span>
                          <button className="p-2 disabled:opacity-30" onClick={() => setQuantity(l.id, l.quantity + 1)} disabled={l.quantity >= l.stock} aria-label="Ajouter un"><Plus className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <span className="text-sm text-henne">Pièce unique</span>
                      )}
                      <button onClick={() => remove(l.id)} className="ml-auto p-2 text-henne hover:text-garance" aria-label={`Retirer ${l.name}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {suggestions.length > 0 && (
              <div className="px-6 pb-4">
                <p className="font-display text-nuit mb-2">Complétez avec</p>
                <ul className="space-y-2">
                  {suggestions.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 bg-white/50 rounded-sm p-2">
                      <ProductImage src={p.images[0]} alt={p.name} className="w-12 h-14 rounded-sm shrink-0" />
                      <span className="flex-1 min-w-0 text-sm"><span className="block truncate">{p.name}</span><span className="text-henne">{formatPrice(p.price_cents)}</span></span>
                      <button onClick={() => add(p)} className="text-sm px-3 py-2 rounded-sm border border-nuit/25 hover:border-nuit" aria-label={`Ajouter ${p.name}`}><Plus className="w-4 h-4" /></button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="border-t border-laine-fonce px-6 py-5 space-y-2">
              <div className="flex justify-between"><span>Sous-total</span><span>{formatPrice(subtotal)}</span></div>
              <div className="flex justify-between text-henne">
                <span>Livraison suivie</span><span>{shipping === 0 ? 'Offerte' : formatPrice(shipping)}</span>
              </div>
              {(settings.express_enabled || settings.pickup_enabled) && (
                <p className="text-xs text-henne">{[settings.express_enabled && 'Express', settings.pickup_enabled && 'retrait gratuit à l’atelier'].filter(Boolean).join(' et ')} : au choix sur la page de paiement.</p>
              )}
              {missingForFree > 0 && (
                <p className="text-sm text-henne">Plus que {formatPrice(missingForFree)} pour la livraison offerte.</p>
              )}
              <div className="flex justify-between font-display text-xl text-nuit pt-2">
                <span>Total</span><span>{formatPrice(subtotal + shipping)}</span>
              </div>
              {error && <p className="text-sm text-garance bg-garance/10 p-3 rounded-sm" role="alert">{error}</p>}
              <button onClick={pay} disabled={paying}
                className="w-full mt-2 bg-garance text-laine py-4 rounded-sm font-medium text-lg flex items-center justify-center gap-2 hover:bg-nuit disabled:opacity-60">
                <Lock className="w-4 h-4" />
                {paying ? 'Ouverture du paiement…' : 'Payer ma commande'}
              </button>
              <button onClick={continueShopping}
                className="w-full py-3.5 rounded-sm border border-nuit/25 text-nuit flex items-center justify-center gap-2 hover:border-nuit">
                <ArrowLeft className="w-4 h-4" /> Continuer mes achats
              </button>
              <p className="text-xs text-center text-henne">
                Paiement par carte (Visa, Mastercard, CB), Apple Pay ou Google Pay, sur la page sécurisée de Stripe.
              </p>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
