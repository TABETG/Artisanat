import type { ReactNode } from 'react';

export function Prose({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="max-w-3xl mx-auto px-5 pt-14">
      <div className="lisiere-fine w-16 mb-5" aria-hidden />
      <h1 className="font-display text-5xl md:text-6xl text-nuit">{title}</h1>
      <div className="lecture mt-10 space-y-5 text-encre/85 [&_h2]:font-display [&_h2]:font-sans [&_h2]:text-3xl [&_h2]:text-nuit [&_h2]:pt-4 [&_a]:text-garance [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1">
        {children}
      </div>
    </article>
  );
}
