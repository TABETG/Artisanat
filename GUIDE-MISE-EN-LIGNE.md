# Mettre la boutique en ligne — guide pas à pas

Boutique unique : **France**, prix en **euros**, paiement par **carte** (Stripe), livraison en **France métropolitaine**.
Aucune installation sur votre ordinateur : tout passe par Docker, GitHub et les sites des services.

Coûts détaillés, avec les liens officiels : [COUTS.md](COUTS.md). Ordre de lancement : [CHECKLIST-LANCEMENT.md](CHECKLIST-LANCEMENT.md).

> **Règles de sécurité**
> - Une clé secrète ne va **jamais** dans une variable qui commence par `VITE_` (visible par les visiteurs). La construction du site s’arrête si c’est le cas.
> - Les clés secrètes se saisissent **uniquement** dans Netlify (*Keys and secrets*), jamais dans le code, un email ou une discussion.
> - Le passage de Stripe en paiement réel se fait en dernier, une fois tout vérifié en mode test.

---

## 0. Voir le site sur votre ordinateur (mode démonstration)

```bash
cd /c/FORMATION/Artisanat
docker compose up
```
Ouvrir http://localhost:5173 — produits et photos d’exemple, paiement simulé.
Espace vendeur de démonstration : http://localhost:5173/admin — identifiants préremplis `demo@artisanat.fr` / `demo`.

Lancer les tests automatiques (paiement, stock, remboursements, livraison, emails) :
```bash
docker compose -f docker-compose.tests.yml run --rm tests
```

---

## 1. Supabase (base de données)

1. Compte sur https://supabase.com → **New project**, région **Europe (Frankfurt)** ou **Paris**.
2. **SQL Editor → New query** : coller tout `supabase/schema.sql` → **Run**.
   Ce fichier se relance sans risque : **après chaque mise à jour du site qui touche la base, relancez-le en entier**.
3. **Authentication → Users → Add user → Create new user** : email + mot de passe du propriétaire (*Auto Confirm User*).
4. Ouvrir `supabase/ajouter-proprietaire.sql`, remplacer l’email, le coller dans le SQL Editor → **Run**.
5. **Authentication → Sign In / Providers** : laisser **Email** activé (les clients se connectent par lien email ; l’espace vendeur reste réservé aux comptes de l’onglet *Équipe*).
6. **Authentication → URL Configuration** : *Site URL* = l’adresse du site ; *Redirect URLs* : `https://VOTRE-SITE/compte` et `https://VOTRE-SITE/admin/nouveau-mot-de-passe`.
7. **Project Settings → API Keys** : noter l’adresse du projet (`https://xxxx.supabase.co`), la clé **publishable** (`sb_publishable_…`) et la clé **secret** (`sb_secret_…`).

Le plan gratuit met le projet en pause après **7 jours sans activité**. Une boutique visitée chaque jour n’est pas concernée ; avant l’ouverture, ouvrez l’espace vendeur au moins une fois par semaine.

## 2. Stripe (paiement)

1. Compte sur https://dashboard.stripe.com, en **mode test** (*sandbox*) pour commencer.
2. **Développeurs → Clés API** : noter la **clé secrète** (`sk_test_…`).
3. **Paramètres → Moyens de paiement** : Cartes, Apple Pay, Google Pay. Désactivez ce que vous ne voulez pas proposer (Klarna, Bancontact, Amazon Pay…).
4. **Paramètres → Emails clients** : activer **Paiements réussis** (reçu Stripe).
5. Activation du compte réel (SIRET, IBAN, pièce d’identité) : à faire, mais le passage en réel n’intervient qu’à l’étape 5.

## 3. Netlify (hébergement)

1. https://app.netlify.com → **Add new site → Import an existing project → GitHub** → dépôt `TABETG/Artisanat`, branche **`develop`**. Les réglages sont lus dans `netlify.toml` (Node 22).
2. **Site configuration → Environment variables** (*Keys and secrets*) :

   | Nom | Valeur | Visible par les visiteurs ? |
   |---|---|---|
   | `VITE_SUPABASE_URL` | adresse du projet Supabase | oui (normal) |
   | `VITE_SUPABASE_ANON_KEY` | clé `sb_publishable_…` | oui (normal) |
   | `SUPABASE_SERVICE_ROLE_KEY` | clé `sb_secret_…` | **non, secrète** |
   | `STRIPE_SECRET_KEY` | `sk_test_…` (puis `sk_live_…`) | **non, secrète** |
   | `STRIPE_WEBHOOK_SECRET` | `whsec_…` (étape 4) | **non, secrète** |
   | `AWS_LAMBDA_JS_RUNTIME` | `nodejs22.x` | non — **obligatoire**, sinon les fonctions échouent (« native WebSocket not found ») |
   | `GIFT_CARD_SECRET` | longue phrase aléatoire | **non, secrète** — conseillé |
   | `OWNER_EMAIL` | votre email (alertes de commande) | non — facultatif |

3. **Site configuration → General → Visibility** : *Production* en **Public** (sinon ni les clients ni Stripe n’accèdent au site).
4. **Deploys → Trigger deploy**. Le site est en ligne sur `https://xxx.netlify.app`.

**Chaque `git push` sur `develop` publie le site.** Sur le plan gratuit, chaque publication consomme 15 crédits sur 300 par mois, soit environ 20 publications par mois : regroupez vos modifications. Si les crédits sont épuisés, le site affiche « Site not available » jusqu’au mois suivant. Suivi : Netlify → **Usage & billing**.

## 4. Relier Stripe au site (webhook)

1. Stripe → **Développeurs → Webhooks → Ajouter une destination**.
2. URL : `https://VOTRE-SITE/.netlify/functions/stripe-webhook`
3. Événements (8) :
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`,
   `charge.refunded`, `refund.created`, `refund.updated`, `refund.failed`.
4. Copier le **secret de signature** (`whsec_…`) dans Netlify → `STRIPE_WEBHOOK_SECRET` → redéployer.

Ce que fait le webhook, une seule fois par événement même si Stripe le renvoie : enregistre la commande, décompte le stock, numérote la facture, envoie les emails ; libère la réservation des paiements abandonnés ; reprend les remboursements faits depuis le tableau de bord Stripe.

## 4 bis. Emails automatiques (Resend — nécessite votre nom de domaine)

Sans cette étape, tout fonctionne : l’espace vendeur ouvre votre messagerie avec le message déjà rédigé.

| Email | Destinataire | Quand |
|---|---|---|
| « Commande n° … confirmée » (on la prépare) | client | juste après le paiement |
| « Votre commande est en route » + lien de suivi | client | commande passée en *Expédiée* |
| « Votre commande a été annulée » | client | commande passée en *Annulée* (case cochée) |
| « Votre remboursement est effectué » | client | bouton *Rembourser* |
| « … est de nouveau disponible » | clients inscrits | remise en stock |
| Code de la carte cadeau | acheteur et destinataire | après l’achat |
| « Nouvelle commande », « Rupture de stock », demandes et retours | vous | à chaque événement |

1. Acheter le nom de domaine, puis compte sur https://resend.com → **Domains → Add domain** → ajouter chez le registraire les lignes DNS indiquées.
2. **API Keys → Create API key**.
3. Netlify, puis redéployer :

   | Nom | Valeur |
   |---|---|
   | `RESEND_API_KEY` | la clé Resend (**secrète**) |
   | `EMAIL_FROM` | `Nom de la boutique <commandes@votre-domaine.fr>` |
   | `OWNER_EMAIL` | votre email |

4. Supabase → **Authentication → Emails → SMTP Settings** : `smtp.resend.com`, port 465, utilisateur `resend`, mot de passe = clé Resend (les liens de connexion des clients partent alors de votre domaine).
5. Coordonnées affichées sur le site : *Espace vendeur → Réglages → Coordonnées* (email `contact@…`, téléphone, médiateur).

## 5. Tester, puis passer en paiement réel

1. `/admin` → **Ajouter un produit** avec une photo.
2. L’acheter avec la carte de test `4242 4242 4242 4242`, date future, code `123`.
3. Vérifier : commande dans **Commandes**, stock baissé, facture numérotée ; puis tester *Expédiée*, *Rembourser* et un retour.
4. **Passage en réel (avec votre accord explicite, en dernier)** : Stripe en mode réel → nouvelle clé `sk_live_…` dans `STRIPE_SECRET_KEY`, **nouveau webhook** créé en mode réel (mêmes 8 événements) et son `whsec_…` dans `STRIPE_WEBHOOK_SECRET`, redéployer, puis une vraie commande de quelques euros, remboursée ensuite.

## 6. Où se règle quoi

| Élément | Où |
|---|---|
| Nom, raison sociale, SIRET, adresse, TVA, hébergeurs | `src/config.ts` |
| Email, téléphone, médiateur, réseaux sociaux | Espace vendeur → Réglages → Coordonnées |
| Frais, délais, préparation | Espace vendeur → Livraison |
| Accueil, « Notre histoire », catégories, bandeau | Espace vendeur → Réglages |
| Pages légales | `src/pages/LegalPages.tsx` ; registre RGPD : `docs/registre-des-traitements.md` |
| Nom de domaine | Netlify → Domain management → Add a domain |

---

## Utilisation au quotidien (propriétaire)

**Tableau de bord** (`/admin`) : ventes du mois, commandes à préparer, ruptures, clients en attente, meilleures ventes.

**Produits**
- *Ajouter un produit* : photos (glisser-déposer ou appareil photo du téléphone), nom, prix, quantité. Les champs marqués `*` sont obligatoires, les autres améliorent la fiche. L’aperçu à droite montre le rendu dans la boutique.
- *Enregistrer et ajouter un autre* : garde la catégorie, la matière et l’origine pour enchaîner.
- *Ancien prix* : crée une promotion (prix barré + badge « −X % »).
- *Dupliquer* : copie un produit pour une série proche (reste masquée tant que vous ne la mettez pas en ligne).
- Stock modifiable directement dans la liste avec − / +. Filtres : en ligne, masqués, rupture, stock bas, promotion.
- L’œil masque un produit sans le supprimer.

**Réglages** : bandeau d’annonce, titre et phrase de la page d’accueil, texte « Notre histoire », catégories (ajouter, renommer, réordonner), message cadeau au paiement, frais et délais de livraison, coordonnées. Les changements s’appliquent tout de suite, paiement compris.

**Promotion en quelques clics** : dans *Produits*, cochez les articles (ou *Tout sélectionner*), choisissez −10 %, −20 %… puis *Appliquer*. L’ancien prix s’affiche barré. *Retirer la promotion* remet le prix d’origine.

**Badges** : automatiques (« −X % », « Fin dans X jours », « Meilleure vente », « Nouveauté », « Pièce unique », « Plus que X », « Rupture de stock », « Livraison offerte ») ou choisis dans la fiche produit (« Coup de cœur », « Meilleur prix », « Édition limitée », « Exclusivité », « Pièce ancienne », « Teintures végétales », « Prix choc », « Dernière chance »). Une promotion peut avoir une date de fin : le prix d’origine revient tout seul le lendemain.

**Codes promo** : onglet *Codes promo* → code, réduction en % ou en €, date de fin, nombre d’utilisations, montant minimum. Le client le saisit sur la page de paiement ; la remise et le code apparaissent dans la commande.

**Livraison** (onglet *Livraison*, France métropolitaine uniquement) :
- *Modes* : point relais (Mondial Relay), Colissimo à domicile, Chronopost express, retrait à l’atelier… Pour chacun : prix (vide = non proposé), livraison offerte dès un montant, supplément grand tapis (plus de 3 m²), délais, et refus des grands tapis (utile pour les points relais).
- *Préparation* : jours avant l’expédition. Ce chiffre est repris partout : fiches produit, panier, page *Livraison et retours* et CGV.
- *Point relais* : le client indique le point souhaité sur la page de paiement ; il apparaît dans la commande. S’il ne l’a pas fait, un rappel jaune vous invite à lui écrire avant d’expédier. Le bordereau se crée sur le site de Mondial Relay (aucune intégration payante).
Le client choisit son mode dans le panier, voit la date de livraison estimée sur chaque fiche produit, et le prix est recalculé au paiement.

**Clients** : tous vos acheteurs, avec leurs commandes, le total dépensé, les clients fidèles, l’inscription à la lettre et l’export Excel.

**Inventaire** : bouton *Inventaire* dans *Produits* pour exporter tous les produits (prix, stock, ventes) dans Excel.

**Sécurité du compte** (fortement conseillé) : *Réglages → Sécurité du compte → Activer*. Scannez le QR code avec Google Authenticator ou Microsoft Authenticator ; un code à 6 chiffres vous sera demandé à chaque connexion. Même avec votre mot de passe, personne ne peut modifier la boutique sans votre téléphone.

**Demandes sur mesure** : les clients décrivent le tapis souhaité (dimensions, couleurs, budget) sur la page *Sur mesure* ou depuis une fiche produit. Vous suivez chaque demande (nouvelle → devis envoyé → en fabrication → terminée) et envoyez le devis en un clic.

**Cartes cadeaux** : vendues sur la page *Carte cadeau* (20 à 2 000 €). Après le paiement, un code à usage unique valable 1 an est créé et envoyé à l’acheteur (et au destinataire si son email est indiqué). L’onglet *Cartes cadeaux* montre celles qui ont été utilisées.

**Sur téléphone** : ouvrez `/admin` dans Chrome ou Safari, puis *Ajouter à l’écran d’accueil* : l’espace vendeur s’ouvre comme une application.

**Messages** : les visiteurs vous écrivent depuis l’onglet *Contact* (sur le bord droit du site). Onglet *Messages* : *Répondre* ouvre votre messagerie avec le message cité, puis le passe en « traité ».

**Confidentialité (RGPD)** : à la première visite, un bandeau explique qu’aucun cookie publicitaire n’est utilisé et permet de refuser les statistiques anonymes. Le visiteur peut à tout moment gérer ses données (effacer panier, favoris, historique) depuis *Gérer mes données* en bas de page.

**Mon compte (clients)** : connexion sans mot de passe, par lien envoyé par email. Le client y retrouve ses commandes (suivi, facture, retour, « Commander à nouveau »), ses favoris sur tous ses appareils, ses cartes cadeaux, son inscription à la lettre et l’export de ses données (RGPD).

**Paniers abandonnés** : la pièce réservée est libérée automatiquement quand la page de paiement expire (32 minutes). Aucun email de relance n’est envoyé : Stripe ne permet pas de recueillir l’accord du client en France.

**Équipe et journal** : onglet *Équipe et journal* pour donner l’accès vendeur à un associé (il reçoit une invitation) et voir l’historique des actions (produits, commandes, remboursements, réglages).

**Une seule boutique : la France** — prix en euros, paiement par carte (Stripe), livraison en France métropolitaine selon l’onglet *Livraison*.

**Types de produits** : chaque catégorie a un type (*Réglages → Catégories*) qui décide des champs de la fiche :
- *Textile* (tapis, coussins, plaids) : dimensions, surface, hauteur des poils, guide des tailles.
- *Bijoux* : métal, pierres et décor, taille ou longueur, mention « sans nickel ».
- *Décoration et accessoires* : matière, dimensions.
Les cosmétiques ne sont pas vendus sur cette boutique. Pour les bijoux, respecter les limites de nickel, plomb et cadmium (règlement REACH) : demandez un certificat à votre fournisseur.

**Pièce faite selon les choix d’un client** : dans la fiche produit, cochez *Pièce faite selon les choix d’un client : non retournable* uniquement pour une pièce fabriquée à sa demande (dimensions, couleurs, motif ou gravure choisis par lui). Le client en est averti sur la fiche, dans le panier et sur la page de paiement. Une pièce déjà fabriquée et mise en vente reste retournable 14 jours, même faite main.

**Artisans partenaires** (désactivé : *Réglages → Place de marché*, à n’ouvrir qu’après Stripe Connect et relecture juridique) : un artisan candidate depuis la page *Vendre mes créations* (après s’être connecté). Onglet *Artisans partenaires* :
- *Candidatures* : valider ou refuser.
- L’artisan validé active ses paiements (Stripe, 5 minutes), puis ajoute ses créations depuis *Mon compte → Mon atelier*.
- *Produits à valider* : chaque création (et chaque changement de nom, prix, photo ou description) passe par vous avant d’être publiée.
- Au paiement, le client paie tout en une fois ; chaque artisan reçoit automatiquement ses ventes moins la commission, plus ses frais d’envoi, et un email avec la commande à expédier. Il indique son numéro de suivi dans son espace.
- *Reversements* : commission perçue et montants versés.

**Lettre d’information** : les visiteurs s’inscrivent en bas du site. Onglet *Lettre d’information* : écrivez l’objet et le message, choisissez jusqu’à 6 produits (photo + lien), envoyez-vous un test puis envoyez à tous. Chaque email contient un lien de désinscription (obligatoire). Nécessite l’étape 4 bis (Resend).

**Retours** : le client demande un retour depuis *Suivre ma commande* (articles, motif). Onglet *Retours* : *Accepter et envoyer l’adresse*, puis à réception *Colis reçu : rembourser* (remboursement Stripe + remise en stock en un clic). Retour complet : articles et livraison initiale remboursés ; retour partiel : articles seulement. Les montants restent modifiables.
Photographiez chaque pièce avant l’envoi et à l’ouverture d’un colis retourné : si la pièce a été utilisée (tapis sur lequel on a marché, bijou porté, étiquette retirée), déduisez la perte de valeur du montant remboursé (CGV, article 7).

**Vente flash** : dans *Réglages → Bandeau d’annonce*, ajoutez une date de fin : le bandeau affiche un compte à rebours puis disparaît tout seul.

**Mise en ligne programmée** : dans la fiche produit, *Mise en ligne programmée* : le produit reste invisible jusqu’à la date choisie (idéal pour une nouvelle collection).

**Statistiques** : vues, ajouts au panier et ventes par produit (anonymes, sans cookie) dans la liste des produits, la fiche produit et le tableau de bord (*Les plus regardés*).

**Nos réalisations** : les pièces vendues sont présentées automatiquement sur `/nos-realisations`, avec un lien « Le même pour moi » vers le sur mesure.

**Avis clients** : les clients notent les produits (1 à 5 étoiles). Rien n’est publié sans votre accord ; « Achat vérifié » est ajouté si l’email correspond à une commande.

**Retour en stock** : dès qu’un produit en rupture repasse à 1 ou plus, une fenêtre propose de prévenir les clients inscrits en un clic.

**Commandes**
- *À préparer* → imprimer le *bon de livraison* à glisser dans le colis.
- Choisir le transporteur, saisir le numéro de suivi, passer en *Expédiée* : le client reçoit son email avec le lien de suivi.
- *Exporter pour la comptabilité* : fichier Excel de toutes les commandes affichées.
- *Rembourser* : directement depuis la commande, en totalité ou en partie, avec remise en stock des articles retournés. Le client reçoit l’email « Votre remboursement est effectué » (case à décocher si besoin). Deux clics ne remboursent jamais deux fois.
- *Annulée* : passer la commande en *Annulée* propose d’envoyer l’email d’annulation au client, puis rappelle de le rembourser (obligatoire sous 14 jours).
- *Facture* : facture numérotée à imprimer ou enregistrer en PDF (numérotation continue).
- Les clients suivent eux-mêmes leur colis sur `/suivi-commande` (email + code postal).

**Référencement et partage** : `/sitemap.xml` et `/robots.txt` sont générés automatiquement. Un lien produit partagé sur WhatsApp ou Facebook affiche sa photo, son nom et son prix. À déclarer dans Google Search Console une fois le nom de domaine en place.
