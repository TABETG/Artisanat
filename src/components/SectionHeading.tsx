import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/** Titre de section : la lisière rayée, un grand titre à gauche, un lien discret à droite. */
export function SectionHeading({ title, intro, link, tone = 'nuit', children }: {
  title: string; intro?: string; link?: { to: string; label: string }; tone?: 'nuit' | 'garance'; children?: ReactNode;
}) {
  return (
    <div className="mb-8 md:mb-10">
      <div className="lisiere-fine w-12 mb-5" aria-hidden />
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="max-w-2xl">
          <h2 className={`font-display text-[2.1rem] sm:text-5xl ${tone === 'garance' ? 'text-garance' : 'text-nuit'}`}>{title}</h2>
          {intro && <p className="mt-3 text-encre/80 max-w-md">{intro}</p>}
        </div>
        {link && (
          <Link to={link.to} className="text-garance font-medium pb-1.5 border-b border-garance/40 hover:border-garance whitespace-nowrap inline-flex items-center gap-3">
            {link.label} <ArrowRight className="w-4 h-4" />
          </Link>
        )}
        {children}
      </div>
    </div>
  );
}
