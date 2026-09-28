import { Heart } from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext';

export function FavoriteButton({ id, name, className = '' }: { id: string; name: string; className?: string }) {
  const { has, toggle } = useFavorites();
  const on = has(id);
  return (
    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(id); }} aria-pressed={on}
      aria-label={on ? `Retirer ${name} des favoris` : `Ajouter ${name} aux favoris`}
      className={`rounded-full p-2 bg-laine/85 hover:bg-laine backdrop-blur-sm ${className}`}>
      <Heart className={`w-5 h-5 ${on ? 'fill-garance text-garance' : 'text-nuit'}`} />
    </button>
  );
}
