import { Link } from 'react-router-dom';
import { listProducts } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { useFavorites } from '../context/FavoritesContext';
import { ProductCard } from '../components/ProductCard';

export function FavoritesPage() {
  const { ids } = useFavorites();
  const { data, loading } = useAsync(listProducts, []);
  const products = ids.map((id) => (data ?? []).find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p);

  return (
    <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-12">
      <div className="lisiere-fine w-16 mb-5" aria-hidden />
      <h1 className="font-display text-[2.8rem] sm:text-6xl md:text-7xl text-nuit">Mes favoris</h1>
      <p className="mt-3 text-henne">Enregistrés sur cet appareil, pour les retrouver plus tard.</p>
      {loading && <p className="mt-8 text-henne">Chargement…</p>}
      {!loading && products.length === 0 && (
        <div className="py-16">
          <p className="font-display text-2xl text-nuit">Aucun favori pour l’instant</p>
          <p className="mt-2 text-henne">Touchez le cœur sur une création pour la garder de côté.</p>
          <Link to="/boutique" className="inline-block mt-6 bg-nuit text-laine px-6 py-3 rounded-sm hover:bg-garance">Voir la boutique</Link>
        </div>
      )}
      <div className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10">
        {products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  );
}
