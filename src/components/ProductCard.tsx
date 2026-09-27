import { Link } from 'react-router-dom';
import { Product } from '../types';
import { formatDimensions, formatPrice } from '../lib/format';
import { ProductImage } from './ProductImage';

export function ProductCard({ product }: { product: Product }) {
  const soldOut = product.stock === 0;
  const dims = formatDimensions(product.width_cm, product.length_cm);

  return (
    <Link to={`/produit/${product.id}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-laine-fonce">
        <ProductImage src={product.images[0]} alt={product.name}
          className={`w-full h-full transition-transform duration-500 group-hover:scale-[1.03] ${soldOut ? 'opacity-60' : ''}`} />
        {soldOut && (
          <span className="absolute top-3 left-3 bg-encre text-laine text-sm px-2.5 py-1 rounded-sm">Vendu</span>
        )}
        {!soldOut && product.stock === 1 && (
          <span className="absolute top-3 left-3 bg-laine text-nuit text-sm px-2.5 py-1 rounded-sm">Pièce unique</span>
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg leading-snug text-encre group-hover:text-garance">{product.name}</h3>
          {dims && <p className="text-sm text-henne mt-0.5">{dims}</p>}
        </div>
        <p className="font-medium whitespace-nowrap">{formatPrice(product.price_cents)}</p>
      </div>
    </Link>
  );
}
