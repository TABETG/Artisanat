import { SHOP } from '../config';

/** Emblème : losange amazigh doré, inspiré des motifs tissés et des bijoux émaillés. */
export function Mark({ className = 'w-10 h-10', tone = 'dore' }: { className?: string; tone?: 'dore' | 'clair' }) {
  const c = tone === 'clair' ? 'color-mix(in srgb, var(--color-gold) 75%, var(--color-background))' : 'var(--color-gold)';
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden style={{ color: c }}>
      <path d="M24 3 45 24 24 45 3 24Z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M24 10 38 24 24 38 10 24Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M24 17 31 24 24 31 17 24Z" fill="var(--color-terracotta)" />
      <path d="M24 21 27 24 24 27 21 24Z" fill="var(--color-background)" />
      <path d="M24 3v7M24 38v7M3 24h7M38 24h7" stroke="currentColor" strokeWidth="1.5" />
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
