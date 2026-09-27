import { Link } from 'react-router-dom';
import { Prose } from './Prose';
import { SHOP } from '../config';
import { SHIPPING } from '../shipping';
import { formatPrice } from '../lib/format';

// ⚠️ Modèles à relire et compléter : ils ne remplacent pas l'avis d'un juriste.

export function ShippingPage() {
  return (
    <Prose title="Livraison et retours">
      <h2>Livraison</h2>
      <p>
        Chaque commande est expédiée en livraison suivie sous 2 jours ouvrés, puis livrée en {SHIPPING.minDays} à {SHIPPING.maxDays} jours ouvrés.
        Les frais sont de {formatPrice(SHIPPING.priceCents)} et offerts dès {formatPrice(SHIPPING.freeFromCents)} d’achat.
        Vous recevez le numéro de suivi par email au moment de l’expédition.
      </p>
      <p>Nous livrons en France, Belgique, Luxembourg, Suisse, Monaco, Allemagne, Pays-Bas, Espagne, Italie et Portugal.</p>
      <h2>Retours sous 14 jours</h2>
      <p>
        Vous disposez de 14 jours après réception pour nous retourner un article, sans avoir à vous justifier.
        Prévenez-nous par <a href={`mailto:${SHOP.email}`}>email</a>, renvoyez la pièce dans son état d’origine,
        et nous vous remboursons sous 14 jours sur la carte utilisée. Les frais de retour sont à votre charge.
      </p>
      <h2>Colis abîmé</h2>
      <p>Si le colis arrive endommagé, prenez une photo et contactez-nous sous 48 heures : nous trouvons une solution.</p>
    </Prose>
  );
}

export function TermsPage() {
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
      <h2>Garanties</h2>
      <p>Les articles bénéficient de la garantie légale de conformité et de la garantie contre les vices cachés.</p>
      <h2>Litiges</h2>
      <p>
        En cas de litige, contactez-nous d’abord. Vous pouvez aussi recourir gratuitement à un médiateur de la consommation
        (nom et coordonnées à compléter). Droit applicable : droit français.
      </p>
    </Prose>
  );
}

export function LegalPage() {
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
        Ce site n’utilise pas de cookies publicitaires. Votre panier est enregistré uniquement dans votre navigateur.
      </p>
      <p>
        Vous pouvez demander l’accès, la rectification ou la suppression de vos données à <a href={`mailto:${SHOP.email}`}>{SHOP.email}</a>.
        Vous pouvez aussi saisir la CNIL.
      </p>
    </Prose>
  );
}
