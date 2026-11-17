import { Link } from 'react-router-dom';
import { NewsletterForm } from './NewsletterForm';
import { CatalogCover } from './CatalogCover';

/** Bandeau avant le pied de page : lettre d'information à gauche, catalogue à droite. */
export function NewsletterCatalogBand() {
  return (
    <section className="relative mt-20 md:mt-28 print:hidden" aria-label="Lettre d’information et catalogue">
      {/* moitié basse sur le fond du pied de page, comme une carte posée dessus */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-nuit" aria-hidden />
      <div className="relative max-w-7xl mx-auto px-5 lg:px-8">
        <div className="bg-white border border-laine-fonce shadow-[0_20px_50px_-30px_rgba(31,36,82,.45)] grid md:grid-cols-2">
          <div className="p-6 sm:p-10">
            <h2 className="font-display text-[2rem] sm:text-4xl text-nuit">S’inscrire à la lettre d’information</h2>
            <p className="mt-3 text-encre/85">Nouvelles pièces et bons plans, une fois par mois au plus.</p>
            <Link to="/confidentialite" className="text-sm text-garance underline">Voir notre politique de confidentialité</Link>
            <div className="mt-6"><NewsletterForm variant="clair" /></div>
          </div>
          <div className="p-6 sm:p-10 border-t md:border-t-0 md:border-l border-laine-fonce grid grid-cols-[auto_1fr] gap-6 sm:gap-8 items-center">
            <Link to="/catalogue" aria-label="Ouvrir le catalogue"><CatalogCover className="w-28 sm:w-40" /></Link>
            <div>
              <h2 className="font-display text-[2rem] sm:text-4xl text-nuit">Demander un catalogue</h2>
              <p className="mt-3 font-semibold text-encre">En ligne ou en version papier !</p>
              <p className="text-encre/85">La demande est gratuite et se fait en quelques clics.</p>
              <Link to="/catalogue" className="mt-6 inline-block border-2 border-nuit text-nuit rounded-full px-7 sm:px-10 py-3.5 font-semibold tracking-wide uppercase text-sm hover:bg-nuit hover:text-laine">
                Consulter ou recevoir
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
