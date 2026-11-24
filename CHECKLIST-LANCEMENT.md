# Checklist de lancement

Dans l’espace vendeur, le bloc **« Prêt pour l’ouverture ? »** du tableau de bord coche aussi ces points automatiquement.
Détails techniques : [GUIDE-MISE-EN-LIGNE.md](GUIDE-MISE-EN-LIGNE.md) · Coûts : [COUTS.md](COUTS.md).

## Fait

| # | Étape | État |
|---|---|---|
| 1 | Boutique France uniquement (euros, livraison France, sans cosmétiques ni place de marché) | ✅ |
| 2 | Supabase : projet créé, `schema.sql` lancé, compte propriétaire | ✅ |
| 3 | Netlify : site relié à `develop`, variables saisies, Node 22, site public | ✅ |
| 4 | Stripe en mode test, webhook à 8 événements | ✅ |
| 5 | Commande test de bout en bout (paiement → commande → stock) | ✅ |
| 6 | Pages légales : mentions légales, CGV, confidentialité, cookies, formulaire de rétractation, registre RGPD | ✅ |
| 7 | Raison sociale, SIRET, adresse, mention TVA dans `src/config.ts` | ✅ |
| 8 | Emails clients prêts (confirmation, expédition, annulation, remboursement) | ✅ code prêt, envoi après l’étape 11 |
| 9 | Pièces faites sur demande non retournables, clause d’utilisation dans les CGV | ✅ |

## À faire avant d’ouvrir (bloquant)

| # | Étape | Qui | Payant ? |
|---|---|---|---|
| 10 | Choisir le **nom de la boutique** | vous | non |
| 11 | Acheter le **nom de domaine**, le relier à Netlify, créer `contact@…`, brancher Resend (guide, étape 4 bis) | vous, avec mon aide | **oui** (domaine) |
| 12 | Adhérer à un **médiateur de la consommation**, puis le renseigner dans *Réglages → Coordonnées* | vous | **oui** |
| 13 | Ajouter l’activité de **vente de marchandises** à la micro-entreprise, si ce n’est pas déjà fait | vous | non |
| 14 | Email et téléphone dans *Réglages → Coordonnées* (plus de mention « à compléter » sur le site) | vous | non |
| 15 | **Vrais produits** avec vos photos ; retirer les produits d’exemple | vous | non |
| 16 | Relancer `supabase/schema.sql` en entier (met la base à jour, sans risque) | vous | non |
| 17 | Commande test complète : paiement, expédition, remboursement, retour | vous | non |
| 18 | **Stripe en paiement réel** : activation du compte, clé `sk_live_…`, nouveau webhook réel | vous, **avec accord explicite** | commission par vente |

## Conseillé la première semaine

- Double authentification sur le compte vendeur (*Réglages → Sécurité du compte*).
- Changer le secret du webhook de test (il a circulé dans une discussion) : Stripe → Webhooks → *Renouveler le secret*, puis Netlify.
- Désactiver dans Stripe les moyens de paiement non souhaités (Klarna, Bancontact, Amazon Pay…).
- Google Search Console avec le nom de domaine.
- Faire relire CGV et mentions légales par un juriste.
- Surveiller les crédits Netlify (*Usage & billing*) : regrouper les publications.

## Vérifications techniques déjà faites

- 40 tests automatiques : paiement, webhook rejoué, double paiement, stock réservé pendant le paiement, pièce unique, remboursements total et partiel, double clic, livraison, emails.
- 28 contrôles de sécurité de la base : un visiteur ne peut ni modifier un prix, ni lire une commande ou l’email d’un client ; un client ne voit que ses commandes.
- `schema.sql` testé sur une base vierge, deux fois de suite.
- Aucune clé secrète dans les variables `VITE_` : la construction du site s’arrête sinon.

Relancer les tests (Docker) :

```bash
docker compose -f docker-compose.tests.yml run --rm tests
```
