import { Link } from 'react-router-dom';
import { Prose } from './Prose';
import { SHOP as SHOP_CONFIG } from '../config';
import { useSettings } from '../context/SettingsContext';
import { ShippingTable } from '../components/ShippingTable';

/** Infos légales du fichier de configuration + coordonnées modifiables dans les réglages. */
function useShop() {
  const { settings } = useSettings();
  return { ...SHOP_CONFIG, email: settings.email, phone: settings.phone, address: settings.address, settings };
}

// ⚠️ Modèles à relire et compléter : ils ne remplacent pas l'avis d'un juriste.

export function ShippingPage() {
  const SHOP = useShop();
  return (
    <Prose title="Livraison et retours">
      <h2>Modes et tarifs</h2>
      <p>
        Chaque pièce est emballée avec soin à l’atelier, puis confiée au transporteur de votre choix.
        Vous choisissez le mode de livraison dans le panier ; le prix exact et la date estimée s’affichent avant le paiement.
      </p>
      <ShippingTable />
      <p>Vous recevez un email avec le numéro de suivi dès l’expédition, et pouvez suivre votre colis sur la page <Link to="/suivi-commande">Suivre ma commande</Link>.</p>
      <h2>Retours sous 14 jours</h2>
      <p>
        Vous disposez de 14 jours après réception pour nous retourner un article, sans avoir à vous justifier.
        Prévenez-nous par <a href={`mailto:${SHOP.email}`}>email</a>, renvoyez la pièce dans son état d’origine,
        et nous vous remboursons sous 14 jours sur la carte utilisée. Les frais de retour sont à votre charge.
      </p>
      <p>Les cosmétiques ne peuvent être repris que s’ils n’ont pas été ouverts, pour des raisons d’hygiène.</p>
      <h2>Colis abîmé</h2>
      <p>Si le colis arrive endommagé, prenez une photo et contactez-nous sous 48 heures : nous trouvons une solution.</p>
    </Prose>
  );
}

export function TermsPage() {
  const SHOP = useShop();
  return (
    <Prose title="Conditions générales de vente">
      <p><em>Modèle à adapter à votre situation.</em></p>
      <h2>Vendeur</h2>
      <p>{SHOP.legalName}, {SHOP.legalForm}, SIRET {SHOP.siret}, {SHOP.address}. Contact : {SHOP.email}.</p>
      <h2>Produits</h2>
      <p>Les articles sont faits à la main : de légères variations de couleur ou de dimensions (± 3 %) font partie de leur caractère.</p>
      <h2>Prix</h2>
      <p>Les prix sont indiqués en euros, toutes taxes comprises ({SHOP.vat}). Les frais de livraison sont affichés avant le paiement.</p>
      <h2>Commande et paiement</h2>
      <p>
        La commande est ferme une fois le paiement accepté. Le paiement est réalisé par carte bancaire (Visa, Mastercard, CB),
        Apple Pay ou Google Pay via la plateforme sécurisée Stripe. Nous n’avons jamais accès à vos numéros de carte.
      </p>
      <h2>Livraison</h2>
      <p>Voir la page <Link to="/livraison-et-retours">Livraison et retours</Link>.</p>
      <h2>Droit de rétractation</h2>
      <p>
        Conformément à l’article L221-18 du Code de la consommation, vous disposez de 14 jours à compter de la réception
        pour exercer votre droit de rétractation. Le remboursement intervient sous 14 jours après réception du retour.
      </p>
      <p>
        Exception : pour des raisons d’hygiène, le droit de rétractation ne s’applique pas aux cosmétiques (khôl, rouge à lèvres, soins…)
        dont l’emballage ou le scellé a été ouvert après la livraison (article L221-28 du Code de la consommation).
      </p>
      <h2>Garanties</h2>
      <p>Les articles bénéficient de la garantie légale de conformité et de la garantie contre les vices cachés.</p>
      <h2>Produits vendus par des artisans partenaires</h2>
      <p>
        Certaines pièces sont vendues par des artisans indépendants, dont le nom figure sur la fiche produit (« Créé et expédié par… »).
        Le contrat de vente est alors conclu directement avec cet artisan ; {SHOP.name} agit comme intermédiaire (place de marché) et encaisse
        le paiement pour son compte via Stripe. Chaque artisan expédie ses pièces à son tarif et indique s’il vend en tant que professionnel
        ou particulier : le droit de rétractation de 14 jours ne s’applique qu’aux achats auprès de professionnels.
        En cas de difficulté, contactez-nous : nous faisons le lien avec l’artisan.
      </p>
      <h2>Litiges</h2>
      <p>
        En cas de litige, contactez-nous d’abord. Vous pouvez aussi recourir gratuitement au médiateur de la consommation :
        {SHOP.settings.mediator || 'coordonnées à compléter'}. Plateforme européenne de règlement des litiges : ec.europa.eu/consumers/odr.
        Droit applicable : droit français.
      </p>
    </Prose>
  );
}

export function LegalPage() {
  const SHOP = useShop();
  return (
    <Prose title="Mentions légales">
      <p><strong>Éditeur :</strong> {SHOP.legalName}, {SHOP.legalForm} — SIRET {SHOP.siret} — {SHOP.address} — {SHOP.email} — {SHOP.phone}</p>
      <p><strong>Directeur de la publication :</strong> nom à compléter</p>
      <p><strong>Hébergeur :</strong> {SHOP.host}</p>
      <p><strong>Paiement :</strong> Stripe Payments Europe, Ltd., 1 Grand Canal Street Lower, Dublin 2, Irlande</p>
    </Prose>
  );
}

export function PrivacyPage() {
  const SHOP = useShop();
  return (
    <Prose title="Confidentialité">
      <p>
        Nous collectons uniquement les informations nécessaires à votre commande : nom, email, téléphone et adresse de livraison.
        Elles servent à expédier votre colis et à vous contacter à son sujet. Elles ne sont ni vendues ni partagées,
        sauf avec le transporteur.
      </p>
      <p>
        Le paiement est traité par Stripe. Vos données bancaires ne transitent jamais par nos serveurs.
        Les données de commande sont conservées le temps légal de conservation des factures (10 ans).
      </p>
      <p>
        Ce site n’utilise aucun cookie publicitaire ni outil de suivi externe, et les polices de caractères sont hébergées avec le site
        (aucune connexion à Google). Votre panier, vos favoris et les pièces consultées sont enregistrés uniquement dans votre navigateur.
      </p>
      <p>
        Nous comptons de façon anonyme les vues et ajouts au panier de chaque produit, sans cookie et sans vous identifier.
        Vous pouvez refuser ce comptage à tout moment via « Gérer mes données » en bas de page.
      </p>
      <p>
        Les messages envoyés via le formulaire de contact (nom, email, message) sont conservés le temps de traiter votre demande, puis au plus 3 ans.
      </p>
      <p>
        Vous pouvez demander l’accès, la rectification ou la suppression de vos données à <a href={`mailto:${SHOP.email}`}>{SHOP.email}</a>.
        Vous pouvez aussi saisir la CNIL.
      </p>
    </Prose>
  );
}

export function SellerTermsPage() {
  const SHOP = useShop();
  return (
    <Prose title="Conditions pour les vendeurs">
      <p><em>Modèle à faire relire par un juriste avant ouverture de la place de marché.</em></p>
      <h2>Qui peut vendre</h2>
      <p>Toute personne qui fabrique elle-même des objets artisanaux, en France ou dans un pays où Stripe peut verser l’argent. Chaque candidature est examinée par {SHOP.name}, qui peut la refuser sans avoir à se justifier.</p>
      <h2>Vos créations</h2>
      <p>Vous certifiez que les pièces sont faites à la main, que les photos et descriptions sont fidèles, et que vous avez le droit de les vendre. Chaque produit est relu avant publication. Les copies, produits industriels, contrefaçons et objets interdits sont refusés.</p>
      <h2>Commission et paiements</h2>
      <p>Vous fixez vos prix. {SHOP.name} prélève une commission de {SHOP.settings.marketplace_commission_percent} % sur le prix des articles vendus (hors frais d’envoi), sans abonnement. Le paiement du client est encaissé par Stripe ; votre part (ventes moins commission, plus vos frais d’envoi) est virée sur votre compte Stripe, puis sur votre compte bancaire. Stripe vérifie votre identité à l’ouverture du compte.</p>
      <h2>Expédition et service client</h2>
      <p>Vous expédiez sous le délai annoncé, avec un emballage soigné, et indiquez le numéro de suivi dans votre espace. Vous répondez aux demandes des clients transmises par {SHOP.name}. En cas de retour accepté ou de colis perdu, le remboursement du client peut être déduit de vos versements.</p>
      <h2>Statut et obligations</h2>
      <p>Vous indiquez honnêtement si vous vendez en tant que professionnel (SIRET) ou particulier ; ce statut est affiché aux clients. Vous êtes responsable de vos déclarations fiscales et sociales. Conformément à la directive européenne DAC7, {SHOP.name} peut être tenu de transmettre à l’administration fiscale le montant de vos ventes et vos informations d’identification.</p>
      <h2>Fin de la collaboration</h2>
      <p>Vous pouvez fermer votre boutique à tout moment. {SHOP.name} peut suspendre une boutique en cas de manquement à ces conditions, après vous en avoir informé sauf urgence.</p>
    </Prose>
  );
}
