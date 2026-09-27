import { Product } from '../types';

const base = { material: 'Laine de mouton', active: true, created_at: '2026-01-01T00:00:00Z', images: [] as string[] };

export const DEMO_PRODUCTS: Product[] = [
  { ...base, id: 'demo-1', name: 'Tapis Azilal aux losanges', category: 'tapis', price_cents: 89000, stock: 1, width_cm: 160, length_cm: 240, origin: 'Moyen Atlas', featured: true,
    description: 'Fond de laine écrue, losanges tracés à main levée en rouge garance et safran. Nœuds serrés, franges d’origine.' },
  { ...base, id: 'demo-2', name: 'Tapis Beni Ouarain', category: 'tapis', price_cents: 124000, stock: 1, width_cm: 200, length_cm: 300, origin: 'Moyen Atlas', featured: true,
    description: 'Laine épaisse et moelleuse, lignes brunes naturelles non teintes. Un tapis qui se pose au sol comme une couverture.' },
  { ...base, id: 'demo-3', name: 'Kilim Zanafi', category: 'tapis', price_cents: 42000, stock: 1, width_cm: 120, length_cm: 180, origin: 'Haut Atlas', featured: true,
    description: 'Tissage plat réversible, bandes indigo et motifs brodés. Léger, il se déplace facilement d’une pièce à l’autre.' },
  { ...base, id: 'demo-4', name: 'Coussin en laine tissée', category: 'coussins', price_cents: 6500, stock: 6, width_cm: 45, length_cm: 45, origin: 'Atelier', featured: true,
    description: 'Face tissée à la main, dos en coton épais, fermeture discrète. Garnissage plume fourni.' },
  { ...base, id: 'demo-5', name: 'Plaid Hanbel rayé', category: 'plaids', price_cents: 18000, stock: 3, width_cm: 130, length_cm: 190, origin: 'Atelier', featured: false,
    description: 'Couverture de laine à rayures fines, pour le canapé ou le pied de lit.' },
  { ...base, id: 'demo-6', name: 'Petit tapis Boucherouite', category: 'tapis', price_cents: 29000, stock: 0, width_cm: 90, length_cm: 150, origin: 'Atelier', featured: false, material: 'Laine et coton recyclé',
    description: 'Tissé à partir de chutes de laine et de tissus colorés. Pièce vendue, visible pour inspiration.' },
];
