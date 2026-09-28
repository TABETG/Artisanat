import { Link } from 'react-router-dom';
import { Product } from '../types';
import { formatDimensions } from '../lib/format';
import { ProductImage } from './ProductImage';
import { FavoriteButton } from './FavoriteButton';
import { discountPercent, Price } from './Price';
import { useReviews } from '../context/ReviewsContext';
import { Stars } from './Stars';

export function ProductCard({ product }: { product: Product }) {
  const review = useReviews().summary(product.id);
  const soldOut = product.stock === 0;
  const dims = formatDimensions(product.width_cm, product.length_cm);
  const off = discountPercent(product.price_cents, product.compare_at_price_cents);
  const low = !soldOut && product.stock > 1 && product.stock <= (product.low_stock_threshold || 2);

  return (
    <Link to={`/produit/${product.id}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-laine-fonce">
        <ProductImage src={product.images[0]} alt={product.name}
          className={`w-full h-full transition-transform duration-500 group-hover:scale-[1.03] ${soldOut ? 'opacity-60' : ''}`} />
        {product.images[1] && !soldOut && (
          <ProductImage src={product.images[1]} alt="" className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        )}
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
          {soldOut && <span className="bg-encre text-laine text-sm px-2.5 py-1 rounded-sm">Rupture de stock</span>}
          {off && !soldOut && <span className="bg-garance text-laine text-sm font-medium px-2.5 py-1 rounded-sm">−{off} %</span>}
          {low && <span className="bg-laine text-garance text-sm px-2.5 py-1 rounded-sm">Plus que {product.stock}</span>}
          {!soldOut && product.stock === 1 && <span className="bg-laine text-nuit text-sm px-2.5 py-1 rounded-sm">Pièce unique</span>}
        </div>
        <FavoriteButton id={product.id} name={product.name} className="absolute top-2.5 right-2.5" />
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg leading-snug text-encre group-hover:text-garance">{product.name}</h3>
          {dims && <p className="text-sm text-henne mt-0.5">{dims}</p>}
          {review && <p className="mt-1 flex items-center gap-1.5 text-xs text-henne"><Stars value={review.average} size={13} /> {review.count}</p>}
        </div>
        <p className="whitespace-nowrap text-right"><Price cents={product.price_cents} compareAt={product.compare_at_price_cents} /></p>
      </div>
    </Link>
  );
}
