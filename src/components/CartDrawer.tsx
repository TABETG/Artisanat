import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Lock, Minus, Plus, Trash2, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../lib/format';
import { COUNTRIES, KIND_LABELS, quoteShipping, servedCountries, addBusinessDays } from '../shipping';
import { useSettings } from '../context/SettingsContext';
import { listProducts, startCheckout } from '../lib/api';
import { useMarketplace } from '../context/MarketplaceContext';
import { sellerShippingCents } from '../sellerShipping';
import { Product } from '../types';
import { ProductImage } from './ProductImage';

export function CartDrawer() {
  const { lines, subtotal, isOpen, close, setQuantity, remove, lastAdded, add, country, setCountry, methodId, setMethodId } = useCart();
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

  const served = servedCountries(settings.shipping_zones, settings.shipping_methods);
  // Pièces de l'atelier : modes de livraison de la boutique. Pièces d'artisans : chaque artisan expédie à son tarif.
  const { sellerOf } = useMarketplace();
  const ownLines = lines.filter((l) => !l.seller_id);
  const sellerGroups = [...new Set(lines.filter((l) => l.seller_id).map((l) => l.seller_id!))].map((id) => {
    const group = lines.filter((l) => l.seller_id === id);
    const seller = sellerOf(id);
    const total = group.reduce((n, l) => n + l.price_cents * l.quantity, 0);
    return { id, seller, cents: seller ? sellerShippingCents(seller, country, total, settings.shipping_zones) : null };
  });
  const quotes = ownLines.length ? quoteShipping(country, ownLines, settings.shipping_zones, settings.shipping_methods) : [];
  const quote = quotes.find((q) => q.method.id === methodId) ?? quotes[0];
  const sellerShipping = sellerGroups.reduce((n, g) => n + (g.cents ?? 0), 0);
  const sellerBlocked = sellerGroups.find((g) => g.cents == null);
  const canShip = (!ownLines.length || !!quote) && !sellerBlocked;
  const shipping = (quote?.cents ?? 0) + sellerShipping;
  const deliveryFrom = (min: number, max: number) => {
    const start = addBusinessDays(new Date(), settings.preparation_days + min);
    const end = addBusinessDays(new Date(), settings.preparation_days + max);
    const f = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
    return `${f(start)} – ${f(end)}`;
  };
  // Suggestions : petites pièces en stock, de préférence qui rapprochent de la livraison offerte
  const inCart = new Set(lines.map((l) => l.id));
  const suggestions = catalog
    .filter((p) => !inCart.has(p.id) && p.stock > 0 && p.price_cents <= Math.max(20000, subtotal * 0.4))
    .sort((a, b) => (b.sales_count ?? 0) - (a.sales_count ?? 0))
    .slice(0, 2);
  const missingForFree = quote && !quote.free && quote.method.free_from_cents ? quote.method.free_from_cents - subtotal : 0;

  /** Ferme le panier ; depuis une fiche produit, ramène à la boutique pour continuer. */
  function continueShopping() {
    close();
    if (pathname.startsWith('/produit/') || pathname === '/merci' || pathname === '/commande-annulee') navigate('/boutique');
  }

  async function pay() {
    setPaying(true);
    setError(null);
    try {
      if (!canShip) throw new Error(sellerBlocked ? `${sellerBlocked.seller?.shop_name ?? 'Un artisan'} ne livre pas ce pays.` : 'Choisissez un pays de livraison desservi.');
      const url = await startCheckout(lines.map((l) => ({ id: l.id, quantity: l.quantity })), country, quote?.method.id ?? null);
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
            <div className="flex-1 overflow-y-auto">
            <ul className="px-6 py-4 divide-y divide-laine-fonce">
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
              <div className="hidden sm:block px-6 pb-4">
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

            {/* ---------- Livraison : pays et mode ---------- */}
            <section className="px-6 pb-5" aria-label="Livraison">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="font-display text-2xl text-nuit">Livraison</p>
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-henne">vers</span>
                  <select value={country} onChange={(e) => { setCountry(e.target.value); setMethodId(null); }} className="py-1.5 px-2 bg-white border border-laine-fonce" aria-label="Pays de livraison">
                    {COUNTRIES.filter((c) => served.includes(c.code) || c.code === country).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </label>
              </div>
              {sellerGroups.length > 0 && (
                <ul className="mb-3 space-y-2">
                  {sellerGroups.map((g) => (
                    <li key={g.id} className="flex items-start justify-between gap-3 p-3 border border-laine-fonce bg-white/60 text-sm">
                      <span><span className="font-medium text-nuit">Expédié par {g.seller?.shop_name ?? 'l’artisan'}</span>
                        <span className="block text-xs text-henne">{g.seller ? `Depuis ${g.seller.city} · préparation ${g.seller.prep_days} j` : ''}</span></span>
                      <span className={`font-semibold tabular-nums whitespace-nowrap ${g.cents === 0 ? 'text-menthe' : 'text-nuit'}`}>
                        {g.cents == null ? 'Ne livre pas ce pays' : g.cents === 0 ? 'Offerte' : formatPrice(g.cents)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {ownLines.length === 0 ? null : quotes.length === 0 ? (
                <p className="text-sm bg-garance/10 text-garance p-3">Nous ne livrons pas encore ce pays en ligne. Écrivez-nous : nous trouverons une solution.</p>
              ) : (
                <div className="space-y-2" role="radiogroup" aria-label="Mode de livraison">
                  {quotes.map((q) => {
                    const on = q.method.id === quote?.method.id;
                    return (
                      <label key={q.method.id} className={`flex items-start gap-3 p-3 border cursor-pointer ${on ? 'border-nuit bg-white' : 'border-laine-fonce hover:border-nuit/40'}`}>
                        <input type="radio" name="livraison" checked={on} onChange={() => setMethodId(q.method.id)} className="mt-1 accent-nuit" />
                        <span className="flex-1 min-w-0">
                          <span className="flex items-baseline justify-between gap-3">
                            <span className="font-medium text-nuit">{q.method.name}</span>
                            <span className={`font-semibold tabular-nums whitespace-nowrap ${q.cents === 0 ? 'text-menthe' : 'text-nuit'}`}>{q.cents === 0 ? 'Gratuit' : formatPrice(q.cents)}</span>
                          </span>
                          <span className="block text-xs text-henne mt-0.5">
                            {KIND_LABELS[q.method.kind]} · {q.method.kind === 'retrait' ? 'prêt' : 'livré'} entre {deliveryFrom(q.method.min_days, q.method.max_days)}
                          </span>
                          {on && q.method.description && <span className="block text-xs text-henne mt-1">{q.method.description}</span>}
                          {q.oversizeCount > 0 && q.method.oversize_cents > 0 && q.method.kind !== 'retrait' && (
                            <span className="block text-xs text-henne mt-1">Dont {formatPrice(q.oversizeCount * q.method.oversize_cents)} de supplément grand tapis.</span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </section>
            </div>

            <div className="border-t border-laine-fonce px-6 py-5 space-y-2 shrink-0">
              <div className="flex justify-between"><span>Sous-total</span><span>{formatPrice(subtotal)}</span></div>
              <div className="flex justify-between text-henne">
                <span>Livraison{sellerGroups.length && ownLines.length ? ' (atelier + artisans)' : ''}</span><span>{!canShip ? '—' : shipping === 0 ? 'Offerte' : formatPrice(shipping)}</span>
              </div>
              {missingForFree > 0 && (
                <p className="text-sm text-henne">Plus que {formatPrice(missingForFree)} pour la livraison offerte.</p>
              )}
              <div className="flex justify-between font-display text-xl text-nuit pt-2">
                <span>Total</span><span>{formatPrice(subtotal + shipping)}</span>
              </div>
              {error && <p className="text-sm text-garance bg-garance/10 p-3 rounded-sm" role="alert">{error}</p>}
              <button onClick={pay} disabled={paying || !canShip}
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
