# Ouvrir la boutique au plus vite

Le code est prêt. Ce qui reste ne peut être fait que par vous (comptes, clés, informations légales).
Comptez **une demi-journée**, plus le délai de validation du compte Stripe (souvent le jour même).
Dans l’espace vendeur, le bloc **« Prêt pour l’ouverture ? »** du tableau de bord coche chaque point automatiquement.

## Bloquant — sans cela, pas de vente

| # | À faire | Où | Durée |
|---|---|---|---|
| 1 | Créer le projet Supabase, lancer `supabase/schema.sql`, créer votre compte vendeur | Guide, étape 1 | 20 min |
| 2 | Ouvrir et **activer** le compte Stripe (SIRET, IBAN, pièce d’identité) | Guide, étape 2 | 15 min + validation |
| 3 | Relier GitHub à Netlify et saisir les variables | Guide, étape 3 | 15 min |
| 4 | Créer le webhook Stripe (3 événements) | Guide, étape 4 | 5 min |
| 5 | Remplir raison sociale, SIRET, adresse, TVA | `src/config.ts` | 5 min |
| 6 | Email, téléphone, WhatsApp de contact | Espace vendeur → Réglages | 5 min |
| 7 | Adhérer à un **médiateur de la consommation** et l’indiquer | Réglages → Coordonnées | 30 min |
| 8 | Ajouter vos vrais produits avec vos photos, supprimer les exemples | Espace vendeur → Produits | selon catalogue |
| 9 | Commande test avec la carte `4242 4242 4242 4242`, puis passage en **clés réelles** | Guide, étape 5 | 15 min |

## Conseillé — dans la première semaine

- Double authentification sur votre compte vendeur (Réglages → Sécurité du compte).
- Emails automatiques via Resend, avec votre nom de domaine (guide, étape 4 bis).
- Nom de domaine (Netlify → Domain management), puis déclaration dans Google Search Console.
- Texte « Notre histoire » et titre de la page d’accueil (Réglages).
- Faire relire CGV, mentions légales et conditions vendeurs par un juriste.
- Place de marché : activer Stripe Connect **ou** désactiver les candidatures d’artisans en attendant (Réglages).

## Vérifications techniques déjà faites

- Compilation du site et des fonctions serveur : sans erreur.
- `schema.sql` testé sur une base vierge, **deux fois de suite** (relance sans risque).
- 21 contrôles de sécurité de la base réussis : un visiteur ne peut ni modifier un prix, ni voir une commande,
  ni lire l’email d’un client ; un client ne voit que ses commandes ; un artisan ne peut ni s’auto-valider,
  ni changer sa commission, ni toucher aux produits de l’atelier.
- Affichage vérifié sur téléphone, tablette et ordinateur (aucun débordement).

Relancer le test de sécurité de la base (Docker) :

```bash
docker run --rm -v "$PWD/supabase":/work -w /work/tests node:20-alpine sh -c "npm install --silent && npm test"
```
