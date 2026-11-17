import type { Market } from '../market';

/** Petit drapeau dessiné (les drapeaux en emoji ne s'affichent pas sous Windows). */
export function Flag({ market, className = 'w-5 h-auto' }: { market: Market; className?: string }) {
  if (market === 'fr') return (
    <svg viewBox="0 0 3 2" className={`${className} inline-block shrink-0 rounded-[2px] ring-1 ring-black/10`} aria-hidden>
      <rect width="1" height="2" fill="#002654" /><rect x="1" width="1" height="2" fill="#fff" /><rect x="2" width="1" height="2" fill="#CE1126" />
    </svg>
  );
  return (
    <svg viewBox="0 0 30 20" className={`${className} inline-block shrink-0 rounded-[2px] ring-1 ring-black/10`} aria-hidden>
      <rect width="15" height="20" fill="#006233" /><rect x="15" width="15" height="20" fill="#fff" />
      <circle cx="15" cy="10" r="5" fill="#D21034" /><circle cx="16.25" cy="10" r="4" fill="#fff" />
      <path d="M17.6 10 20.2 8.8 18.6 11.1 18.6 8.9 20.2 11.2Z" fill="#D21034" />
    </svg>
  );
}
