import { Link } from 'react-router-dom';
import { Product } from '../types';
import { formatDimensions } from '../lib/format';
import { ProductImage } from './ProductImage';
import { FavoriteButton } from './FavoriteButton';
import { Price } from './Price';
import { BadgeStack } from './ProductBadges';
import { useBadges } from '../context/BadgesContext';
import { useSettings } from '../context/SettingsContext';
import { freeShippingThreshold } from '../settings';
import { useReviews } from '../context/ReviewsContext';
import { Stars } from './Stars';
import { useMarketplace } from '../context/MarketplaceContext';

export function ProductCard({ product }: { product: Product }) {
  const review = useReviews().summary(product.id);
  const seller = useMarketplace().sellerOf(product.seller_id);
  const soldOut = product.stock === 0;
  const dims = formatDimensions(product.width_cm, product.length_cm);
  const badges = useBadges().badgesFor(product);
  const { settings } = useSettings();
  const threshold = freeShippingThreshold(settings);
  const freeShipping = !soldOut && threshold !== null && product.price_cents >= threshold;

  return (
    <Link to={`/produit/${product.id}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-laine-fonce">
        <ProductImage src={product.images[0]} alt={product.name}
          className={`w-full h-full transition-transform duration-700 ease-out group-hover:scale-[1.04] ${soldOut ? 'grayscale-[60%] opacity-70' : ''}`} />
        {product.images[1] && !soldOut && (
          <ProductImage src={product.images[1]} alt="" className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        )}
        <div className="absolute top-0 left-0"><BadgeStack badges={badges} max={2} /></div>
        <FavoriteButton id={product.id} name={product.name} className="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 opacity-90 group-hover:opacity-100" />
        {/* Filet garance qui se tisse au survol */}
        <span className="absolute left-0 bottom-0 h-1 w-0 bg-garance transition-all duration-500 group-hover:w-full" aria-hidden />
      </div>
      <div className="mt-3 sm:mt-4">
        <h3 className="font-display text-[1.1rem] sm:text-[1.35rem] leading-tight text-nuit group-hover:text-garance">{product.name}</h3>
        {seller && <p className="text-sm text-henne mt-0.5">par {seller.shop_name}</p>}
        <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <Price cents={product.price_cents} compareAt={product.compare_at_price_cents} />
          {dims && <span className="text-xs sm:text-sm text-henne">{dims}</span>}
        </div>
        {(review || freeShipping) && (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-henne">
            {review && <span className="flex items-center gap-1"><Stars value={review.average} size={12} /> {review.count} avis</span>}
            {freeShipping && <span className="text-menthe">Livraison offerte</span>}
          </p>
        )}
      </div>
    </Link>
  );
}
