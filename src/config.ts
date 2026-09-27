// ============================================================
// Informations de la boutique — à personnaliser ici uniquement
// ============================================================
export const SHOP = {
  name: 'Tamurt',
  tagline: 'Tapis berbères tissés à la main',
  since: 1982,
  email: 'contact@exemple.fr',
  phone: '+33 6 00 00 00 00',
  whatsapp: '33600000000', // numéro au format international, sans + ni espaces
  address: 'Adresse de l’atelier à compléter',
  legalName: 'Raison sociale à compléter',
  legalForm: 'Entreprise individuelle',
  siret: 'SIRET à compléter',
  vat: 'TVA non applicable, art. 293 B du CGI (à adapter)',
  host: 'Netlify, Inc. — 512 2nd Street, Suite 200, San Francisco, CA 94107, USA',
  instagram: '',
  facebook: '',
};

export const CATEGORIES = [
  { id: 'tapis', label: 'Tapis' },
  { id: 'coussins', label: 'Coussins' },
  { id: 'plaids', label: 'Plaids et couvertures' },
  { id: 'sacs', label: 'Sacs et accessoires' },
  { id: 'autres', label: 'Autres créations' },
] as const;

export function categoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}
