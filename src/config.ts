// ============================================================
// Informations de la boutique — à personnaliser ici uniquement
// ============================================================
export const SHOP = {
  name: 'Artisanat',
  tagline: 'Bijoux, accessoires et décoration faits main en France',
  since: 1982,
  // Coordonnées affichées aux clients : modifiables sans code dans Espace vendeur → Réglages → Coordonnées
  email: 'contact@exemple.fr',
  phone: '',
  whatsapp: '', // numéro au format international, sans + ni espaces
  address: '10 avenue du Général Leclerc, 77680 Roissy-en-Brie, France',
  // Identité légale du vendeur (mentions légales, CGV, factures)
  legalName: 'Djalal TABET',
  legalForm: 'Entrepreneur individuel (EI), micro-entreprise',
  siret: '952 798 098 00051',
  register: 'Immatriculé au Registre national des entreprises (RNE)',
  vat: 'TVA non applicable, article 293 B du Code général des impôts',
  publicationDirector: 'Djalal TABET',
  host: 'Netlify, Inc., 101 2nd Street, San Francisco, CA 94105, États-Unis (www.netlify.com)',
  dataHost: 'Supabase Pte. Ltd. (Singapour) ; données stockées dans l’Union européenne (Francfort, Allemagne)',
  instagram: '',
  facebook: '',
};

/**
 * Type de produit d'une catégorie : il décide des champs à remplir et des informations affichées.
 * textile = tapis, coussins, plaids ; bijou = bijoux fantaisie ou en argent ; cosmetique = khôl, rouge à lèvres…
 */
export type ProductKind = 'textile' | 'bijou' | 'cosmetique' | 'autre';

export const KIND_LABELS: Record<ProductKind, string> = {
  textile: 'Textile (tapis, coussins, plaids…)',
  bijou: 'Bijoux',
  cosmetique: 'Beauté et cosmétiques',
  autre: 'Autre objet',
};

export const CATEGORIES: { id: string; label: string; kind: ProductKind }[] = [
  { id: 'tapis', label: 'Tapis', kind: 'textile' },
  { id: 'coussins', label: 'Coussins', kind: 'textile' },
  { id: 'plaids', label: 'Plaids et couvertures', kind: 'textile' },
  { id: 'bijoux', label: 'Bijoux', kind: 'bijou' },
  { id: 'sacs', label: 'Sacs et accessoires', kind: 'autre' },
  { id: 'autres', label: 'Autres créations', kind: 'autre' },
];

/** Type d'une catégorie inconnue ou ancienne (réglages enregistrés avant l'ajout des types). */
export function guessKind(id: string): ProductKind {
  if (['tapis', 'coussins', 'plaids', 'kilims'].includes(id)) return 'textile';
  if (/bijou|collier|bracelet|bague/.test(id)) return 'bijou';
  if (/beaute|cosmet|khol|maquillage/.test(id)) return 'cosmetique';
  return 'autre';
}

export function categoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export const TECHNIQUES_BY_KIND: Record<ProductKind, string[]> = {
  textile: ['Noué main', 'Tissage plat (kilim)', 'Brodé main', 'Tissé main', 'Crocheté main'],
  bijou: ['Argent ciselé', 'Émail cloisonné', 'Perles enfilées main', 'Métal martelé', 'Assemblé main'],
  cosmetique: ['Préparation artisanale', 'Broyé et tamisé main', 'Macération de plantes'],
  autre: ['Fait main', 'Tourné main', 'Sculpté main', 'Cousu main'],
};
export const TECHNIQUES = [...new Set(Object.values(TECHNIQUES_BY_KIND).flat()), 'Autre'];

/** Couleurs proposées dans l'espace vendeur (et filtre de la boutique) */
export const COLORS: { id: string; label: string; hex: string }[] = [
  { id: 'ecru', label: 'Écru', hex: '#EDE3CF' },
  { id: 'blanc', label: 'Blanc', hex: '#FAFAF7' },
  { id: 'noir', label: 'Noir', hex: '#262220' },
  { id: 'brun', label: 'Brun', hex: '#6B4A33' },
  { id: 'gris', label: 'Gris', hex: '#9C978F' },
  { id: 'rouge', label: 'Rouge', hex: '#A3302A' },
  { id: 'orange', label: 'Orange', hex: '#CE6E32' },
  { id: 'jaune', label: 'Jaune safran', hex: '#D4A03A' },
  { id: 'rose', label: 'Rose', hex: '#C86E78' },
  { id: 'bleu', label: 'Bleu indigo', hex: '#22305A' },
  { id: 'vert', label: 'Vert', hex: '#4F7A55' },
  { id: 'multicolore', label: 'Multicolore', hex: 'conic-gradient(#A3302A,#D4A03A,#4F7A55,#22305A,#C86E78,#A3302A)' },
];

export function colorInfo(id: string) {
  return COLORS.find((c) => c.id === id);
}

export const CARRIERS: { id: string; label: string; url: (code: string) => string }[] = [
  { id: 'colissimo', label: 'Colissimo / La Poste', url: (c) => `https://www.laposte.fr/outils/suivre-vos-envois?code=${encodeURIComponent(c)}` },
  { id: 'chronopost', label: 'Chronopost', url: (c) => `https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=${encodeURIComponent(c)}` },
  { id: 'mondialrelay', label: 'Mondial Relay', url: (c) => `https://www.mondialrelay.fr/suivi-de-colis/?NumeroExpedition=${encodeURIComponent(c)}` },
  { id: 'dhl', label: 'DHL', url: (c) => `https://www.dhl.com/fr-fr/home/suivi.html?tracking-id=${encodeURIComponent(c)}` },
  { id: 'ups', label: 'UPS', url: (c) => `https://www.ups.com/track?tracknum=${encodeURIComponent(c)}&loc=fr_FR` },
  { id: 'autre', label: 'Autre transporteur', url: () => '' },
];

export function trackingUrl(carrier: string | null, code: string | null): string | null {
  if (!code) return null;
  const c = CARRIERS.find((x) => x.id === (carrier ?? 'colissimo'));
  return c?.url(code) || null;
}
