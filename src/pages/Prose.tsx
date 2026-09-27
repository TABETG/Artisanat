import type { ReactNode } from 'react';

export function Prose({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="max-w-3xl mx-auto px-5 pt-14">
      <h1 className="font-display text-4xl md:text-5xl text-nuit">{title}</h1>
      <div className="mt-8 space-y-5 text-[17px] leading-[1.75] text-encre/85 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-nuit [&_h2]:pt-4 [&_a]:text-garance [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1">
        {children}
      </div>
    </article>
  );
}
