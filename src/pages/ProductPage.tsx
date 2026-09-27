import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Minus, Plus } from 'lucide-react';
import { getProduct } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { useCart } from '../context/CartContext';
import { ProductImage } from '../components/ProductImage';
import { categoryLabel, SHOP } from '../config';
import { formatDimensions, formatPrice } from '../lib/format';
import { SHIPPING } from '../shipping';

export function ProductPage() {
  const { id = '' } = useParams();
  const { data: product, loading, error } = useAsync(() => getProduct(id), [id]);
  const { add, lines } = useCart();
  const [photo, setPhoto] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setPhoto(0); setQuantity(1);
    if (product) document.title = `${product.name} — ${SHOP.name}`;
    return () => { document.title = `${SHOP.name} — Tapis berbères tissés à la main depuis ${SHOP.since}`; };
  }, [product]);

  if (loading) return <p className="max-w-6xl mx-auto px-5 pt-16 text-henne">Chargement…</p>;
  if (error || !product) {
    return (
      <div className="max-w-6xl mx-auto px-5 pt-16">
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

  return (
    <div className="max-w-6xl mx-auto px-5 pt-8">
      <nav className="text-sm text-henne mb-6" aria-label="Fil d’Ariane">
        <Link to="/boutique" className="hover:text-garance">Boutique</Link>
        <span className="mx-2">/</span>
        <Link to={`/boutique?categorie=${product.category}`} className="hover:text-garance">{categoryLabel(product.category)}</Link>
      </nav>

      <div className="grid gap-10 md:grid-cols-[1.2fr_1fr]">
        <div>
          <ProductImage src={images[photo]} alt={product.name} className="w-full aspect-[4/5] rounded-sm" />
          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {images.map((src, i) => (
                <button key={i} onClick={() => setPhoto(i)} aria-label={`Photo ${i + 1}`}
                  className={`rounded-sm overflow-hidden ring-2 ${i === photo ? 'ring-garance' : 'ring-transparent'}`}>
                  <ProductImage src={src} alt="" className="w-full aspect-square" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="md:pt-4">
          <h1 className="font-display text-4xl md:text-5xl text-nuit leading-tight">{product.name}</h1>
          <p className="mt-4 text-2xl">{formatPrice(product.price_cents)}</p>

          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[15px]">
            {dims && (<><dt className="text-henne">Dimensions</dt><dd>{dims}</dd></>)}
            {product.material && (<><dt className="text-henne">Matière</dt><dd>{product.material}</dd></>)}
            {product.origin && (<><dt className="text-henne">Origine</dt><dd>{product.origin}</dd></>)}
            <dt className="text-henne">Disponibilité</dt>
            <dd>{soldOut ? 'Vendu' : product.stock === 1 ? 'Pièce unique, prête à partir' : `${product.stock} disponibles`}</dd>
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
              <div className="bg-laine-fonce p-4 rounded-sm">
                <p className="font-medium">Cette pièce a trouvé preneur.</p>
                <p className="text-sm mt-1">Une pièce semblable vous intéresse ? <Link to="/contact" className="text-garance underline">Écrivez-nous</Link>.</p>
              </div>
            ) : (
              <button onClick={() => add(product, quantity)} disabled={!canAdd}
                className="w-full sm:w-auto bg-garance text-laine px-10 py-4 rounded-sm text-lg font-medium hover:bg-nuit disabled:opacity-50">
                {canAdd ? 'Ajouter au panier' : 'Déjà dans votre panier'}
              </button>
            )}
          </div>

          <p className="mt-4 text-sm text-henne">
            Livraison suivie en {SHIPPING.minDays} à {SHIPPING.maxDays} jours ouvrés, offerte dès {formatPrice(SHIPPING.freeFromCents)}. Retour possible sous 14 jours.
          </p>

          {product.description && (
            <div className="mt-8 border-t border-laine-fonce pt-6">
              <h2 className="font-display text-xl text-nuit">À propos de cette pièce</h2>
              <p className="mt-3 leading-relaxed whitespace-pre-line text-encre/85">{product.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
