// ============================================================
// Fonctionnalités activables — un seul endroit à modifier.
// Lu par le site ET par les fonctions serveur (sitemap, notifications).
// ============================================================
export const FEATURES = {
  /**
   * Créations sur mesure : page /sur-mesure, bouton « Demander un modèle sur mesure » des fiches,
   * filtre « Sur mesure possible », réassurance, liens du menu et du pied de page, demandes dans l'espace vendeur.
   * Désactivé pour le lancement : passer à true suffit pour tout réactiver (code, API et données conservés).
   */
  customOrdersEnabled: false,
} as const;
