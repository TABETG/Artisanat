import { Link } from 'react-router-dom';
import { ArrowRight, Hand, Leaf, MapPin, ShoppingBag, Users } from 'lucide-react';
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
import { Mark } from '../components/Brand';

/** Grille qui s'adapte au nombre de pièces : pas de colonnes vides quand il y en a peu. */
export function gridFor(n: number): string {
  // Toujours la largeur d'une carte sur quatre : avec peu de pièces, les cartes gardent leur taille
  return n <= 1 ? 'grid grid-cols-2 lg:grid-cols-4' : 'grid grid-cols-2 lg:grid-cols-4';
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
  // Photo de l'histoire : jamais la même que celle de l'ouverture (sinon, panneau décoratif)
  const storyImage = settings.story_image
    || [...withPhotos.flatMap((p) => p.images)].find((src) => src && src !== heroImage);
  const years = new Date().getFullYear() - SHOP.since;
  const ready = featured.slice(0, 8);

  return (
    <>
      {/* ---------- Ouverture : la photographie occupe tout le bandeau, le texte se pose sur un fondu ivoire ---------- */}
      <section className="relative overflow-hidden lumiere-chaude">
        <div className="relative h-[300px] sm:h-[400px] md:h-auto md:absolute md:inset-y-0 md:right-0 md:w-[64%]">
          {heroImage
            ? <ProductImage src={heroImage} alt="" className="absolute inset-0 w-full h-full" priority />
            : <DecorPanel />}
          {/* fondu ivoire vers le texte (bureau) et vers le bas (téléphone) */}
          <div className="hidden md:block absolute inset-y-0 left-0 w-[55%] bg-gradient-to-r from-laine via-laine/70 to-transparent" aria-hidden />
          <div className="md:hidden absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-laine to-transparent" aria-hidden />
        </div>
        <div className="relative max-w-7xl mx-auto px-5 lg:px-8">
          <div className="md:w-[52%] lg:w-[48%] pt-6 pb-12 md:py-24 lg:py-28 md:min-h-[620px] flex flex-col justify-center">
            <p className="surtitre text-nuit/80">{SHOP.heritage}</p>
            <div className="lisiere-fine w-12 mt-4" aria-hidden />
            <h1 className="font-display text-nuit mt-6 text-[2.6rem] leading-[1.04] sm:text-[3.3rem] lg:text-[3.8rem] xl:text-[4.2rem]">
              <HeroTitle text={settings.hero_title} />
            </h1>
            <p className="mt-6 text-[1.02rem] leading-relaxed text-encre/80 max-w-md">{settings.hero_subtitle}</p>
            <div className="mt-8 flex flex-col min-[420px]:flex-row gap-3">
              <Link to="/boutique" className="btn btn-primaire"><ShoppingBag className="w-4 h-4" /> Voir les créations</Link>
              <Link to="/nos-realisations" className="btn btn-secondaire bg-laine/70">Découvrir l’atelier</Link>
            </div>
          </div>
        </div>
      </section>
      <div className="frise" aria-hidden />

      {/* ---------- Pièces disponibles ---------- */}
      <section className="max-w-7xl mx-auto px-5 lg:px-8 pt-16 md:pt-24">
        <SectionHeading title="Prêts à partir" intro="Des pièces tissées, lavées et photographiées à l’atelier. Ce que vous voyez est ce que vous recevez."
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
              <Link to="/boutique?promotion=1" className="font-medium pb-1.5 border-b border-laine/50 hover:border-safran inline-flex items-center gap-3">Toutes les promotions <ArrowRight className="w-4 h-4" /></Link>
            </div>
            <div className="relative">
              <PromoFeature product={promos[0]} />
              {promos.length > 1 && (
                <ul className="relative z-10 mt-10 grid sm:grid-cols-3 gap-4 max-w-4xl">
                  {promos.slice(1).map((p) => (
                    <li key={p.id}>
                      <Link to={`/produit/${p.id}`} className="flex items-center gap-4 p-2 rounded-lg bg-laine/5 hover:bg-laine/10">
                        <span className="w-16 h-16 rounded-md overflow-hidden bg-laine-fonce shrink-0"><ProductImage src={p.images[0]} alt="" className="w-full h-full" /></span>
                        <span className="min-w-0">
                          <span className="block font-semibold truncate">{p.name}</span>
                          <span className="block text-sm [&_.text-garance]:text-safran [&_.text-nuit]:text-laine [&_.line-through]:text-laine/60"><Price cents={p.price_cents} compareAt={p.compare_at_price_cents} /></span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <BigMotif />
            </div>
          </div>
        </section>
      )}

      <Shelf title="Les plus choisis" intro="Les pièces que nos clients commandent le plus." link="/boutique?tri=ventes" products={best} />

      {/* ---------- Notre histoire ---------- */}
      <section className="mt-20 md:mt-28 grid md:grid-cols-2 items-stretch">
        <div className="relative min-h-[300px] sm:min-h-[420px]">
          {storyImage
            ? <ProductImage src={storyImage} alt="" className="absolute inset-0 w-full h-full" />
            : <DecorPanel />}
          <div className="hidden md:block absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-laine to-transparent" aria-hidden />
        </div>
        <div className="px-5 sm:px-10 lg:px-16 py-14 md:py-20 max-w-2xl">
          <div className="lisiere-fine w-12" aria-hidden />
          <p className="font-display text-nuit text-3xl sm:text-4xl mt-5">{SHOP.name}</p>
          <p className="text-safran mt-1 text-sm"><span className="tracking-[.14em]">by</span> <span className="signature">{SHOP.brand}</span></p>
          <h2 className="font-display italic text-nuit text-[1.9rem] sm:text-[2.4rem] mt-6">{years} ans de savoir-faire familial</h2>
          <p className="mt-5 leading-relaxed text-encre/80">
            Le métal est ciselé, les perles enfilées, la laine tissée à la main, en France. Chaque pièce demande du
            temps : aucune n’est identique à une autre.
          </p>
          <ul className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-y-6 [&>li]:border-laine-fonce [&>li:nth-child(even)]:border-l sm:[&>li:not(:first-child)]:border-l">
            {[
              [<Hand key="h" className="w-6 h-6 stroke-[1.5]" />, 'Savoir-faire artisanal'],
              [<Leaf key="g" className="w-6 h-6 stroke-[1.5]" />, 'Pièces uniques'],
              [<MapPin key="m" className="w-6 h-6 stroke-[1.5]" />, 'Fabriqué en France'],
              [<Users key="u" className="w-6 h-6 stroke-[1.5]" />, 'Héritage familial'],
            ].map(([icon, label], i) => (
              <li key={i} className="px-2 flex flex-col items-center text-center gap-2 text-sm font-semibold text-nuit leading-tight">
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
      <Link to={`/produit/${product.id}`} className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-laine-fonce ring-4 ring-white/90">
        <ProductImage src={product.images[0]} alt={product.name} className="w-full h-full" />
        <div className="absolute top-0 left-0"><BadgeStack badges={badges} max={2} /></div>
        <FavoriteButton id={product.id} name={product.name} className="absolute top-2.5 right-2.5" />
      </Link>
      <div>
        <Link to={`/produit/${product.id}`} className="font-semibold text-2xl hover:underline underline-offset-4">{product.name}</Link>
        <div className="mt-3 text-xl [&_.text-garance]:text-safran [&_.text-nuit]:text-laine [&_.line-through]:text-laine/60 [&_.text-henne]:text-laine/70">
          <Price cents={product.price_cents} compareAt={product.compare_at_price_cents} />
        </div>
        <p className="mt-4 text-laine/80 line-clamp-3 max-w-sm">{product.description || 'Pièce faite main à l’atelier.'}</p>
        <button onClick={() => { add(product); open(); }} className="btn btn-dore mt-6"><ShoppingBag className="w-4 h-4" /> Ajouter au panier</button>
      </div>
    </div>
  );
}

/** Panneau d'attente tant qu'aucune photo n'est choisie : aplat indigo, motif et emblème. */
function DecorPanel() {
  return (
    <div className="absolute inset-0 bg-nuit motif-fond flex items-center justify-center" aria-hidden>
      <Mark className="w-32 h-32 sm:w-44 sm:h-44 opacity-90" />
    </div>
  );
}

/** Broderie au point de croix, en filigrane à droite du bandeau des promotions (comme une étoffe posée). */
function BigMotif() {
  const stitches: JSX.Element[] = [];
  // grille de points de croix : losanges concentriques répétés
  for (let y = 0; y < 22; y++) for (let x = 0; x < 22; x++) {
    const d = Math.abs((x % 11) - 5) + Math.abs((y % 11) - 5);
    if (d === 5 || d === 3 || d === 0 || (d === 1 && (x + y) % 2 === 0)) {
      const c = d === 3 ? 'var(--color-terracotta)' : 'var(--color-gold)';
      stitches.push(<path key={`${x}-${y}`} d={`M${x * 10 + 2} ${y * 10 + 2}l6 6m0-6l-6 6`} stroke={c} strokeWidth="1.6" />);
    }
  }
  return (
    <svg viewBox="0 0 220 220" aria-hidden
      className="hidden lg:block absolute -right-10 top-1/2 -translate-y-1/2 w-[420px] h-[420px] rotate-12 opacity-40 [mask-image:linear-gradient(to_left,black_45%,transparent)]">
      {stitches}
    </svg>
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

