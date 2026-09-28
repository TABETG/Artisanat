# Mettre la boutique en ligne — guide pas à pas

Durée : environ 1 heure. Aucune installation sur votre ordinateur.

| Service | Rôle | Prix |
|---|---|---|
| **Netlify** | Héberge le site | Gratuit |
| **Supabase** | Produits, photos, commandes, connexion vendeur | Gratuit |
| **Stripe** | Paiement Visa, Mastercard, CB, Apple Pay, Google Pay | Aucun abonnement, commission par vente (≈ 1,5 % + 0,25 € par carte européenne — voir stripe.com/fr/pricing) |
| Nom de domaine (ex. `artisanat.fr`) | Adresse du site | ≈ 10 € / an (OVH, Gandi, ou directement dans Netlify) |

---

## 0. Voir le site tout de suite (mode démonstration)

```bash
/c/Windows/System32/tar.exe -xf Artisanat.zip
cd Artisanat
docker compose up
```
Ouvrir http://localhost:5173 — produits et photos d’exemple, paiement simulé.

Espace vendeur de démonstration : http://localhost:5173/admin — identifiants préremplis `demo@artisanat.fr` / `demo`.
Tout ce que vous ajoutez reste dans votre navigateur (bouton « Réinitialiser la démonstration » en haut).

---

## 1. Supabase (base de données)

1. Créer un compte sur https://supabase.com → **New project** (région : *Europe West — Paris* ou *Frankfurt*).
2. **SQL Editor → New query** : coller tout le fichier `supabase/schema.sql` → **Run**.
3. **Authentication → Users → Add user → Create new user** : email + mot de passe du propriétaire (cocher *Auto Confirm User*).
   *Facultatif* : coller aussi `supabase/produits-exemple.sql` pour avoir 6 produits avec photos d’exemple.
4. Ouvrir `supabase/ajouter-proprietaire.sql`, remplacer l’email, le coller dans le SQL Editor → **Run**.
5. **Authentication → Sign In / Providers** : désactiver **Allow new users to sign up** (personne d’autre ne peut créer de compte).
6. **Project Settings → API** : noter `Project URL`, la clé `anon public` et la clé `service_role` (secrète).

## 2. Stripe (paiement)

1. Créer un compte sur https://stripe.com/fr et **activer le compte** (SIRET, IBAN, pièce d’identité).
2. **Développeurs → Clés API** : noter la **clé secrète** (`sk_test_...` pour tester, `sk_live_...` pour vendre).
3. **Paramètres → Moyens de paiement** : vérifier Cartes, Apple Pay, Google Pay (PayPal activable ici aussi).
4. **Paramètres → Emails clients** : activer **Paiements réussis** (le client reçoit son reçu).
5. **Paramètres → Notifications** : activer les emails de paiement réussi pour vous.

## 3. Netlify (hébergement)

1. Mettre le projet sur GitHub (dépôt privé) :
   ```bash
   cd Artisanat
   git init && git add . && git commit -m "Boutique Artisanat"
   git branch -M main
   git remote add origin https://github.com/TABETG/Artisanat.git
   git push -u origin main
   ```
2. https://app.netlify.com → **Add new site → Import an existing project → GitHub** → choisir le dépôt. Les réglages sont lus depuis `netlify.toml`.
3. **Site configuration → Environment variables** : ajouter

   | Nom | Valeur |
   |---|---|
   | `VITE_SUPABASE_URL` | Project URL Supabase |
   | `VITE_SUPABASE_ANON_KEY` | clé `anon public` |
   | `SUPABASE_SERVICE_ROLE_KEY` | clé `service_role` |
   | `STRIPE_SECRET_KEY` | clé secrète Stripe |
   | `STRIPE_WEBHOOK_SECRET` | (étape 4) |

4. **Deploys → Trigger deploy**. Le site est en ligne sur `https://xxx.netlify.app`.
5. Retour dans Supabase → **Authentication → URL Configuration** : *Site URL* = l’adresse Netlify (sert au lien « mot de passe oublié »).

## 4. Relier Stripe au site (webhook)

1. Stripe → **Développeurs → Webhooks → Ajouter une destination**.
2. Événements : `checkout.session.completed` et `checkout.session.async_payment_succeeded`.
3. URL : `https://VOTRE-SITE.netlify.app/.netlify/functions/stripe-webhook`
4. Copier le **secret de signature** (`whsec_...`) dans Netlify → `STRIPE_WEBHOOK_SECRET` → redéployer.

## 4 bis. Emails automatiques (facultatif, gratuit jusqu’à 3 000 emails / mois)

Sans cette étape, tout fonctionne : l’espace vendeur ouvre votre messagerie avec le message déjà rédigé.
Avec cette étape, les emails partent tout seuls :

| Email | Destinataire | Quand |
|---|---|---|
| « Votre commande est en route » + lien de suivi | client | vous passez une commande en « Expédiée » |
| « … est de nouveau disponible » + photo | clients inscrits | vous remettez en stock un produit en rupture |
| « Commande n° … confirmée » | client | juste après le paiement |
| « Nouvelle commande » | vous | à chaque paiement |
| « Rupture de stock » | vous | une vente fait tomber un stock à 0 |
| « Demande sur mesure » | vous | un client envoie une demande |
| Code de la carte cadeau | acheteur et destinataire | après l’achat d’une carte |

1. Créer un compte sur https://resend.com.
2. **Domains → Add domain** : votre nom de domaine, puis ajouter chez votre registraire les lignes DNS indiquées (10 minutes).
3. **API Keys → Create API key**.
4. Dans Netlify, ajouter puis redéployer :

   | Nom | Valeur |
   |---|---|
   | `RESEND_API_KEY` | la clé Resend |
   | `EMAIL_FROM` | `Artisanat <boutique@votre-domaine.fr>` |
   | `OWNER_EMAIL` | votre email personnel |

## 4 ter. Paiement en 3 fois avec Klarna (facultatif)

Stripe → **Paramètres → Moyens de paiement → Klarna → Activer**. Puis dans l’espace vendeur, **Réglages → Paiement en plusieurs fois** pour afficher « ou 3 × … sans frais » sur les fiches produit. Vous êtes payé en une seule fois, Klarna prend le risque.

## 5. Tester avant d’ouvrir

1. Aller sur `/admin`, se connecter, **Ajouter un produit** avec une photo.
2. L’acheter sur le site avec la carte de test `4242 4242 4242 4242`, date future, code `123`.
3. Vérifier : la commande apparaît dans **Commandes**, le stock a baissé, le reçu est arrivé.
4. Passer en réel : remplacer les clés `sk_test` par `sk_live`, recréer le webhook en mode réel, redéployer.

## 6. Personnaliser

- Nom, email, téléphone, WhatsApp, SIRET, adresse : `src/config.ts`
- Frais, délais et coordonnées : *Espace vendeur → Réglages* (sans toucher au code)
- Pays de livraison : `src/shipping.ts`
- Photos d’exemple : dossier `public/exemples/` (illustrations générées, à remplacer par vos vraies photos)
- Textes « Notre histoire » et pages légales : `src/pages/StoryPage.tsx`, `src/pages/LegalPages.tsx` (à faire relire)
- Nom de domaine : Netlify → **Domain management → Add a domain**

Chaque `git push` met le site à jour automatiquement.

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

**Modes de livraison** : dans *Réglages*, activez la livraison express et/ou le retrait gratuit à l’atelier. Le client choisit sur la page de paiement.

**Clients** : tous vos acheteurs, avec leurs commandes, le total dépensé, les clients fidèles, l’inscription à la lettre et l’export Excel.

**Inventaire** : bouton *Inventaire* dans *Produits* pour exporter tous les produits (prix, stock, ventes) dans Excel.

**Sécurité du compte** (fortement conseillé) : *Réglages → Sécurité du compte → Activer*. Scannez le QR code avec Google Authenticator ou Microsoft Authenticator ; un code à 6 chiffres vous sera demandé à chaque connexion. Même avec votre mot de passe, personne ne peut modifier la boutique sans votre téléphone.

**Demandes sur mesure** : les clients décrivent le tapis souhaité (dimensions, couleurs, budget) sur la page *Sur mesure* ou depuis une fiche produit. Vous suivez chaque demande (nouvelle → devis envoyé → en fabrication → terminée) et envoyez le devis en un clic.

**Cartes cadeaux** : vendues sur la page *Carte cadeau* (20 à 2 000 €). Après le paiement, un code à usage unique valable 1 an est créé et envoyé à l’acheteur (et au destinataire si son email est indiqué). L’onglet *Cartes cadeaux* montre celles qui ont été utilisées.

**Sur téléphone** : ouvrez `/admin` dans Chrome ou Safari, puis *Ajouter à l’écran d’accueil* : l’espace vendeur s’ouvre comme une application.

**Lettre d’information** : les visiteurs s’inscrivent en bas du site. Onglet *Lettre d’information* : écrivez l’objet et le message, choisissez jusqu’à 6 produits (photo + lien), envoyez-vous un test puis envoyez à tous. Chaque email contient un lien de désinscription (obligatoire). Nécessite l’étape 4 bis (Resend).

**Retours** : le client demande un retour depuis *Suivre ma commande* (articles, motif). Onglet *Retours* : *Accepter et envoyer l’adresse*, puis à réception *Colis reçu : rembourser* (remboursement Stripe + remise en stock en un clic).

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
- *Rembourser* : directement depuis la commande, en totalité ou en partie, avec remise en stock des articles retournés. Le client reçoit un email de Stripe.
- *Facture* : facture numérotée à imprimer ou enregistrer en PDF (numérotation continue).
- Les clients suivent eux-mêmes leur colis sur `/suivi-commande` (email + code postal).

**Référencement et partage** : `/sitemap.xml` et `/robots.txt` sont générés automatiquement. Un lien produit partagé sur WhatsApp ou Facebook affiche sa photo, son nom et son prix. À déclarer dans Google Search Console une fois le nom de domaine en place.
