import { Link } from 'react-router-dom';
import { listProducts } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { ProductCard } from '../components/ProductCard';
import { ProductImage } from '../components/ProductImage';
import { SectionHeading } from '../components/SectionHeading';
import { SHOP } from '../config';
import { useCategories, useSettings } from '../context/SettingsContext';
import { useBadges } from '../context/BadgesContext';
import { discountOf } from '../badges';
import { formatPrice } from '../lib/format';
import { freeShippingThreshold } from '../settings';
import { Product } from '../types';

export function HomePage() {
  const { data: products, loading, error } = useAsync(listProducts, []);
  const { settings } = useSettings();
  const { categories } = useCategories();
  const { bestSellerIds } = useBadges();
  const all = products ?? [];
  const available = all.filter((p) => p.stock > 0);
  const usedCategories = categories.filter((c) => all.some((p) => p.category === c.id));
  const promos = available.filter((p) => discountOf(p)).sort((a, b) => (discountOf(b) ?? 0) - (discountOf(a) ?? 0)).slice(0, 4);
  const best = available.filter((p) => bestSellerIds.has(p.id)).sort((a, b) => b.sales_count - a.sales_count).slice(0, 4);
  const featured = [...available.filter((p) => p.featured), ...available.filter((p) => !p.featured)];
  const withPhotos = featured.filter((p) => p.images.length > 0);
  const hero = withPhotos[0] ?? featured[0];
  const second = withPhotos[1];
  const years = new Date().getFullYear() - SHOP.since;
  const categoryCover = (id: string) => all.find((p) => p.category === id && p.images.length)?.images[0];

  return (
    <>
      {/* ---------- Ouverture : le titre tissé et le tapis posé ---------- */}
      <section className="max-w-7xl mx-auto px-5 lg:px-8 pt-8 md:pt-14 pb-16 md:pb-20 grid gap-10 md:gap-8 lg:gap-12 md:grid-cols-12 items-start">
        <div className="md:col-span-7 md:pt-6 lg:pt-10">
          <h1 className="apparition-tissee font-display text-nuit text-[3rem] leading-[0.92] sm:text-[4.2rem] md:text-[4rem] lg:text-[5.4rem] xl:text-[6.6rem]">
            {settings.hero_title}
          </h1>
          <p className="lecture mt-6 md:mt-8 text-[1.1rem] md:text-[1.25rem] text-encre/80 max-w-xl">{settings.hero_subtitle}</p>
          <div className="mt-8 md:mt-10 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-x-8 gap-y-4">
            <Link to="/boutique" className="bg-nuit text-laine px-8 py-4 text-lg font-medium text-center hover:bg-garance">Voir les créations</Link>
            <Link to="/sur-mesure" className="lien-tisse text-nuit text-lg font-medium pb-0.5">Faire tisser à mes dimensions</Link>
          </div>
        </div>

        <div className="md:col-span-5 relative">
          {hero ? (
            <Link to={`/produit/${hero.id}`} className="group block">
              <div className="franges mx-6 sm:mx-16 md:mx-0 md:-rotate-2 transition-transform duration-500 group-hover:rotate-0">
                <ProductImage src={hero.images[0]} alt={hero.name} className="w-full aspect-[3/4] shadow-[0_30px_60px_-25px_rgba(31,36,82,.45)]" />
              </div>
              <p className="mt-8 flex items-baseline justify-between gap-4 px-6 sm:px-16 md:px-0">
                <span className="font-display text-xl text-nuit group-hover:text-garance">{hero.name}</span>
                <span className="text-henne whitespace-nowrap">{formatPrice(hero.price_cents)}</span>
              </p>
            </Link>
          ) : (
            <div className="tissage franges w-full aspect-[3/4]" aria-hidden />
          )}
          {second && (
            <Link to={`/produit/${second.id}`} className="hidden xl:block absolute -left-24 bottom-24 w-40 rotate-3 shadow-xl border-4 border-laine" aria-label={second.name}>
              <ProductImage src={second.images[0]} alt="" className="w-full aspect-square" />
            </Link>
          )}
        </div>
      </section>

      <div className="lisiere" aria-hidden />

      {/* ---------- Catégories : de grandes étiquettes photographiques ---------- */}
      {usedCategories.length > 1 && (
        <section className="max-w-7xl mx-auto px-5 lg:px-8 pt-20">
          <SectionHeading title="Par type de pièce" />
          <div className={`grid grid-cols-2 gap-4 ${usedCategories.length >= 4 ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
            {usedCategories.slice(0, 4).map((c) => (
              <Link key={c.id} to={`/boutique?categorie=${c.id}`} className="group relative block overflow-hidden aspect-[4/5] bg-laine-fonce">
                <ProductImage src={categoryCover(c.id)} alt="" className="w-full h-full transition-transform duration-700 group-hover:scale-105" />
                <span className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-nuit/85 to-transparent">
                  <span className="font-display text-2xl sm:text-3xl text-laine">{c.label}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---------- Pièces disponibles ---------- */}
      <section className="max-w-7xl mx-auto px-5 lg:px-8 pt-16 md:pt-24">
        <SectionHeading title="Prêts à partir" intro="Des pièces tissées, lavées et photographiées à l’atelier. Ce que vous voyez est ce que vous recevrez."
          link={{ to: '/boutique', label: 'Toute la boutique' }} />
        {loading && <p className="text-henne">Chargement des créations…</p>}
        {error && <p className="text-garance">Les créations n’ont pas pu être chargées. Rechargez la page.</p>}
        {!loading && !error && featured.length === 0 && <p className="text-henne">De nouvelles pièces arrivent bientôt.</p>}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-12">
          {featured.slice(0, 8).map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {promos.length > 0 && (
        <section className="mt-24 bg-nuit text-laine">
          <div className="max-w-7xl mx-auto px-5 lg:px-8 py-16">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
              <div>
                <div className="lisiere-fine w-16 mb-5" aria-hidden />
                <p className="font-display text-[2.4rem] sm:text-5xl">En promotion</p>
                <p className="lecture mt-2 text-laine/80">Quelques pièces à prix doux, pour quelques jours.</p>
              </div>
              <Link to="/boutique?promotion=1" className="lien-tisse font-medium pb-0.5">Toutes les promotions</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-12 [&_h3]:text-laine [&_.text-henne]:text-laine/70 [&_.line-through]:text-laine/55 [&_.text-garance]:text-safran [&_.text-nuit]:text-laine">
              {promos.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      <Shelf title="Les plus choisis" intro="Les pièces que nos clients commandent le plus." link="/boutique?tri=ventes" products={best} />

      {/* ---------- L'atelier ---------- */}
      <section className="max-w-7xl mx-auto px-5 lg:px-8 pt-20 md:pt-28 grid gap-10 md:gap-12 md:grid-cols-12 items-center">
        <div className="md:col-span-6 lg:col-span-5 order-2 md:order-1">
          <div className="lisiere-fine w-16 mb-5" aria-hidden />
          <h2 className="font-display text-nuit text-[2.6rem] sm:text-6xl">{years} ans de savoir-faire et de patience</h2>
          <p className="lecture mt-6 text-encre/80">
            La laine est filée et teinte à la main, l’argent ciselé, les poudres broyées selon les recettes d’autrefois.
            Chaque pièce demande du temps : aucune n’est identique à une autre.
          </p>
          <Link to="/notre-histoire" className="inline-block mt-8 lien-tisse text-nuit text-lg font-medium pb-0.5">Découvrir l’atelier</Link>
        </div>
        <div className="md:col-span-6 lg:col-start-7 order-1 md:order-2">
          <p className="font-display text-[6rem] sm:text-[9rem] lg:text-[13rem] leading-[0.8] text-laine-fonce select-none" aria-hidden>{SHOP.since}</p>
          <ul className="mt-8 grid grid-cols-1 min-[420px]:grid-cols-2 gap-x-8 gap-y-5 max-w-xl lecture text-base border-t border-laine-fonce pt-6">
            <li><strong className="block font-sans text-nuit">Livraison suivie</strong>{freeShippingThreshold(settings) ? `offerte dès ${formatPrice(freeShippingThreshold(settings)!)}` : 'avec numéro de suivi'}</li>
            <li><strong className="block font-sans text-nuit">14 jours</strong>pour changer d’avis</li>
            <li><strong className="block font-sans text-nuit">Paiement sécurisé</strong>carte, Apple Pay, Google Pay</li>
            <li><strong className="block font-sans text-nuit">Sur mesure</strong>vos dimensions, vos couleurs</li>
          </ul>
        </div>
      </section>
    </>
  );
}

function Shelf({ title, intro, link, products }: { title: string; intro: string; link: string; products: Product[] }) {
  if (!products.length) return null;
  return (
    <section className="max-w-7xl mx-auto px-5 lg:px-8 pt-16 md:pt-24">
      <SectionHeading title={title} intro={intro} link={{ to: link, label: 'Tout voir' }} />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-12">
        {products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}
