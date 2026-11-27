import { Link } from 'react-router-dom';
import { listProducts } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { ProductImage } from '../components/ProductImage';
import { formatDimensions } from '../lib/format';
import { FEATURES } from '../features';

/** Pièces déjà vendues (elles inspirent aussi les commandes sur mesure, si cette fonction est activée). */
export function RealisationsPage() {
  const { data, loading } = useAsync(listProducts, []);
  const sold = (data ?? []).filter((p) => p.stock === 0 && p.images.length > 0);
  return (
    <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-12">
      <div className="lisiere-fine w-16 mb-5" aria-hidden />
      <p className="surtitre text-henne mb-3">L’atelier</p>
      <h1 className="font-display text-[2.8rem] sm:text-6xl md:text-7xl text-nuit">Nos réalisations</h1>
      <p className="lecture mt-5 text-[1.2rem] text-encre/80 max-w-2xl">Ces pièces ont trouvé leur maison.{FEATURES.customOrdersEnabled ? ' Une vous plaît ? Nous pouvons tisser un modèle proche, à vos dimensions.' : ' De nouvelles créations arrivent régulièrement dans la boutique.'}</p>
      {loading && <p className="mt-8 text-henne">Chargement…</p>}
      {!loading && sold.length === 0 && (
        <div className="mt-8 text-henne space-y-4">
          <p>Les pièces parties chez leurs nouveaux propriétaires apparaîtront ici.</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/boutique" className="btn btn-primaire">Voir les créations disponibles</Link>
            <Link to="/notre-histoire" className="btn btn-secondaire">Notre histoire</Link>
          </div>
        </div>
      )}
      <div className="mt-10 columns-2 lg:columns-3 gap-5 [column-fill:_balance]">
        {sold.map((p) => (
          <figure key={p.id} className="mb-5 break-inside-avoid">
            <ProductImage src={p.images[0]} alt={p.name} className="w-full rounded-sm" />
            <figcaption className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-display text-nuit">{p.name}{formatDimensions(p.width_cm, p.length_cm) && <span className="text-sm text-henne font-sans"> · {formatDimensions(p.width_cm, p.length_cm)}</span>}</span>
              {FEATURES.customOrdersEnabled && <Link to={`/sur-mesure?produit=${p.id}`} className="text-sm text-garance underline">Le même pour moi</Link>}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
