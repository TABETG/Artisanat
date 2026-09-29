import { Link, useParams } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { getSellerBySlug, listSellers } from '../lib/marketplace';
import { listProducts } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { ProductCard } from '../components/ProductCard';
import { ProductImage } from '../components/ProductImage';
import { countryName } from '../shipping';
import { formatPrice } from '../lib/format';

/** Tous les artisans de la place de marché. */
export function ArtisansPage() {
  const { data } = useAsync(() => Promise.all([listSellers(), listProducts()]), []);
  const [sellers, products] = data ?? [[], []];
  return (
    <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-12">
      <div className="lisiere-fine w-16 mb-5" aria-hidden />
      <h1 className="font-display text-[2.8rem] sm:text-6xl md:text-7xl text-nuit">Nos artisans</h1>
      <p className="lecture mt-5 text-[1.2rem] text-encre/80 max-w-2xl">À côté de notre atelier, des créateurs que nous avons choisis pour leur savoir-faire. Chacun fabrique et expédie ses propres pièces.</p>
      <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {sellers.map((s) => {
          const mine = products.filter((p) => p.seller_id === s.id);
          return (
            <Link key={s.id} to={`/artisans/${s.slug}`} className="group block border border-laine-fonce bg-white/50 hover:border-nuit">
              <div className="grid grid-cols-3 gap-0.5 bg-laine-fonce">
                {[0, 1, 2].map((i) => <ProductImage key={i} src={mine[i]?.images[0]} alt="" className="w-full aspect-square" />)}
              </div>
              <div className="p-5">
                <p className="font-display text-3xl text-nuit group-hover:text-garance">{s.shop_name}</p>
                <p className="text-henne mt-1">{s.craft}</p>
                <p className="text-sm text-henne mt-2 flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {s.city}, {countryName(s.country)} · {mine.length} création{mine.length > 1 ? 's' : ''}</p>
              </div>
            </Link>
          );
        })}
      </div>
      <div className="mt-16 border-t border-laine-fonce pt-10 flex flex-wrap items-center justify-between gap-4">
        <p className="font-display text-3xl text-nuit">Vous êtes artisan ?</p>
        <Link to="/vendre" className="bg-nuit text-laine px-7 py-3.5 font-medium hover:bg-garance">Vendre mes créations</Link>
      </div>
    </div>
  );
}

/** Page publique d'un artisan : présentation et créations. */
export function ArtisanProfilePage() {
  const { slug = '' } = useParams();
  const { data, loading } = useAsync(() => Promise.all([getSellerBySlug(slug), listProducts()]), [slug]);
  if (loading) return <p className="max-w-7xl mx-auto px-5 lg:px-8 pt-16 text-henne">Chargement…</p>;
  const [seller, products] = data ?? [null, []];
  if (!seller) return <div className="max-w-3xl mx-auto px-5 pt-16"><h1 className="font-display text-4xl text-nuit">Artisan introuvable</h1><Link to="/artisans" className="text-garance underline mt-4 inline-block">Voir nos artisans</Link></div>;
  const mine = products.filter((p) => p.seller_id === seller.id);
  return (
    <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-8">
      <nav className="text-sm text-henne mb-6"><Link to="/artisans" className="hover:text-garance">Nos artisans</Link> <span className="mx-2">/</span> {seller.shop_name}</nav>
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="lisiere-fine w-16 mb-5" aria-hidden />
          <h1 className="font-display text-[2.8rem] sm:text-6xl md:text-7xl text-nuit">{seller.shop_name}</h1>
          <p className="text-lg text-henne mt-3">{seller.craft}</p>
          <p className="text-henne mt-1 flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {seller.city}, {countryName(seller.country)}</p>
          {seller.bio && <p className="lecture mt-6 whitespace-pre-line text-encre/85">{seller.bio}</p>}
          <dl className="mt-8 text-sm grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-laine-fonce pt-5">
            <dt className="text-henne">Vendeur</dt><dd>{seller.legal_status === 'professionnel' ? `Professionnel${seller.siret ? ` · SIRET ${seller.siret}` : ''}` : 'Particulier'}</dd>
            <dt className="text-henne">Expédition</dt><dd>depuis {seller.city}, sous {seller.prep_days} jours · France {formatPrice(seller.shipping_france_cents)}{seller.free_shipping_from_cents ? `, offerte dès ${formatPrice(seller.free_shipping_from_cents)}` : ''}</dd>
            {seller.return_policy && <><dt className="text-henne">Retours</dt><dd>{seller.return_policy}</dd></>}
          </dl>
        </div>
        <div className="lg:col-span-7">
          <p className="font-display text-3xl text-nuit mb-6">{mine.length} création{mine.length > 1 ? 's' : ''}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-x-5 gap-y-12">{mine.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </div>
      </div>
    </div>
  );
}
