import { Link } from 'react-router-dom';
import { ArrowRight, Gem, Hand, Home, ShoppingBag, Users } from 'lucide-react';
import { listProducts } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { ProductCard } from '../components/ProductCard';
import { ProductImage } from '../components/ProductImage';
import { SectionHeading } from '../components/SectionHeading';
import { FavoriteButton } from '../components/FavoriteButton';
import { BadgeStack } from '../components/ProductBadges';
import { Price } from '../components/Price';
import { SHOP } from '../config';
import { useSettings } from '../context/SettingsContext';
import { useBadges } from '../context/BadgesContext';
import { useCart } from '../context/CartContext';
import { discountOf } from '../badges';
import { Product } from '../types';

/** Grille qui s'adapte au nombre de pièces : pas de colonnes vides quand il y en a peu. */
export function gridFor(n: number): string {
  if (n <= 1) return 'grid grid-cols-1 max-w-sm';
  if (n === 2) return 'grid grid-cols-2 max-w-3xl';
  if (n === 3) return 'grid grid-cols-2 md:grid-cols-3 max-w-5xl';
  return 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
}

/** Titre en deux temps : la fin, après la virgule, passe en italique (« …, pièce après pièce. »). */
function HeroTitle({ text }: { text: string }) {
  const i = text.indexOf(',');
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i + 1)}<br /><em>{text.slice(i + 1).trim()}</em></>;
}

export function HomePage() {
  const { data: products, loading, error } = useAsync(listProducts, []);
  const { settings } = useSettings();
  const { bestSellerIds } = useBadges();
  const all = products ?? [];
  const available = all.filter((p) => p.stock > 0);
  const promos = available.filter((p) => discountOf(p)).sort((a, b) => (discountOf(b) ?? 0) - (discountOf(a) ?? 0)).slice(0, 4);
  const best = available.filter((p) => bestSellerIds.has(p.id)).sort((a, b) => b.sales_count - a.sales_count).slice(0, 4);
  const featured = [...available.filter((p) => p.featured), ...available.filter((p) => !p.featured)];
  const withPhotos = featured.filter((p) => p.images.length > 0);
  const heroImage = settings.hero_image || withPhotos[0]?.images[0];
  const storyImage = settings.story_image || withPhotos[1]?.images[0] || withPhotos[0]?.images[0];
  const years = new Date().getFullYear() - SHOP.since;
  const ready = featured.slice(0, 8);

  return (
    <>
      {/* ---------- Ouverture : texte éditorial et grande photographie ---------- */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid md:grid-cols-12 items-stretch">
          <div className="md:col-span-6 px-5 lg:px-8 pt-10 pb-12 md:py-20 lg:py-24 flex flex-col justify-center">
            <p className="surtitre text-henne">{SHOP.heritage}</p>
            <div className="lisiere-fine w-12 mt-4" aria-hidden />
            <h1 className="font-display text-nuit mt-6 text-[2.7rem] leading-[1.05] sm:text-[3.4rem] lg:text-[3.9rem] xl:text-[4.4rem]">
              <HeroTitle text={settings.hero_title} />
            </h1>
            <p className="lecture mt-6 text-encre/80 max-w-lg">{settings.hero_subtitle}</p>
            <div className="mt-8 flex flex-col min-[420px]:flex-row gap-3">
              <Link to="/boutique" className="btn btn-primaire"><ShoppingBag className="w-4 h-4" /> Voir les créations</Link>
              <Link to="/nos-realisations" className="btn btn-secondaire">Découvrir l’atelier</Link>
            </div>
          </div>
          <div className="md:col-span-6 relative min-h-[320px] sm:min-h-[420px] md:min-h-[560px]">
            {heroImage
              ? <ProductImage src={heroImage} alt="" className="absolute inset-0 w-full h-full" priority />
              : <div className="tissage absolute inset-0" aria-hidden />}
            {/* fondu vers le texte sur grand écran */}
            <div className="hidden md:block absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-laine to-transparent" aria-hidden />
          </div>
        </div>
      </section>
      <div className="frise" aria-hidden />

      {/* ---------- Pièces disponibles ---------- */}
      <section className="max-w-7xl mx-auto px-5 lg:px-8 pt-16 md:pt-24">
        <SectionHeading title="Prêts à partir" intro="Des pièces faites main et photographiées à l’atelier. Ce que vous voyez est ce que vous recevez."
          link={{ to: '/boutique', label: 'Toute la boutique' }} />
        {loading && <p className="text-henne">Chargement des créations…</p>}
        {error && <p className="text-garance">Les créations n’ont pas pu être chargées. Rechargez la page.</p>}
        {!loading && !error && ready.length === 0 && <p className="text-henne">De nouvelles pièces arrivent bientôt.</p>}
        <div className={`${gridFor(ready.length)} gap-x-5 gap-y-10`}>
          {ready.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* ---------- Promotions : aplat indigo ---------- */}
      {promos.length > 0 && (
        <section className="mt-20 md:mt-28 bg-nuit motif-fond text-laine">
          <div className="max-w-7xl mx-auto px-5 lg:px-8 py-14 md:py-16">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
              <div>
                <div className="lisiere-fine w-12 mb-5" aria-hidden />
                <h2 className="font-display text-[2.2rem] sm:text-5xl">En promotion</h2>
                <p className="mt-2 text-laine/80">Quelques pièces à prix doux, pour quelques jours.</p>
              </div>
              <Link to="/boutique?promotion=1" className="lien-tisse font-medium pb-0.5 inline-flex items-center gap-2">Toutes les promotions <ArrowRight className="w-4 h-4" /></Link>
            </div>
            {promos.length === 1
              ? <PromoFeature product={promos[0]} />
              : (
                <div className={`${gridFor(promos.length)} gap-x-5 gap-y-10 [&_h3]:text-laine [&_.text-henne]:text-laine/70 [&_.line-through]:text-laine/60 [&_.text-garance]:text-safran [&_.text-nuit]:text-laine`}>
                  {promos.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              )}
          </div>
        </section>
      )}

      <Shelf title="Les plus choisis" intro="Les pièces que nos clients commandent le plus." link="/boutique?tri=ventes" products={best} />

      {/* ---------- Notre histoire ---------- */}
      <section className="mt-20 md:mt-28 grid md:grid-cols-2 items-stretch">
        <div className="relative min-h-[300px] sm:min-h-[420px]">
          {storyImage
            ? <ProductImage src={storyImage} alt="" className="absolute inset-0 w-full h-full" />
            : <div className="tissage absolute inset-0" aria-hidden />}
        </div>
        <div className="px-5 sm:px-10 lg:px-16 py-14 md:py-20 max-w-2xl">
          <div className="lisiere-fine w-12" aria-hidden />
          <p className="font-display text-nuit text-3xl sm:text-4xl mt-5">{SHOP.name}</p>
          <p className="text-safran mt-1 text-sm"><span className="tracking-[.14em]">by</span> <span className="signature">{SHOP.brand}</span></p>
          <h2 className="font-display italic font-medium text-nuit text-[2rem] sm:text-[2.6rem] mt-6">{years} ans de savoir-faire familial</h2>
          <p className="lecture mt-5 text-encre/80">
            Le métal est ciselé, les perles enfilées, la laine tissée à la main, en France, avec les motifs et les gestes
            hérités de notre famille. Chaque pièce demande du temps : aucune n’est identique à une autre.
          </p>
          <ul className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-px bg-laine-fonce border-y border-laine-fonce">
            {[
              [<Hand key="h" className="w-6 h-6" />, 'Savoir-faire artisanal'],
              [<Gem key="g" className="w-6 h-6" />, 'Pièces façonnées une à une'],
              [<Home key="m" className="w-6 h-6" />, 'Fait main en France'],
              [<Users key="u" className="w-6 h-6" />, 'Héritage familial'],
            ].map(([icon, label], i) => (
              <li key={i} className="bg-laine py-5 px-2 flex flex-col items-center text-center gap-2 text-sm font-medium text-nuit">
                <span className="text-safran">{icon}</span>{label}
              </li>
            ))}
          </ul>
          <Link to="/notre-histoire" className="btn btn-secondaire mt-8">Découvrir notre histoire <ArrowRight className="w-4 h-4" /></Link>
        </div>
      </section>
    </>
  );
}

/** Une seule pièce en promotion : mise en avant avec photo, description et ajout au panier. */
function PromoFeature({ product }: { product: Product }) {
  const { add, open } = useCart();
  const badges = useBadges().badgesFor(product);
  return (
    <div className="grid sm:grid-cols-[minmax(0,22rem)_1fr] gap-8 md:gap-12 items-center max-w-4xl">
      <Link to={`/produit/${product.id}`} className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-laine-fonce">
        <ProductImage src={product.images[0]} alt={product.name} className="w-full h-full" />
        <div className="absolute top-0 left-0"><BadgeStack badges={badges} max={2} /></div>
        <FavoriteButton id={product.id} name={product.name} className="absolute top-2.5 right-2.5" />
      </Link>
      <div>
        <Link to={`/produit/${product.id}`} className="font-display text-3xl hover:text-safran">{product.name}</Link>
        <div className="mt-3 text-xl [&_.text-garance]:text-safran [&_.text-nuit]:text-laine [&_.line-through]:text-laine/60 [&_.text-henne]:text-laine/70">
          <Price cents={product.price_cents} compareAt={product.compare_at_price_cents} />
        </div>
        {product.description && <p className="mt-4 text-laine/80 line-clamp-3 max-w-md">{product.description}</p>}
        <button onClick={() => { add(product); open(); }} className="btn btn-dore mt-6"><ShoppingBag className="w-4 h-4" /> Ajouter au panier</button>
      </div>
    </div>
  );
}

function Shelf({ title, intro, link, products }: { title: string; intro: string; link: string; products: Product[] }) {
  if (!products.length) return null;
  return (
    <section className="max-w-7xl mx-auto px-5 lg:px-8 pt-16 md:pt-24">
      <SectionHeading title={title} intro={intro} link={{ to: link, label: 'Tout voir' }} />
      <div className={`${gridFor(products.length)} gap-x-5 gap-y-10`}>
        {products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}

