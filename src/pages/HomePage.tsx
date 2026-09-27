import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Hand, Lock, RotateCcw, Truck } from 'lucide-react';
import { listProducts } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { ProductCard } from '../components/ProductCard';
import { ProductImage } from '../components/ProductImage';
import { CATEGORIES, SHOP } from '../config';
import { SHIPPING } from '../shipping';
import { formatPrice } from '../lib/format';

export function HomePage() {
  const { data: products, loading, error } = useAsync(listProducts, []);
  const available = (products ?? []).filter((p) => p.stock > 0);
  const featured = [...available.filter((p) => p.featured), ...available.filter((p) => !p.featured)].slice(0, 8);
  const heroProduct = featured.find((p) => p.images.length > 0) ?? featured[0];
  const years = new Date().getFullYear() - SHOP.since;

  return (
    <>
      <section className="bg-nuit text-laine">
        <div className="max-w-6xl mx-auto px-5 py-16 md:py-24 grid gap-12 md:grid-cols-[1.15fr_1fr] items-center">
          <div>
            <h1 className="font-display font-extrabold text-[2.6rem] leading-[1.05] sm:text-6xl md:text-[4.3rem] tracking-tight">
              Des tapis tissés à la main, nœud après nœud.
            </h1>
            <p className="mt-6 text-lg text-laine/80 max-w-md leading-relaxed">
              Tapis berbères, coussins et plaids en pure laine. Des pièces faites à la main depuis {SHOP.since}, livrées chez vous.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/boutique" className="bg-safran text-encre px-7 py-3.5 rounded-sm font-medium hover:bg-laine">
                Voir les créations
              </Link>
              <Link to="/notre-histoire" className="px-7 py-3.5 rounded-sm border border-laine/30 hover:border-laine">
                Notre histoire
              </Link>
            </div>
          </div>
          {heroProduct ? (
            <Link to={`/produit/${heroProduct.id}`} className="block">
              <ProductImage src={heroProduct.images[0]} alt={heroProduct.name} className="w-full aspect-[4/5] rounded-sm" />
              <p className="mt-3 text-sm text-laine/70">{heroProduct.name} — {formatPrice(heroProduct.price_cents)}</p>
            </Link>
          ) : (
            <div className="tissage w-full aspect-[4/5] rounded-sm" aria-hidden />
          )}
        </div>
        <div className="motif" aria-hidden />
      </section>

      <section className="max-w-6xl mx-auto px-5 pt-20">
        <div className="flex items-end justify-between gap-4 mb-8">
          <h2 className="font-display text-3xl md:text-4xl text-nuit">Disponibles en ce moment</h2>
          <Link to="/boutique" className="text-garance hover:underline whitespace-nowrap">Tout voir</Link>
        </div>
        {loading && <p className="text-henne">Chargement des créations…</p>}
        {error && <p className="text-garance">Les créations n’ont pas pu être chargées. Rechargez la page.</p>}
        {!loading && !error && featured.length === 0 && (
          <p className="text-henne">De nouvelles pièces arrivent bientôt.</p>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-10">
          {featured.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 pt-20">
        <h2 className="sr-only">Catégories</h2>
        <div className="flex flex-wrap gap-3">
          {CATEGORIES.map((c) => (
            <Link key={c.id} to={`/boutique?categorie=${c.id}`}
              className="px-5 py-2.5 rounded-sm border border-nuit/20 text-nuit hover:bg-nuit hover:text-laine">
              {c.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 pt-24 grid gap-10 md:grid-cols-[auto_1fr] items-center">
        <p className="font-display font-extrabold text-[7rem] md:text-[11rem] leading-none text-garance" aria-hidden>
          {SHOP.since}
        </p>
        <div className="max-w-xl">
          <h2 className="font-display text-3xl md:text-4xl text-nuit">
            {years} ans de laine, de métiers à tisser et de patience
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-encre/80">
            La laine est lavée, cardée et filée à la main, puis teinte avec des couleurs naturelles.
            Chaque tapis demande des semaines de travail : aucun n’est identique à un autre.
          </p>
          <Link to="/notre-histoire" className="inline-block mt-5 text-garance hover:underline">Lire notre histoire</Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 pt-24">
        <h2 className="sr-only">Nos engagements</h2>
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 border-t border-laine-fonce pt-10">
          <Engagement icon={<Hand className="w-6 h-6" />} title="Fait main">Tissé à la main, en laine naturelle.</Engagement>
          <Engagement icon={<Lock className="w-6 h-6" />} title="Paiement sécurisé">Carte Visa, Mastercard, CB, Apple Pay et Google Pay via Stripe.</Engagement>
          <Engagement icon={<Truck className="w-6 h-6" />} title="Livraison suivie">
            Offerte dès {formatPrice(SHIPPING.freeFromCents)}, avec numéro de suivi.
          </Engagement>
          <Engagement icon={<RotateCcw className="w-6 h-6" />} title="14 jours pour changer d’avis">Retour accepté si la pièce ne vous convient pas.</Engagement>
        </ul>
      </section>
    </>
  );
}

function Engagement({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <li>
      <span className="text-garance">{icon}</span>
      <p className="font-display text-lg text-nuit mt-3">{title}</p>
      <p className="text-encre/75 mt-1 leading-relaxed">{children}</p>
    </li>
  );
}
