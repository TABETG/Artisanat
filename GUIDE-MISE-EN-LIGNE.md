# Mettre la boutique en ligne — guide pas à pas

Durée : environ 1 heure. Aucune installation sur votre ordinateur.

| Service | Rôle | Prix |
|---|---|---|
| **Netlify** | Héberge le site | Gratuit |
| **Supabase** | Produits, photos, commandes, connexion vendeur | Gratuit |
| **Stripe** | Paiement Visa, Mastercard, CB, Apple Pay, Google Pay | Aucun abonnement, commission par vente (≈ 1,5 % + 0,25 € par carte européenne — voir stripe.com/fr/pricing) |
| Nom de domaine (ex. `tamurt.fr`) | Adresse du site | ≈ 10 € / an (OVH, Gandi, ou directement dans Netlify) |

---

## 0. Voir le site tout de suite (mode démonstration)

```bash
/c/Windows/System32/tar.exe -xf boutique-tamurt.zip
cd boutique-tamurt
docker compose up
```
Ouvrir http://localhost:5173 — produits et photos d’exemple, paiement simulé.

Espace vendeur de démonstration : http://localhost:5173/admin — identifiants préremplis `demo@tamurt.fr` / `demo`.
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
   cd boutique-tamurt
   git init && git add . && git commit -m "Boutique Tamurt"
   git branch -M main
   git remote add origin https://github.com/VOTRE-COMPTE/boutique-tamurt.git
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

## 4 bis. Email automatique « rupture de stock » (facultatif, gratuit)

Sans cette étape, les ruptures s’affichent quand même dans l’espace vendeur (onglet **Alertes stock**).
Pour recevoir aussi un email :
1. Créer un compte sur https://resend.com → **API Keys → Create**.
2. Dans Netlify, ajouter `RESEND_API_KEY` (la clé) et `OWNER_EMAIL` (votre email, le même que le compte Resend) → redéployer.

## 5. Tester avant d’ouvrir

1. Aller sur `/admin`, se connecter, **Ajouter un produit** avec une photo.
2. L’acheter sur le site avec la carte de test `4242 4242 4242 4242`, date future, code `123`.
3. Vérifier : la commande apparaît dans **Commandes**, le stock a baissé, le reçu est arrivé.
4. Passer en réel : remplacer les clés `sk_test` par `sk_live`, recréer le webhook en mode réel, redéployer.

## 6. Personnaliser

- Nom, email, téléphone, WhatsApp, SIRET, adresse : `src/config.ts`
- Frais et pays de livraison : `src/shipping.ts`
- Photos d’exemple : dossier `public/exemples/` (illustrations générées, à remplacer par vos vraies photos)
- Textes « Notre histoire » et pages légales : `src/pages/StoryPage.tsx`, `src/pages/LegalPages.tsx` (à faire relire)
- Nom de domaine : Netlify → **Domain management → Add a domain**

Chaque `git push` met le site à jour automatiquement.

---

## Utilisation au quotidien (propriétaire)

- **Ajouter un produit** : `/admin` → *Ajouter un produit* → photos, nom, prix, quantité → *Enregistrer*. Fonctionne sur téléphone (appareil photo direct).
- **Retirer un produit** sans le supprimer : décocher *En ligne*.
- **Rupture de stock** : quand la quantité tombe à 0, le produit reste visible avec « Rupture de stock », une pastille rouge apparaît sur *Alertes stock* (et un email si l’étape 4 bis est faite). *Remettre en vente* en un clic.
- **Clients qui attendent** : sur un produit en rupture, les visiteurs peuvent laisser leur email. Dans *Alertes stock*, bouton *Écrire à ces clients* dès que le produit revient.
- **Nouvelle commande** : email de Stripe + onglet *Commandes → À préparer*. Adresse du client, articles, bouton *Prévenir le client par email*.
- **Après expédition** : saisir le numéro de suivi, passer l’étape à *Expédiée*.
- **Rembourser** : lien *Voir le paiement dans Stripe* dans la commande → *Rembourser*.
