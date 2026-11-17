# Correctifs paiement — 17 novembre 2026

Branche de travail : `correctifs-paiement` (sauvegarde de départ : branche `sauvegarde-avant-correctifs`).

## Ce qui a été corrigé

| Problème | Avant | Maintenant |
|---|---|---|
| Commande à moitié enregistrée | Le webhook créait la commande, puis les lignes, puis baissait le stock en plusieurs appels : une panne au milieu laissait une commande incomplète. | Une seule transaction PostgreSQL (`create_order_from_checkout`) : commande + lignes + stock + numéro de facture, ou rien. |
| Webhook reçu plusieurs fois | Commande protégée par l'identifiant de session, mais emails, cartes cadeaux et virements pouvaient partir deux fois. | Journal `stripe_events` ; chaque action (email client, email atelier, carte cadeau, virement) n'est faite qu'une fois. |
| Reprise après échec | Partielle. | Un événement en échec est rejoué en entier par Stripe ; ce qui est déjà fait est sauté. |
| Ordre des événements | Les données de l'événement étaient prises telles quelles. | L'état de la session est relu chez Stripe à chaque fois. |
| Pièce unique vendue deux fois | Vérification du stock sans réservation : deux clients pouvaient payer la même pièce. | Réservation du stock (verrou PostgreSQL) pendant le paiement ; libérée à l'expiration ou à l'échec ; prolongée 7 jours pour un paiement différé. |
| Remboursement des retours | Articles seulement, « hors frais de port ». | Retour complet : articles + livraison initiale (obligation légale) ; retour partiel : articles ; montants modifiables. |
| Double remboursement | Deux clics = deux remboursements possibles. | Verrou + plafond en base + clé d'idempotence Stripe ; un retour ne peut être remboursé qu'une fois. |
| Remboursements faits dans Stripe | Invisibles dans l'administration. | Repris automatiquement (webhook) avec leur statut réel. |
| Historique | Une ligne de texte dans la note. | Table `refunds` affichée dans chaque commande (montant, part livraison, statut, auteur, erreur). |
| Mode démonstration en production | Le site démarrait silencieusement en démonstration si Supabase manquait. | La construction Netlify de production échoue avec un message clair. |
| Clé secrète exposée | Rien n'empêchait une clé secrète dans une variable `VITE_`. | La construction échoue. |
| Pays de livraison | Choisi par le navigateur. | Forcé à la France côté serveur. |

## Après mise à jour : 2 actions dans Supabase et Stripe

1. **Supabase → SQL Editor** : exécuter tout `supabase/schema.sql` (sans danger, peut être rejoué ; les remboursements déjà faits sont repris dans l'historique).
2. **Stripe → Développeurs → Webhooks → votre point de terminaison** : cocher les événements
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`,
   `checkout.session.expired`, `charge.refunded`, `refund.created`, `refund.updated`, `refund.failed`.

## Lancer les tests (Docker, rien à installer)

```bash
docker compose -f docker-compose.tests.yml run --rm tests
```
