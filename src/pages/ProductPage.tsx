import type { ReactNode } from 'react';
import { Fragment, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Hand, Lock, Minus, Plus, RotateCcw, Ruler, Share2, Truck, X } from 'lucide-react';
import { getProduct, listProducts } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { useCart } from '../context/CartContext';
import { ProductImage } from '../components/ProductImage';
import { ProductCard } from '../components/ProductCard';
import { StockAlertForm } from '../components/StockAlertForm';
import { FavoriteButton } from '../components/FavoriteButton';
import { discountPercent, Price } from '../components/Price';
import { BadgePill, BadgeStack } from '../components/ProductBadges';
import { useBadges } from '../context/BadgesContext';
import { SizeGuide } from '../components/SizeGuide';
import { recentlyViewed, rememberViewed } from '../lib/recentlyViewed';
import { trackProduct } from '../lib/api';
import { colorInfo, SHOP } from '../config';
import { formatDimensions, formatPrice } from '../lib/format';
import { useCategories, useSettings } from '../context/SettingsContext';
import { useReviews } from '../context/ReviewsContext';
import { ProductReviews } from '../components/ProductReviews';
import { Stars } from '../components/Stars';

const DEFAULT_CARE = 'Passez l’aspirateur sans brosse rotative, dans le sens du poil. En cas de tache, tamponnez à l’eau froide sans frotter. Tournez le tapis une à deux fois par an.';

export function ProductPage() {
  const { id = '' } = useParams();
  const { data: product, loading, error } = useAsync(() => getProduct(id), [id]);
  const { data: all } = useAsync(listProducts, []);
  const { add, lines } = useCart();
  const { settings } = useSettings();
  const { summary } = useReviews();
  const { label: categoryLabel } = useCategories();
  const { badgesFor } = useBadges();
  const [photo, setPhoto] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setPhoto(0); setQuantity(1);
    if (!product) return;
    rememberViewed(product.id);
    trackProduct(product.id, 'view');
    document.title = `${product.name} — ${SHOP.name}`;
    // Données structurées : aident Google à afficher prix et disponibilité
    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.text = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Product', name: product.name, description: product.description,
      image: product.images.map((i) => new URL(i, window.location.origin).href), sku: product.reference || undefined,
      material: product.material, brand: { '@type': 'Brand', name: SHOP.name },
      ...(summary(product.id) ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: summary(product.id)!.average.toFixed(1), reviewCount: summary(product.id)!.count } } : {}),
      offers: { '@type': 'Offer', priceCurrency: 'EUR', price: (product.price_cents / 100).toFixed(2), url: window.location.href,
        availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', itemCondition: 'https://schema.org/NewCondition' },
    });
    document.head.appendChild(ld);
    return () => { ld.remove(); document.title = `${SHOP.name} — Tapis berbères tissés à la main depuis ${SHOP.since}`; };
  }, [product, summary]);

  if (loading) return <p className="max-w-7xl mx-auto px-5 lg:px-8 pt-16 text-henne">Chargement…</p>;
  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-16">
        <h1 className="font-display text-3xl text-nuit">Cette création n’existe plus</h1>
        <p className="mt-2 text-henne">Elle a peut-être été retirée de la boutique.</p>
        <Link to="/boutique" className="inline-block mt-6 bg-nuit text-laine px-6 py-3 rounded-sm">Voir la boutique</Link>
      </div>
    );
  }

  const soldOut = product.stock === 0;
  const inCart = lines.find((l) => l.id === product.id)?.quantity ?? 0;
  const canAdd = !soldOut && inCart < product.stock;
  const dims = formatDimensions(product.width_cm, product.length_cm);
  const images = product.images.length ? product.images : [null];
  const off = discountPercent(product.price_cents, product.compare_at_price_cents);
  const low = !soldOut && product.stock > 1 && product.stock <= (product.low_stock_threshold || 2);
  const viewed = recentlyViewed(product.id).map((vid) => (all ?? []).find((p) => p.id === vid)).filter((p): p is NonNullable<typeof p> => !!p).slice(0, 4);
  const similar = (all ?? []).filter((p) => p.id !== product.id && p.stock > 0 && p.category === product.category).slice(0, 4);

  async function share() {
    const data = { title: product!.name, url: window.location.href };
    if (navigator.share) { try { await navigator.share(data); } catch { /* annulé */ } return; }
    await navigator.clipboard?.writeText(window.location.href);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  const specs: [string, string | null][] = [
    ['Dimensions', dims],
    ['Surface', product.width_cm && product.length_cm ? `${((product.width_cm * product.length_cm) / 10000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} m²` : null],
    ['Technique', product.technique || null],
    ['Matière', product.material || null],
    ['Hauteur des poils', product.pile_height_mm ? `${product.pile_height_mm} mm` : null],
    ['Poids', product.weight_kg ? `${String(product.weight_kg).replace('.', ',')} kg` : null],
    ['Origine', product.origin || null],
    ['Référence', product.reference || null],
  ];

  return (
    <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-8">
      <nav className="text-sm text-henne mb-6" aria-label="Fil d’Ariane">
        <Link to="/boutique" className="hover:text-garance">Boutique</Link>
        <span className="mx-2">/</span>
        <Link to={`/boutique?categorie=${product.category}`} className="hover:text-garance">{categoryLabel(product.category)}</Link>
      </nav>

      <div className="grid gap-10 md:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="relative">
            <button onClick={() => images[photo] && setZoom(true)} className="block w-full cursor-zoom-in" aria-label="Agrandir la photo">
              <ProductImage src={images[photo]} alt={product.name} className="w-full aspect-[4/5]" />
            </button>
            <div className="absolute top-4 left-4"><BadgeStack badges={badgesFor(product).filter((b) => ['promo', 'meilleure-vente', 'nouveau', 'rupture'].includes(b.id))} max={2} /></div>
            <FavoriteButton id={product.id} name={product.name} className="absolute top-3 right-3" />
          </div>
          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {images.map((src, i) => (
                <button key={i} onClick={() => setPhoto(i)} aria-label={`Photo ${i + 1}`} aria-current={i === photo}
                  className={`rounded-sm overflow-hidden ring-2 ${i === photo ? 'ring-garance' : 'ring-transparent'}`}>
                  <ProductImage src={src} alt="" className="w-full aspect-square" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="md:pt-4">
          <h1 className="font-display text-5xl md:text-6xl text-nuit">{product.name}</h1>
          {(() => { const r = summary(product.id); return r && (
            <a href="#avis" className="mt-2 inline-flex items-center gap-2 text-sm text-henne hover:text-garance">
              <Stars value={r.average} /> {r.count} avis
            </a>
          ); })()}
          <p className="mt-4"><Price cents={product.price_cents} compareAt={product.compare_at_price_cents} size="lg" /></p>
          {off && (
            <p className="text-sm text-garance mt-1">
              Vous économisez {formatPrice(product.compare_at_price_cents! - product.price_cents)}
              {product.promo_ends_at && <> · offre valable jusqu’au {new Date(product.promo_ends_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</>}
            </p>
          )}
          {settings.installments_enabled && !soldOut && product.price_cents >= settings.installments_min_cents && (
            <p className="text-sm mt-2">ou <strong>3 × {formatPrice(Math.ceil(product.price_cents / 3))}</strong> sans frais avec Klarna</p>
          )}
          {(() => {
            const shown = badgesFor(product).filter((b) => !['promo', 'rupture', 'unique', 'stock-bas'].includes(b.id));
            return shown.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{shown.map((b) => <BadgePill key={b.id} badge={b} size="sm" />)}</div>;
          })()}

          {product.colors.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2" aria-label="Couleurs">
              {product.colors.map((c) => {
                const info = colorInfo(c);
                return info && (
                  <span key={c} className="inline-flex items-center gap-1.5 text-sm pl-1 pr-2.5 py-1 rounded-full border border-laine-fonce">
                    <span className="w-4 h-4 rounded-full border border-black/10" style={{ background: info.hex }} />{info.label}
                  </span>
                );
              })}
            </div>
          )}

          {product.category === 'tapis' && dims && <SizeGuide width={product.width_cm} length={product.length_cm} />}

          <dl className="mt-7 grid grid-cols-[auto_1fr] gap-x-8 text-[15px] border-t border-laine-fonce [&>dt]:py-2 [&>dd]:py-2 [&>dt]:border-b [&>dd]:border-b [&>dt]:border-laine-fonce [&>dd]:border-laine-fonce">
            {specs.filter(([, v]) => v).map(([k, v]) => (<Fragment key={k}><dt className="text-henne">{k}</dt><dd>{v}</dd></Fragment>))}
            <dt className="text-henne">Disponibilité</dt>
            <dd className={soldOut || low ? 'text-garance font-medium' : 'text-emerald-800'}>
              {soldOut ? 'Rupture de stock' : product.stock === 1 ? 'Pièce unique, prête à partir' : low ? `Plus que ${product.stock} disponibles` : 'En stock, prêt à partir'}
            </dd>
          </dl>

          {!soldOut && product.stock > 1 && (
            <div className="mt-6 inline-flex items-center border border-laine-fonce rounded-sm">
              <button className="p-3 disabled:opacity-30" onClick={() => setQuantity((q) => q - 1)} disabled={quantity <= 1} aria-label="Retirer un"><Minus className="w-4 h-4" /></button>
              <span className="w-10 text-center" aria-live="polite">{quantity}</span>
              <button className="p-3 disabled:opacity-30" onClick={() => setQuantity((q) => q + 1)} disabled={quantity + inCart >= product.stock} aria-label="Ajouter un"><Plus className="w-4 h-4" /></button>
            </div>
          )}

          <div className="mt-6">
            {soldOut ? (
              <StockAlertForm productId={product.id} />
            ) : (
              <button onClick={() => add(product, quantity)} disabled={!canAdd}
                className="w-full sm:w-auto bg-garance text-laine px-10 py-4 rounded-sm text-lg font-medium hover:bg-nuit disabled:opacity-50">
                {canAdd ? 'Ajouter au panier' : 'Déjà dans votre panier'}
              </button>
            )}
            {!soldOut && inCart > 0 && (
              <p className="mt-3 text-sm text-henne">
                Dans votre panier : {inCart}.{' '}
                <Link to="/boutique" className="text-garance underline">Continuer mes achats</Link>
              </p>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {product.made_to_order && (
              <Link to={`/sur-mesure?produit=${product.id}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm border border-nuit/25 text-nuit hover:border-nuit">
                <Ruler className="w-4 h-4" /> Demander un modèle sur mesure
              </Link>
            )}
            <button onClick={share} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm border border-nuit/25 text-nuit hover:border-nuit">
              <Share2 className="w-4 h-4" /> {copied ? 'Lien copié' : 'Partager'}
            </button>
          </div>

          <ul className="mt-7 grid gap-3 text-sm border-y border-laine-fonce py-5">
            <li className="flex gap-3"><Truck className="w-5 h-5 text-garance shrink-0" />Livraison suivie en {settings.shipping_min_days} à {settings.shipping_max_days} jours ouvrés{settings.free_shipping_from_cents > 0 ? `, offerte dès ${formatPrice(settings.free_shipping_from_cents)}` : ''}</li>
            <li className="flex gap-3"><RotateCcw className="w-5 h-5 text-garance shrink-0" />14 jours pour changer d’avis</li>
            <li className="flex gap-3"><Lock className="w-5 h-5 text-garance shrink-0" />Paiement sécurisé : Visa, Mastercard, CB, Apple Pay, Google Pay{settings.installments_enabled ? ', Klarna' : ''}</li>
            {settings.pickup_enabled && <li className="flex gap-3"><Hand className="w-5 h-5 text-garance shrink-0" />Retrait gratuit possible à l’atelier</li>}
            <li className="flex gap-3"><Hand className="w-5 h-5 text-garance shrink-0" />Fait à la main : chaque pièce est unique</li>
          </ul>

          {product.description && (
            <Details title="Description" open>
              <p className="lecture whitespace-pre-line text-encre/85">{product.description}</p>
            </Details>
          )}
          <Details title="Entretien"><p className="leading-relaxed text-encre/85 whitespace-pre-line">{product.care || DEFAULT_CARE}</p></Details>
          <Details title="Livraison et retours">
            <p className="leading-relaxed text-encre/85">Expédié sous 2 jours ouvrés, soigneusement emballé, avec numéro de suivi. Retour possible sous 14 jours. <Link to="/livraison-et-retours" className="text-garance underline">En savoir plus</Link></p>
          </Details>
        </div>
      </div>

      <ProductReviews productId={product.id} />

      {similar.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display text-3xl text-nuit mb-8">Vous aimerez aussi</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-10">
            {similar.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {viewed.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display text-3xl text-nuit mb-8">Récemment consultés</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-10">
            {viewed.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {!soldOut && (
        <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-laine/95 backdrop-blur border-t border-laine-fonce px-4 py-3 flex items-center gap-3"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
          <div className="min-w-0 flex-1">
            <p className="text-sm truncate">{product.name}</p>
            <Price cents={product.price_cents} compareAt={product.compare_at_price_cents} />
          </div>
          <button onClick={() => add(product, quantity)} disabled={!canAdd} className="bg-garance text-laine px-5 py-3 rounded-sm font-medium disabled:opacity-50">
            {canAdd ? 'Ajouter au panier' : 'Dans le panier'}
          </button>
        </div>
      )}
      <div className="h-20 md:hidden" aria-hidden />

      {zoom && images[photo] && (
        <div className="fixed inset-0 z-50 bg-encre/95 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Photo agrandie" onClick={() => setZoom(false)}>
          <img src={images[photo]!} alt={product.name} className="max-w-[95vw] max-h-[90vh] object-contain" onClick={(e) => e.stopPropagation()} />
          <button className="absolute top-4 right-4 p-3 text-laine" aria-label="Fermer" onClick={() => setZoom(false)}><X className="w-7 h-7" /></button>
          {images.length > 1 && (
            <>
              <button className="absolute left-2 p-3 text-laine" aria-label="Photo précédente" onClick={(e) => { e.stopPropagation(); setPhoto((photo - 1 + images.length) % images.length); }}><ChevronLeft className="w-9 h-9" /></button>
              <button className="absolute right-2 p-3 text-laine" aria-label="Photo suivante" onClick={(e) => { e.stopPropagation(); setPhoto((photo + 1) % images.length); }}><ChevronRight className="w-9 h-9" /></button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Details({ title, open, children }: { title: string; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className="border-b border-laine-fonce py-4 group">
      <summary className="font-display text-xl text-nuit cursor-pointer list-none flex justify-between items-center">
        {title}<span className="text-2xl text-henne group-open:rotate-45 transition-transform" aria-hidden>+</span>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
