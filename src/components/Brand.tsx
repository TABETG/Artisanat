import { SHOP } from '../config';

/** Emblème : losange amazigh doré, inspiré des motifs tissés et des bijoux émaillés. */
export function Mark({ className = 'w-10 h-10', tone = 'dore' }: { className?: string; tone?: 'dore' | 'clair' }) {
  const c = tone === 'clair' ? 'color-mix(in srgb, var(--color-gold) 75%, var(--color-background))' : 'var(--color-gold)';
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden style={{ color: c }}>
      {/* losange double, comme une bordure tissée */}
      <path d="M24 2 46 24 24 46 2 24Z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M24 6.5 41.5 24 24 41.5 6.5 24Z" fill="none" stroke="currentColor" strokeWidth="1" />
      {/* quatre petits losanges en croix (motif amazigh) */}
      <path d="M24 11 27 14 24 17 21 14Z M24 31 27 34 24 37 21 34Z M11 24 14 21 17 24 14 27Z M31 24 34 21 37 24 34 27Z" fill="currentColor" />
      <path d="M24 17v-3M24 31v3M17 24h-3M31 24h3" stroke="currentColor" strokeWidth="1" />
      {/* cœur terracotta */}
      <path d="M24 18.5 29.5 24 24 29.5 18.5 24Z" fill="var(--color-terracotta)" />
      <path d="M24 21.5 26.5 24 24 26.5 21.5 24Z" fill="var(--color-background)" />
    </svg>
  );
}

/** Logo complet : emblème, nom de la galerie et signature JULDEY. */
export function Logo({ tone = 'fonce', size = 'md' }: { tone?: 'fonce' | 'clair'; size?: 'md' | 'lg' }) {
  const lg = size === 'lg';
  return (
    <span className="flex items-center gap-2.5 sm:gap-3 min-w-0">
      <Mark tone={tone === 'clair' ? 'clair' : 'dore'} className={`${lg ? 'w-12 h-12' : 'w-9 h-9 sm:w-11 sm:h-11'} shrink-0`} />
      <span className="leading-none min-w-0">
        <span className={`block font-display ${lg ? 'text-[2rem]' : 'text-[1.35rem] sm:text-[1.65rem]'} ${tone === 'clair' ? 'text-laine' : 'text-nuit'} whitespace-nowrap`}>{SHOP.name}</span>
        {/* Logotype : « by » en minuscules, JULDEY en capitales espacées (WCAG : le texte d'un logo n'a pas d'exigence de contraste) */}
        <span className={`block ${lg ? 'text-[0.8rem] mt-1.5' : 'text-[0.62rem] sm:text-[0.7rem] mt-1'} text-safran whitespace-nowrap`}>
          <span className="tracking-[.14em]">by</span> <span className="signature">{SHOP.brand}</span>
        </span>
      </span>
    </span>
  );
}
