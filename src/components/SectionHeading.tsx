import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** Titre de section : la lisière rayée, un grand titre à gauche, un lien discret à droite. */
export function SectionHeading({ title, intro, link, tone = 'nuit', children }: {
  title: string; intro?: string; link?: { to: string; label: string }; tone?: 'nuit' | 'garance'; children?: ReactNode;
}) {
  return (
    <div className="mb-10">
      <div className="lisiere-fine w-16 mb-5" aria-hidden />
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="max-w-2xl">
          <h2 className={`font-display text-[2.4rem] sm:text-5xl ${tone === 'garance' ? 'text-garance' : 'text-nuit'}`}>{title}</h2>
          {intro && <p className="lecture mt-3 text-henne">{intro}</p>}
        </div>
        {link && (
          <Link to={link.to} className="lien-tisse text-nuit font-medium pb-0.5 whitespace-nowrap">{link.label}</Link>
        )}
        {children}
      </div>
    </div>
  );
}
