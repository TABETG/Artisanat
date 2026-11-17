# Boutique Artisanat

Boutique en ligne de tapis berbères et créations en laine, avec espace vendeur.

- Site : React + Vite + Tailwind
- Données, photos, connexion : Supabase
- Paiement : Stripe Checkout (Visa, Mastercard, CB, Apple Pay, Google Pay)
- Hébergement : Netlify (site + 2 fonctions serveur)

Démarrage local (mode démonstration) : `docker compose up` → http://localhost:5173

Mise en ligne : **CHECKLIST-LANCEMENT.md** (ce qu’il reste à faire), puis **GUIDE-MISE-EN-LIGNE.md** (pas à pas).

## Structure
```
src/config.ts            infos de la boutique (nom, contact, SIRET)
src/shipping.ts          frais et pays de livraison
src/pages/               pages publiques
src/pages/admin/         espace vendeur (/admin)
netlify/functions/       create-checkout (paiement), stripe-webhook (commande), admin-notify (emails)
netlify/shared/          gabarit et envoi des emails (Resend)
supabase/schema.sql      tables, sécurité, stockage des photos
```

## Sécurité
- Les prix sont relus côté serveur : le navigateur ne peut pas modifier un montant.
- Les commandes ne sont créées que par le webhook signé de Stripe.
- Row Level Security : seul un compte présent dans `admins` peut modifier produits et commandes.
- Aucune donnée de carte ne transite par le site.
