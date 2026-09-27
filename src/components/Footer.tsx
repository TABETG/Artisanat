import { Link } from 'react-router-dom';
import { SHOP } from '../config';

export function Footer() {
  return (
    <footer className="mt-24 bg-nuit text-laine">
      <div className="motif" aria-hidden />
      <div className="max-w-6xl mx-auto px-5 py-14 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display text-3xl font-extrabold">{SHOP.name}</p>
          <p className="mt-3 max-w-sm text-laine/75 leading-relaxed">
            Tapis berbères et créations en laine, tissés à la main depuis {SHOP.since}.
          </p>
          <p className="mt-6 text-sm text-laine/60">
            Paiement sécurisé par Stripe : Visa, Mastercard, Carte Bancaire, Apple Pay, Google Pay.
          </p>
        </div>
        <div>
          <p className="font-display text-lg mb-3">La boutique</p>
          <ul className="space-y-2 text-laine/80">
            <li><Link className="hover:text-safran" to="/boutique">Toutes les créations</Link></li>
            <li><Link className="hover:text-safran" to="/notre-histoire">Notre histoire</Link></li>
            <li><Link className="hover:text-safran" to="/livraison-et-retours">Livraison et retours</Link></li>
            <li><Link className="hover:text-safran" to="/contact">Nous contacter</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-display text-lg mb-3">Informations</p>
          <ul className="space-y-2 text-laine/80">
            <li><Link className="hover:text-safran" to="/conditions-generales-de-vente">Conditions générales de vente</Link></li>
            <li><Link className="hover:text-safran" to="/mentions-legales">Mentions légales</Link></li>
            <li><Link className="hover:text-safran" to="/confidentialite">Confidentialité</Link></li>
            <li><a className="hover:text-safran" href={`mailto:${SHOP.email}`}>{SHOP.email}</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-laine/10">
        <div className="max-w-6xl mx-auto px-5 py-5 flex flex-wrap justify-between gap-3 text-sm text-laine/50">
          <span>© {new Date().getFullYear()} {SHOP.name}</span>
          <Link to="/admin" className="hover:text-laine">Espace vendeur</Link>
        </div>
      </div>
    </footer>
  );
}
