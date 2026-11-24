import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Prose } from './Prose';
import { SHOP as SHOP_CONFIG } from '../config';
import { useSettings } from '../context/SettingsContext';
import { ShippingTable } from '../components/ShippingTable';

/** Infos légales du fichier de configuration + coordonnées modifiables dans les réglages. */
function useShop() {
  const { settings } = useSettings();
  const email = /exemple\./i.test(settings.email) ? '' : settings.email;
  return { ...SHOP_CONFIG, email, phone: settings.phone, address: settings.address || SHOP_CONFIG.address, settings };
}

/** Information manquante : bien visible pour être complétée avant l'ouverture. */
const Missing = ({ children }: { children: ReactNode }) => <mark className="bg-safran/30 px-1">{children}</mark>;

function Contact() {
  const SHOP = useShop();
  return <>{SHOP.email ? <a href={`mailto:${SHOP.email}`}>{SHOP.email}</a> : <Missing>adresse email à compléter</Missing>}</>;
}

function Mediator() {
  const SHOP = useShop();
  return SHOP.settings.mediator ? <>{SHOP.settings.mediator}</> : <Missing>médiateur à compléter (adhésion en cours)</Missing>;
}

const updated = 'Dernière mise à jour : 23 novembre 2026.';

// ---------------------------------------------------------------- Mentions légales
export function LegalPage() {
  const SHOP = useShop();
  return (
    <Prose title="Mentions légales">
      <h2>Éditeur du site</h2>
      <p>
        {SHOP.legalName}, {SHOP.legalForm}<br />
        SIRET : {SHOP.siret} — {SHOP.register}<br />
        Adresse : {SHOP.address}<br />
        Email : <Contact />{SHOP.phone && <><br />Téléphone : {SHOP.phone}</>}<br />
        {SHOP.vat}
      </p>
      <p><strong>Directeur de la publication :</strong> {SHOP.publicationDirector}</p>
      <h2>Hébergement</h2>
      <p><strong>Site :</strong> {SHOP.host}</p>
      <p><strong>Base de données :</strong> {SHOP.dataHost}</p>
      <h2>Paiement</h2>
      <p>Stripe Payments Europe, Ltd., 1 Grand Canal Street Lower, Grand Canal Dock, Dublin, D02 H210, Irlande.</p>
      <h2>Propriété intellectuelle</h2>
      <p>Les textes, photographies et créations présentés sur ce site sont protégés. Toute reproduction sans autorisation écrite est interdite.</p>
      <p>Voir aussi : <Link to="/conditions-generales-de-vente">conditions générales de vente</Link>, <Link to="/confidentialite">politique de confidentialité</Link>, <Link to="/cookies">cookies</Link>.</p>
    </Prose>
  );
}

// ---------------------------------------------------------------- Conditions générales de vente
export function TermsPage() {
  const SHOP = useShop();
  return (
    <Prose title="Conditions générales de vente">
      <p><em>{updated}</em></p>

      <h2>1. Vendeur</h2>
      <p>
        Les présentes conditions s’appliquent aux ventes conclues sur ce site entre {SHOP.legalName}, {SHOP.legalForm},
        SIRET {SHOP.siret}, {SHOP.address} (ci-après « le vendeur »), et toute personne physique agissant à des fins non
        professionnelles (ci-après « le client »). Contact : <Contact />.
      </p>

      <h2>2. Produits</h2>
      <p>
        Les produits sont des bijoux, accessoires et objets de décoration fabriqués à la main en France. Leurs caractéristiques
        essentielles (matières, dimensions, entretien, quantité disponible) sont indiquées sur chaque fiche produit.
        Les pièces étant faites à la main, de légères variations de teinte ou de dimension par rapport aux photographies
        sont possibles et ne constituent pas un défaut.
      </p>

      <h2>3. Prix</h2>
      <p>
        Les prix sont indiqués en euros, toutes taxes comprises ({SHOP.vat}). Les frais de livraison sont indiqués avant la
        validation de la commande ; ils peuvent être offerts à partir d’un montant d’achat indiqué dans le panier.
        Le prix applicable est celui affiché au moment de la commande.
      </p>

      <h2>4. Commande</h2>
      <p>
        Le client ajoute les produits à son panier, choisit le mode de livraison, vérifie le récapitulatif (produits, prix,
        frais de livraison, total) puis valide en cliquant sur « Payer ma commande ». La commande est définitive après
        acceptation du paiement. Une confirmation reprenant les éléments de la commande est envoyée par email ; elle est
        également consultable dans l’espace « Mon compte ». Le vendeur peut refuser une commande en cas de litige antérieur
        ou de commande anormale.
      </p>

      <h2>5. Paiement</h2>
      <p>
        Le paiement est exigible à la commande. Il s’effectue par carte bancaire (CB, Visa, Mastercard) et, le cas échéant,
        par les autres moyens proposés sur la page de paiement sécurisée de Stripe. Le vendeur n’a jamais accès aux données
        de carte bancaire. Une facture est disponible dans l’espace « Mon compte ».
      </p>

      <h2>6. Livraison</h2>
      <p>
        Les produits sont livrés en France métropolitaine, en point relais ou à domicile, à l’adresse indiquée lors de la commande.
        La commande est expédiée sous {SHOP.settings.preparation_days} jour{SHOP.settings.preparation_days > 1 ? 's' : ''} ouvré{SHOP.settings.preparation_days > 1 ? 's' : ''} après le paiement ; le délai de livraison estimé est affiché avant
        le paiement. À défaut, la livraison intervient au plus tard 30 jours après la commande.
        En cas de retard, le client peut, après mise en demeure restée sans effet, résoudre la vente et être remboursé
        (articles L216-1 et suivants du Code de la consommation). Les risques sont transférés au client lorsque celui-ci prend
        physiquement possession des produits : en cas de perte ou d’avarie pendant le transport, le vendeur renvoie le
        produit ou rembourse le client, sans attendre l’indemnisation du transporteur. Détails et tarifs : <Link to="/livraison-et-retours">Livraison et retours</Link>.
      </p>

      <h2>7. Droit de rétractation</h2>
      <p>
        Le client dispose d’un délai de 14 jours à compter de la réception du produit pour se rétracter, sans avoir à motiver
        sa décision (article L221-18 du Code de la consommation). Il informe le vendeur de sa décision par une déclaration
        dénuée d’ambiguïté, par email à <Contact />, depuis la page <Link to="/suivi-commande">Suivre ma commande</Link>,
        ou à l’aide du <Link to="/formulaire-de-retractation">formulaire type de rétractation</Link>.
      </p>
      <p>
        Le client renvoie le produit au plus tard 14 jours après avoir communiqué sa décision. <strong>Les frais de retour sont
        à la charge du client.</strong> Le produit doit être retourné complet et en bon état ; la responsabilité du client
        peut être engagée en cas de dépréciation résultant de manipulations autres que celles nécessaires pour établir sa
        nature, ses caractéristiques et son bon fonctionnement (article L221-23).
      </p>
      <p>
        Le client peut examiner le produit comme il le ferait en magasin : le déballer, le déplier, le toucher. Au-delà, il
        s’agit d’une utilisation. Par exemple, un tapis sur lequel on a marché, posé sous des meubles, sali ou dont
        l’étiquette de contrôle a été retirée, ou un bijou porté, n’est plus revendable en l’état. Le vendeur peut alors
        déduire du remboursement la perte de valeur constatée, jusqu’au montant total de l’article si celui-ci ne peut plus
        être vendu. Le client est invité à retourner le produit dans son emballage d’origine, avec son étiquette. Le vendeur
        photographie le produit avant l’envoi et à l’ouverture du colis retourné.
      </p>
      <p>
        Le vendeur rembourse la totalité des sommes versées, <strong>y compris les frais de livraison initiaux</strong>{' '}
        (dans la limite du tarif de livraison standard le moins cher proposé), au plus tard 14 jours après avoir été informé
        de la rétractation, avec le même moyen de paiement. Il peut différer le remboursement jusqu’à la réception du produit
        ou jusqu’à la preuve de son expédition (article L221-24).
      </p>
      <p>
        Conformément à l’article L221-28, 3° du Code de la consommation, le droit de rétractation ne s’applique pas aux
        produits confectionnés selon les spécifications du client ou nettement personnalisés : pièces fabriquées à sa demande
        (dimensions, couleurs, motif ou gravure choisis par lui). Ces pièces sont signalées sur leur fiche, dans le panier et
        au moment du paiement par la mention « faite selon vos choix : ni reprise ni échange ». Les garanties légales
        (article 8) s’appliquent toujours en cas de défaut.
      </p>

      <h2>8. Garanties légales</h2>
      <p>
        Le client bénéficie de la <strong>garantie légale de conformité</strong> (articles L217-3 et suivants du Code de la
        consommation) : il dispose d’un délai de deux ans à compter de la délivrance du bien pour obtenir sa mise en conformité,
        par réparation ou remplacement, ou à défaut une réduction du prix ou la résolution du contrat. Pendant ce délai, le
        client n’a pas à prouver l’existence du défaut de conformité au moment de la délivrance. Cette garantie s’applique
        indépendamment de toute garantie commerciale.
      </p>
      <p>
        Le client bénéficie également de la <strong>garantie des vices cachés</strong> (articles 1641 à 1649 du Code civil),
        pendant deux ans à compter de la découverte du vice ; il peut choisir entre la résolution de la vente ou une réduction
        du prix.
      </p>
      <p>Pour mettre en œuvre ces garanties, le client contacte le vendeur à <Contact />.</p>

      <h2>9. Données personnelles</h2>
      <p>Voir la <Link to="/confidentialite">politique de confidentialité</Link>.</p>

      <h2>10. Réclamations et médiation</h2>
      <p>
        Toute réclamation peut être adressée à <Contact />. En cas de litige non résolu, le client peut recourir gratuitement
        au médiateur de la consommation suivant (articles L611-1 et suivants du Code de la consommation) : <Mediator />.
      </p>

      <h2>11. Droit applicable</h2>
      <p>Les présentes conditions sont soumises au droit français. Le client peut saisir la juridiction de son domicile.</p>

      {SHOP.settings.marketplace_enabled && (
        <>
          <h2>12. Produits vendus par des artisans partenaires</h2>
          <p>
            Certaines pièces sont vendues par des artisans indépendants, dont le nom figure sur la fiche produit (« Créé et expédié par… »).
            Le contrat de vente est alors conclu directement avec cet artisan ; {SHOP.name} agit comme intermédiaire et encaisse le paiement
            pour son compte via Stripe. Le droit de rétractation de 14 jours ne s’applique qu’aux achats auprès d’artisans professionnels.
          </p>
        </>
      )}
    </Prose>
  );
}

// ---------------------------------------------------------------- Livraison et retours
export function ShippingPage() {
  const SHOP = useShop();
  return (
    <Prose title="Livraison et retours">
      <h2>Modes et tarifs</h2>
      <p>
        Nous livrons en France métropolitaine. Chaque pièce est emballée avec soin à l’atelier, puis confiée au transporteur
        que vous choisissez dans le panier ; le prix exact et la date estimée s’affichent avant le paiement.
      </p>
      <p><strong>Votre commande est expédiée sous {SHOP.settings.preparation_days} jour{SHOP.settings.preparation_days > 1 ? 's' : ''} ouvré{SHOP.settings.preparation_days > 1 ? 's' : ''} après le paiement.</strong> En cas d’imprévu, nous vous prévenons par email.</p>
      <ShippingTable />
      <p>Vous recevez un email avec le numéro de suivi dès l’expédition, et pouvez suivre votre colis sur la page <Link to="/suivi-commande">Suivre ma commande</Link>.</p>
      <h2>Colis abîmé ou incomplet</h2>
      <p>
        Si le colis arrive endommagé, émettez si possible des réserves auprès du transporteur, prenez une photo et
        contactez-nous rapidement : nous trouvons une solution (remplacement ou remboursement). Vous conservez dans tous les
        cas le bénéfice des garanties légales.
      </p>
      <h2>Colis perdu</h2>
      <p>
        Si votre colis n’arrive pas, prévenez-nous : nous ouvrons l’enquête auprès du transporteur et, sans attendre son
        résultat, nous vous renvoyons la pièce (si elle est encore disponible) ou vous remboursons intégralement.
        Jusqu’à sa remise entre vos mains, le colis voyage sous notre responsabilité.
      </p>
      <h2>Retours sous 14 jours</h2>
      <p>
        Vous disposez de 14 jours après réception pour changer d’avis, sans avoir à vous justifier. Signalez-nous votre retour
        depuis <Link to="/suivi-commande">Suivre ma commande</Link>, par email ou avec le <Link to="/formulaire-de-retractation">formulaire de rétractation</Link>,
        puis renvoyez la pièce dans son état d’origine sous 14 jours, de préférence dans son emballage et avec son étiquette.
        Les frais de retour sont à votre charge.
      </p>
      <p>
        Vous pouvez examiner la pièce comme en magasin. En revanche, une pièce utilisée (tapis sur lequel on a marché ou posé
        sous des meubles, bijou porté, article sali ou sans son étiquette de contrôle) perd de sa valeur : cette perte est
        déduite du remboursement, jusqu’au prix total si la pièce ne peut plus être vendue.
      </p>
      <p>
        Nous vous remboursons sous 14 jours, sur le moyen de paiement utilisé, le prix des articles et, si vous retournez
        toute la commande, les frais de livraison initiaux (dans la limite du tarif standard). Les pièces faites selon vos
        choix (sur mesure, personnalisées) ne peuvent être ni reprises ni échangées, sauf défaut. Détails : <Link to="/conditions-generales-de-vente">conditions générales de vente</Link>.
      </p>
    </Prose>
  );
}

// ---------------------------------------------------------------- Formulaire type de rétractation
export function WithdrawalFormPage() {
  const SHOP = useShop();
  return (
    <Prose title="Formulaire de rétractation">
      <p>
        Vous pouvez aussi nous prévenir par simple email ou depuis <Link to="/suivi-commande">Suivre ma commande</Link> :
        l’utilisation de ce formulaire n’est pas obligatoire. <button type="button" onClick={() => window.print()} className="underline text-garance">Imprimer ce formulaire</button>
      </p>
      <div className="border border-laine-fonce bg-white/60 p-6 space-y-4">
        <p><em>(Veuillez compléter et renvoyer le présent formulaire uniquement si vous souhaitez vous rétracter du contrat.)</em></p>
        <p>À l’attention de {SHOP.legalName}, {SHOP.address}, <Contact /> :</p>
        <p>Je/nous (*) vous notifie/notifions (*) par la présente ma/notre (*) rétractation du contrat portant sur la vente du bien (*)/pour la prestation de services (*) ci-dessous :</p>
        <p>……………………………………………………………</p>
        <p>Commandé le (*)/reçu le (*) : ……………………</p>
        <p>Nom du (des) consommateur(s) : ……………………</p>
        <p>Adresse du (des) consommateur(s) : ……………………</p>
        <p>Signature du (des) consommateur(s) (uniquement en cas de notification du présent formulaire sur papier) : ……………………</p>
        <p>Date : ……………………</p>
        <p><em>(*) Rayez la mention inutile.</em></p>
      </div>
    </Prose>
  );
}

// ---------------------------------------------------------------- Confidentialité (RGPD)
export function PrivacyPage() {
  const SHOP = useShop();
  return (
    <Prose title="Politique de confidentialité">
      <p>Ce que le site collecte, pourquoi, combien de temps, et vos droits (RGPD).</p>
      <p><em>{updated}</em></p>

      <h2>Qui est responsable de vos données ?</h2>
      <p>
        {SHOP.legalName}, {SHOP.legalForm}, SIRET {SHOP.siret}, {SHOP.address}. Pour toute question ou pour exercer vos droits :{' '}
        <Contact />.
      </p>

      <h2>Quelles données, pourquoi, combien de temps ?</h2>
      <ul>
        <li>
          <strong>Commandes</strong> : nom, email, téléphone, adresse de livraison, articles achetés, montant. Pour traiter et
          livrer votre commande, gérer les retours et le service client (exécution du contrat), puis pour la comptabilité
          (obligation légale). Conservées 10 ans (article L123-22 du Code de commerce).
        </li>
        <li>
          <strong>Paiement</strong> : traité directement par Stripe. Nous ne recevons jamais votre numéro de carte, seulement
          la confirmation du paiement.
        </li>
        <li>
          <strong>Compte client</strong> (connexion par lien envoyé par email) : email, favoris. Pour vous donner accès à vos
          commandes, factures et favoris. Conservé tant que vous l’utilisez, et supprimé après 3 ans d’inactivité ou à votre demande.
        </li>
        <li>
          <strong>Lettre d’information</strong> : email. Uniquement avec votre accord, jusqu’à votre désinscription (lien
          présent dans chaque envoi) ou 3 ans sans interaction.
        </li>
        <li>
          <strong>Messages, demandes sur mesure, avis, alertes de retour en stock</strong> : nom, email, message. Pour vous
          répondre ou vous prévenir ; conservés au plus 3 ans. Les avis publiés n’affichent jamais votre email.
        </li>
        <li>
          <strong>Demandes de catalogue papier</strong> : nom, adresse, email. Pour l’envoi uniquement ; supprimées un an après.
        </li>
        <li>
          <strong>Mesure d’audience</strong> : nous comptons de façon anonyme les vues et ajouts au panier de chaque produit,
          sans cookie et sans vous identifier. Vous pouvez refuser ce comptage via « Gérer mes données » en bas de page.
        </li>
        <li>
          <strong>Sécurité</strong> : journaux techniques sans données de paiement, conservés quelques semaines pour
          prévenir la fraude et les abus (intérêt légitime).
        </li>
      </ul>

      <h2>Qui reçoit vos données ?</h2>
      <p>Vos données ne sont jamais vendues. Elles sont transmises uniquement aux prestataires nécessaires :</p>
      <ul>
        <li>Stripe (paiement) — Stripe Payments Europe, Irlande ;</li>
        <li>Netlify (hébergement du site) — États-Unis ;</li>
        <li>Supabase (base de données) — données stockées dans l’Union européenne (Francfort) ;</li>
        <li>Resend (envoi des emails de commande), si activé — États-Unis ;</li>
        <li>le transporteur choisi (La Poste / Colissimo, Mondial Relay) : nom, adresse, téléphone, pour la livraison.</li>
      </ul>
      <p>
        Lorsque des données sont traitées hors de l’Union européenne, le transfert est encadré par les clauses contractuelles
        types de la Commission européenne ou par le cadre de protection des données UE–États-Unis (Data Privacy Framework).
      </p>

      <h2>Vos droits</h2>
      <p>
        Vous pouvez accéder à vos données, les rectifier, les effacer, en limiter l’utilisation, vous opposer à leur
        traitement, retirer votre consentement à tout moment, demander leur portabilité et définir des directives sur leur
        sort après votre décès. Écrivez à <Contact /> ; nous répondons sous un mois. Si vous estimez que vos droits ne sont
        pas respectés, vous pouvez adresser une réclamation à la CNIL (<a href="https://www.cnil.fr" target="_blank" rel="noreferrer">www.cnil.fr</a>).
      </p>

      <h2>Cookies</h2>
      <p>Voir la page <Link to="/cookies">Cookies et stockage local</Link>.</p>
    </Prose>
  );
}

// ---------------------------------------------------------------- Cookies
export function CookiesPage() {
  return (
    <Prose title="Cookies et stockage local">
      <p><em>{updated}</em></p>
      <p>
        Ce site n’utilise <strong>aucun cookie publicitaire</strong>, aucun outil de suivi externe et aucun réseau social
        intégré. Les polices de caractères sont hébergées avec le site (aucune connexion à Google).
      </p>
      <h2>Ce qui est enregistré sur votre appareil</h2>
      <ul>
        <li><strong>Votre panier, vos favoris et les dernières pièces consultées</strong> : nécessaires au fonctionnement de la boutique, enregistrés uniquement dans votre navigateur.</li>
        <li><strong>Votre connexion à « Mon compte »</strong> : jeton de session, nécessaire pour rester connecté.</li>
        <li><strong>Vos choix de confidentialité</strong> : pour ne pas vous redemander à chaque visite.</li>
      </ul>
      <p>Ces éléments sont strictement nécessaires au service que vous demandez : ils ne nécessitent pas votre consentement.</p>
      <h2>Mesure d’audience</h2>
      <p>
        Nous comptons anonymement les vues et ajouts au panier de chaque produit, sans cookie et sans vous identifier.
        Vous pouvez refuser ce comptage avec le bouton « Refuser les statistiques » ou via « Gérer mes données » en bas de page.
      </p>
      <h2>Page de paiement</h2>
      <p>
        La page de paiement est fournie par Stripe, sur son propre site : Stripe peut y déposer des cookies nécessaires à la
        sécurité du paiement et à la prévention de la fraude (voir la politique de Stripe sur stripe.com).
      </p>
      <h2>Tout effacer</h2>
      <p>« Gérer mes données », en bas de chaque page, permet d’effacer tout ce que le site a enregistré sur votre appareil.</p>
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
