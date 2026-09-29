import { Link } from 'react-router-dom';
import { SHOP } from '../config';
import { useSettings } from '../context/SettingsContext';
import { NewsletterForm } from './NewsletterForm';
import { Mark } from './Header';
import { usePanels } from '../context/PanelsContext';

export function Footer() {
  const { settings } = useSettings();
  const { openContact } = usePanels();
  const col = 'space-y-2.5 text-laine/80';
  const a = 'hover:text-safran';
  return (
    <footer className="mt-20 md:mt-28 bg-nuit text-laine">
      <div className="lisiere" aria-hidden />
      <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-16 pb-28 lg:pb-10">
        <div className="grid gap-12 md:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="font-display text-[2.8rem] sm:text-[4.5rem] lg:text-[5.5rem] leading-[0.9]">Chaque pièce<br />a une histoire.</p>
            <p className="lecture mt-5 text-laine/75 max-w-md">Recevez un mot quand de nouvelles pièces sortent de l’atelier, une fois par mois au plus.</p>
            <div className="mt-6 max-w-md"><NewsletterForm /></div>
          </div>
          <div className="grid grid-cols-2 gap-8 content-start">
            <div>
              <p className="font-display text-xl mb-4">Boutique</p>
              <ul className={col}>
                <li><Link className={a} to="/boutique">Toutes les créations</Link></li>
                <li><Link className={a} to="/sur-mesure">Tapis sur mesure</Link></li>
                <li><Link className={a} to="/carte-cadeau">Carte cadeau</Link></li>
                <li><Link className={a} to="/nos-realisations">Nos réalisations</Link></li>
                <li><Link className={a} to="/artisans">Nos artisans</Link></li>
                <li><Link className={a} to="/vendre">Vendre mes créations</Link></li>
                <li><Link className={a} to="/notre-histoire">L’atelier</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-display text-xl mb-4">Aide</p>
              <ul className={col}>
                <li><Link className={a} to="/suivi-commande">Suivre ma commande</Link></li>
                <li><Link className={a} to="/livraison-et-retours">Livraison et retours</Link></li>
                <li><Link className={a} to="/questions-frequentes">Questions fréquentes</Link></li>
                <li><Link className={a} to="/contact">Contact</Link></li>
                <li><a className={`${a} break-all`} href={`mailto:${settings.email}`}>{settings.email}</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-laine/15 flex flex-col lg:flex-row lg:flex-wrap lg:items-center gap-x-6 gap-y-3 text-sm text-laine/55">
          <span className="flex items-center gap-2"><Mark className="w-6 h-6" /> © {new Date().getFullYear()} {SHOP.name}</span>
          <span>Paiement sécurisé : Visa, Mastercard, CB, Apple Pay, Google Pay</span>
          <span className="flex flex-wrap gap-x-4 gap-y-2 lg:ml-auto">
            <Link className="hover:text-laine" to="/conditions-generales-de-vente">Conditions de vente</Link>
            <Link className="hover:text-laine" to="/mentions-legales">Mentions légales</Link>
            <Link className="hover:text-laine" to="/conditions-vendeurs">Conditions vendeurs</Link>
            <Link className="hover:text-laine" to="/confidentialite">Confidentialité</Link>
            <button className="hover:text-laine" onClick={() => openContact('donnees')}>Gérer mes données</button>
            <Link className="hover:text-laine" to="/admin">Espace vendeur</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
