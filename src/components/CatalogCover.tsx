import { listProducts } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { SHOP } from '../config';
import { Mark } from './Brand';

/** Couverture du catalogue, composée à partir des photos des produits (toujours à jour). */
export function CatalogCover({ className = 'w-44' }: { className?: string }) {
  const { data } = useAsync(listProducts, []);
  const photos = (data ?? []).filter((p) => p.images.length && p.stock > 0).slice(0, 4).map((p) => p.images[0]);
  return (
    <div className={`${className} relative`} aria-hidden>
      {/* dos du livre et ombre portée */}
      <div className="absolute inset-0 translate-x-2 translate-y-2 bg-nuit/25 blur-md" />
      <div className="relative aspect-[3/4] bg-laine border-l-[6px] border-nuit shadow-xl overflow-hidden flex flex-col [transform:perspective(900px)_rotateY(-8deg)]">
        <div className="px-3 pt-3 flex items-center gap-1.5">
          <Mark className="w-5 h-5" />
          <span className="font-display text-nuit text-sm leading-none">{SHOP.name}</span>
          <span className="ml-auto text-[8px] text-henne">{new Date().getFullYear()}</span>
        </div>
        <div className="lisiere-fine mx-3 mt-2" />
        <div className="grid grid-cols-2 gap-0.5 m-3 mb-2 flex-1 min-h-0">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="tissage bg-cover bg-center" style={photos[i] ? { backgroundImage: `url(${photos[i]})` } : undefined} />
          ))}
        </div>
        <div className="bg-nuit text-laine px-3 py-2">
          <p className="font-display text-base leading-tight">Le catalogue</p>
          <p className="text-[8px] text-laine/70">Bijoux, accessoires et décoration faits main</p>
        </div>
      </div>
    </div>
  );
}
