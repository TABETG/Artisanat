import { Heart, Leaf, Sparkles, Star, Tag, Timer, Trophy } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge, BADGE_TONES } from '../badges';

const ICONS: Record<string, ReactNode> = {
  'meilleure-vente': <Trophy className="w-3.5 h-3.5" />,
  'coup-de-coeur': <Heart className="w-3.5 h-3.5 fill-current" />,
  nouveau: <Sparkles className="w-3.5 h-3.5" />,
  'fin-promo': <Timer className="w-3.5 h-3.5" />,
  'meilleur-prix': <Tag className="w-3.5 h-3.5" />,
  'teinture-vegetale': <Leaf className="w-3.5 h-3.5" />,
  'edition-limitee': <Star className="w-3.5 h-3.5" />,
};

export function BadgePill({ badge, size = 'md' }: { badge: Badge; size?: 'sm' | 'md' }) {
  return (
    <span title={badge.hint} className={`inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-[0.08em] ${BADGE_TONES[badge.tone]} ${BADGE_TONES[badge.tone].includes('bg-laine') ? 'ring-1 ring-nuit/10' : ''} ${size === 'sm' ? 'text-[10px] px-2.5 py-1' : 'text-[9px] px-2 py-0.5 sm:text-[11px] sm:px-3 sm:py-1'}`}>
      {size === 'sm' && <span className="inline-flex">{ICONS[badge.id]}</span>}{badge.label}
    </span>
  );
}

/** Pile de badges sur la photo : on en montre peu pour rester lisible. */
export function BadgeStack({ badges, max = 3 }: { badges: Badge[]; max?: number }) {
  if (!badges.length) return null;
  return (
    <div className="flex flex-col items-start gap-1 sm:gap-1.5 p-2 sm:p-3">
      {badges.slice(0, max).map((b) => <BadgePill key={b.id} badge={b} />)}
    </div>
  );
}
