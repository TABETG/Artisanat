import { Link } from 'react-router-dom';
import { Facebook, Instagram } from 'lucide-react';
import { SHOP } from '../config';
import { FEATURES } from '../features';
import { useSettings } from '../context/SettingsContext';
import { Logo } from './Brand';
import { usePanels } from '../context/PanelsContext';

export function Footer() {
  const { settings } = useSettings();
  const { openContact } = usePanels();
  const col = 'space-y-2.5 text-laine/80 text-[0.95rem]';
  const a = 'hover:text-safran';
  const title = 'font-display text-lg text-laine mb-4';
  const realEmail = settings.email && !settings.email.includes('exemple.');
  return (
    <footer className="bg-nuit motif-fond text-laine print:hidden">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-14 pb-28 lg:pb-10">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_2fr]">
          <div className="lg:pr-10 lg:border-r border-laine/15">
            <Link to="/" aria-label={`${SHOP.name}, accueil`} className="inline-block"><Logo tone="clair" size="lg" /></Link>
            <p className="font-display italic text-xl text-safran mt-6">{SHOP.slogan}</p>
            <p className="mt-3 text-laine/75 max-w-sm leading-relaxed">
              {SHOP.tagline}. Un savoir-faire familial et authentique, transmis depuis {SHOP.since}.
            </p>
            {(settings.instagram || settings.facebook) && (
              <div className="mt-6 flex gap-2">
                {settings.instagram && <a href={settings.instagram} target="_blank" rel="noreferrer" aria-label={`${SHOP.name} sur Instagram`} className="p-2 rounded-full border border-laine/25 hover:border-safran hover:text-safran"><Instagram className="w-4 h-4" /></a>}
                {settings.facebook && <a href={settings.facebook} target="_blank" rel="noreferrer" aria-label={`${SHOP.name} sur Facebook`} className="p-2 rounded-full border border-laine/25 hover:border-safran hover:text-safran"><Facebook className="w-4 h-4" /></a>}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 content-start">
            <div>
              <p className={title}>Boutique</p>
              <ul className={col}>
                <li><Link className={a} to="/boutique">Toutes les créations</Link></li>
                <li><Link className={a} to="/boutique?nouveautes=1">Nouveautés</Link></li>
                <li><Link className={a} to="/boutique?promotion=1">Promotions</Link></li>
                {FEATURES.customOrdersEnabled && <li><Link className={a} to="/sur-mesure">Sur mesure</Link></li>}
                <li><Link className={a} to="/univers/maison">Univers Maison</Link></li>
                <li><Link className={a} to="/univers/bijoux">Univers Bijoux</Link></li>
                <li><Link className={a} to="/carte-cadeau">Carte cadeau</Link></li>
                <li><Link className={a} to="/catalogue">Catalogue</Link></li>
                <li><Link className={a} to="/nos-realisations">Nos réalisations</Link></li>
              </ul>
            </div>
            <div>
              <p className={title}>Aide</p>
              <ul className={col}>
                <li><Link className={a} to="/suivi-commande">Suivre ma commande</Link></li>
                <li><Link className={a} to="/livraison-et-retours">Livraison et retours</Link></li>
                <li><Link className={a} to="/questions-frequentes">Questions fréquentes</Link></li>
                <li><Link className={a} to="/contact">Contact</Link></li>
                {realEmail && <li><a className={`${a} break-all`} href={`mailto:${settings.email}`}>{settings.email}</a></li>}
              </ul>
            </div>
            <div>
              <p className={title}>À propos</p>
              <ul className={col}>
                <li><Link className={a} to="/notre-histoire">Notre histoire</Link></li>
                <li><Link className={a} to="/nos-realisations">L’atelier</Link></li>
                <li><Link className={a} to="/notre-histoire#savoir-faire">Le savoir-faire</Link></li>
                <li><Link className={a} to="/notre-histoire#engagements">Nos engagements</Link></li>
                {settings.marketplace_enabled && <li><Link className={a} to="/artisans">Nos artisans</Link></li>}
                {settings.marketplace_enabled && <li><Link className={a} to="/vendre">Vendre mes créations</Link></li>}
                <li><Link className={a} to="/compte">Mon compte</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-laine/15 flex flex-col lg:flex-row lg:flex-wrap lg:items-center gap-x-6 gap-y-3 text-sm text-laine/65">
          <span>© {new Date().getFullYear()} {SHOP.name} {SHOP.signature}. Tous droits réservés.</span>
          <span>Paiement sécurisé : Visa, Mastercard, CB, Apple Pay, Google Pay</span>
          <span className="flex flex-wrap gap-y-2 lg:ml-auto [&>*]:px-3 [&>*:not(:first-child)]:border-l [&>*]:border-laine/25 -mx-3">
            <Link className="hover:text-laine" to="/conditions-generales-de-vente">Conditions de vente</Link>
            <Link className="hover:text-laine" to="/mentions-legales">Mentions légales</Link>
            {settings.marketplace_enabled && <Link className="hover:text-laine" to="/conditions-vendeurs">Conditions vendeurs</Link>}
            <Link className="hover:text-laine" to="/confidentialite">Confidentialité</Link>
            <Link className="hover:text-laine" to="/cookies">Cookies</Link>
            <Link className="hover:text-laine" to="/formulaire-de-retractation">Formulaire de rétractation</Link>
            <button className="hover:text-laine" onClick={() => openContact('donnees')}>Gérer mes données</button>
            <Link className="hover:text-laine" to="/admin">Espace vendeur</Link>
          </span>
        </div>
      </div>
      <div className="frise frise-claire" aria-hidden />
    </footer>
  );
}
