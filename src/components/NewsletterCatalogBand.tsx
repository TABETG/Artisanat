import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { NewsletterForm } from './NewsletterForm';
import { CatalogCover } from './CatalogCover';
import { SHOP } from '../config';

/** Avant le pied de page : lettre d'information et catalogue réunis dans une même carte. */
export function NewsletterCatalogBand() {
  return (
    <section className="max-w-7xl mx-auto w-full px-5 lg:px-8 mt-16 md:mt-20 print:hidden" aria-label="Lettre d’information et catalogue">
      <div className="bg-white/80 border border-border rounded-2xl shadow-[0_12px_40px_-20px_rgba(28,32,61,0.25)] grid lg:grid-cols-[1.15fr_1fr]">
        <div className="p-6 sm:p-10">
          <h2 className="font-display text-[1.9rem] sm:text-4xl text-nuit">S’inscrire à la lettre d’information</h2>
          <p className="mt-3 text-encre/80">Nouvelles pièces, coulisses de l’atelier, offres exclusives… Rejoignez l’univers de {SHOP.name}.</p>
          <div className="mt-6"><NewsletterForm variant="clair" /></div>
        </div>
        <div className="p-6 sm:p-10 border-t lg:border-t-0 lg:border-l border-laine-fonce grid grid-cols-[auto_1fr] gap-6 sm:gap-8 items-center">
          <Link to="/catalogue" aria-label="Ouvrir le catalogue"><CatalogCover className="w-28 sm:w-36" /></Link>
          <div>
            <h2 className="font-display text-[1.9rem] sm:text-4xl text-nuit">Demander un catalogue</h2>
            <p className="mt-3 text-encre/80">En ligne ou en version papier, la demande est gratuite et en quelques clics.</p>
            <Link to="/catalogue" className="btn btn-secondaire mt-6"><BookOpen className="w-4 h-4" /> Consulter ou recevoir</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
