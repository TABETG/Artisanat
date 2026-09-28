import { Order, Product, Review, StockAlert } from '../types';

// Photos d'exemple (dossier public/exemples) — à remplacer par vos vraies photos
const img = (name: string) => [`/exemples/${name}-1.jpg`, `/exemples/${name}-2.jpg`];
const base = {
  material: 'Laine de mouton', active: true, reference: '', compare_at_price_cents: null as number | null,
  technique: 'Noué main', colors: [] as string[], pile_height_mm: null as number | null, weight_kg: null as number | null,
  care: 'Aspirateur sans brosse rotative. Tache : tamponner à l’eau froide, sans frotter.', made_to_order: false, low_stock_threshold: 2,
  badges: [] as string[], promo_ends_at: null as string | null, sales_count: 0,
  publish_at: null as string | null, views_count: 0, cart_adds_count: 0,
};

// Dates relatives à aujourd'hui pour que les badges « Nouveauté » et « Fin dans … jours » restent visibles en démonstration
const daysFromNow = (d: number) => new Date(Date.now() + d * 86400000).toISOString();

export const DEMO_PRODUCTS: Product[] = [
  { ...base, id: 'demo-1', views_count: 412, cart_adds_count: 18, reference: 'TAP-AZI-001', colors: ['ecru','rouge','jaune'], pile_height_mm: 15, weight_kg: 9, made_to_order: true, name: 'Tapis Azilal aux losanges', category: 'tapis', price_cents: 89000, stock: 1, width_cm: 160, length_cm: 240, origin: 'Moyen Atlas', featured: true, images: img('tapis-azilal'), created_at: daysFromNow(-3), badges: ['teinture-vegetale'],
    description: 'Fond de laine écrue, losanges tracés à main levée en rouge garance, safran et indigo. Nœuds serrés, franges d’origine.' },
  { ...base, id: 'demo-2', views_count: 655, cart_adds_count: 22, reference: 'TAP-BEN-002', colors: ['ecru','brun'], pile_height_mm: 30, weight_kg: 16, compare_at_price_cents: 145000, made_to_order: true, name: 'Tapis Beni Ouarain', category: 'tapis', price_cents: 124000, stock: 1, width_cm: 200, length_cm: 300, origin: 'Moyen Atlas', featured: true, images: img('tapis-beni-ouarain'), created_at: daysFromNow(-10), badges: ['meilleur-prix'], promo_ends_at: daysFromNow(4),
    description: 'Laine épaisse et moelleuse, lignes brunes naturelles non teintes. Un tapis qui se pose au sol comme une couverture.' },
  { ...base, id: 'demo-3', views_count: 301, cart_adds_count: 15, reference: 'KIL-ZAN-003', technique: 'Tissage plat (kilim)', colors: ['bleu','rouge','ecru','jaune'], pile_height_mm: 5, weight_kg: 3.5, name: 'Kilim Zanafi', category: 'tapis', price_cents: 42000, stock: 2, width_cm: 120, length_cm: 180, origin: 'Haut Atlas', featured: true, images: img('kilim-zanafi'), created_at: daysFromNow(-60), sales_count: 3,
    description: 'Tissage plat réversible, bandes indigo et triangles. Léger, il se déplace facilement d’une pièce à l’autre.' },
  { ...base, id: 'demo-4', views_count: 520, cart_adds_count: 41, reference: 'COU-LAI-004', technique: 'Tissé main', colors: ['rouge','jaune'], compare_at_price_cents: 8000, name: 'Coussin en laine tissée', category: 'coussins', price_cents: 6500, stock: 6, width_cm: 45, length_cm: 45, origin: 'Atelier', featured: true, images: img('coussin-laine'), created_at: daysFromNow(-90), sales_count: 7, badges: ['coup-de-coeur'],
    description: 'Face tissée à la main, dos en coton épais, fermeture discrète. Garnissage plume fourni.' },
  { ...base, id: 'demo-5', views_count: 188, cart_adds_count: 9, reference: 'PLA-HAN-005', technique: 'Tissé main', colors: ['noir','rouge','jaune','ecru'], weight_kg: 2, name: 'Plaid Hanbel rayé', category: 'plaids', price_cents: 18000, stock: 3, width_cm: 130, length_cm: 190, origin: 'Atelier', featured: false, images: img('plaid-hanbel'), created_at: daysFromNow(-120), sales_count: 2,
    description: 'Couverture de laine à rayures fines, pour le canapé ou le pied de lit.' },
  { ...base, id: 'demo-6', views_count: 240, cart_adds_count: 7, reference: 'TAP-BOU-006', colors: ['multicolore','rose'], pile_height_mm: 20, name: 'Petit tapis Boucherouite', category: 'tapis', price_cents: 29000, stock: 0, width_cm: 90, length_cm: 150, origin: 'Atelier', featured: false, material: 'Laine et coton recyclé', images: img('tapis-boucherouite'), created_at: daysFromNow(-45), sales_count: 1, badges: ['edition-limitee'],
    description: 'Tissé à partir de chutes de laine et de tissus colorés. Chaque boucherouite est une explosion de couleurs unique.' },
  { ...base, id: 'demo-7', name: 'Tapis Talsint (collection d’hiver)', category: 'tapis', price_cents: 98000, stock: 1, width_cm: 170, length_cm: 250,
    origin: 'Haut Atlas', featured: true, images: img('tapis-azilal').reverse(), created_at: daysFromNow(-1), publish_at: daysFromNow(5), reference: 'TAP-TAL-007',
    colors: ['rouge', 'noir'], description: 'Pièce de la collection d’hiver, mise en ligne programmée : invisible pour les clients jusqu’à la date choisie.' },
];

export const DEMO_ORDERS: Order[] = [
  {
    id: 'demo-cmd-1', stripe_session_id: 'demo_1', stripe_payment_id: null, invoice_number: 4,
    email: 'claire.martin@exemple.fr', customer_name: 'Claire Martin', phone: '+33 6 12 34 56 78',
    shipping_name: 'Claire Martin',
    shipping_address: { line1: '12 rue des Lilas', postal_code: '69003', city: 'Lyon', country: 'FR' },
    subtotal_cents: 29000, shipping_cents: 1500, total_cents: 30500, status: 'paid',
    tracking_number: null, tracking_carrier: null, shipped_email_sent_at: null, note: null, created_at: '2026-09-26T15:42:00Z',
    customer_message: 'C’est un cadeau pour ma mère, merci de ne pas mettre la facture dans le colis.',
    shipping_method: 'Livraison suivie', discount_cents: 0, promo_code: null,
    order_items: [{ id: 1, product_id: 'demo-6', name: 'Petit tapis Boucherouite', unit_price_cents: 29000, quantity: 1 }],
  },
  {
    id: 'demo-cmd-2', stripe_session_id: 'demo_2', stripe_payment_id: null, invoice_number: 3,
    email: 'thomas.dubois@exemple.fr', customer_name: 'Thomas Dubois', phone: '+32 470 12 34 56',
    shipping_name: 'Thomas Dubois',
    shipping_address: { line1: 'Avenue Louise 88', postal_code: '1050', city: 'Bruxelles', country: 'BE' },
    subtotal_cents: 13000, shipping_cents: 1500, total_cents: 14500, status: 'shipped',
    tracking_number: '6A12345678901', tracking_carrier: 'colissimo', shipped_email_sent_at: '2026-09-23T10:00:00Z', note: null, created_at: '2026-09-22T09:10:00Z',
    order_items: [{ id: 2, product_id: 'demo-4', name: 'Coussin en laine tissée', unit_price_cents: 6500, quantity: 2 }],
  },
];

export const DEMO_EXTRA_ORDERS: Order[] = [
  { id: 'demo-cmd-3', stripe_session_id: 'demo_3', stripe_payment_id: null, invoice_number: 2, email: 'nadia.r@exemple.fr', customer_name: 'Nadia Rahmani', phone: null,
    shipping_name: 'Nadia Rahmani', shipping_address: { line1: '5 quai Saint-Pierre', postal_code: '33000', city: 'Bordeaux', country: 'FR' },
    subtotal_cents: 42000, shipping_cents: 0, total_cents: 42000, status: 'delivered', tracking_number: '6A99887766554', tracking_carrier: 'colissimo',
    shipped_email_sent_at: '2026-09-06T10:00:00Z', note: null, created_at: '2026-09-05T11:20:00Z',
    order_items: [{ id: 3, product_id: 'demo-3', name: 'Kilim Zanafi', unit_price_cents: 42000, quantity: 1 }] },
  { id: 'demo-cmd-4', stripe_session_id: 'demo_4', stripe_payment_id: null, invoice_number: 1, email: 'julien.p@exemple.fr', customer_name: 'Julien Perrin', phone: null,
    shipping_name: 'Julien Perrin', shipping_address: { line1: '18 rue Nationale', postal_code: '59000', city: 'Lille', country: 'FR' },
    subtotal_cents: 18000, shipping_cents: 1500, total_cents: 19500, status: 'delivered', tracking_number: null, tracking_carrier: null,
    shipped_email_sent_at: null, note: null, created_at: '2026-08-21T16:05:00Z',
    order_items: [{ id: 4, product_id: 'demo-5', name: 'Plaid Hanbel rayé', unit_price_cents: 18000, quantity: 1 }] },
];

export const DEMO_ALERTS: StockAlert[] = [
  { id: 1, product_id: 'demo-6', email: 'sophie.l@exemple.fr', notified: false, created_at: '2026-09-26T18:00:00Z' },
  { id: 2, product_id: 'demo-6', email: 'karim.b@exemple.fr', notified: false, created_at: '2026-09-27T08:30:00Z' },
];

export const DEMO_ADMIN = { email: 'demo@artisanat.fr', password: 'demo' };

export const DEMO_REVIEWS: Review[] = [
  { id: 1, product_id: 'demo-3', author_name: 'Nadia R.', email: 'nadia.r@exemple.fr', rating: 5, approved: true, verified: true, created_at: '2026-09-12T10:00:00Z',
    comment: 'Magnifique kilim, les couleurs sont encore plus belles qu’en photo. Colis très soigné, reçu en 4 jours.' },
  { id: 2, product_id: 'demo-4', author_name: 'Thomas D.', email: 'thomas.dubois@exemple.fr', rating: 4, approved: true, verified: true, created_at: '2026-09-25T10:00:00Z',
    comment: 'Très beau coussin, bien épais. Un peu plus petit que je l’imaginais mais conforme aux dimensions.' },
  { id: 3, product_id: 'demo-5', author_name: 'Julien P.', email: 'julien.p@exemple.fr', rating: 5, approved: true, verified: true, created_at: '2026-08-30T10:00:00Z',
    comment: 'Laine douce et chaude, finitions impeccables.' },
  { id: 4, product_id: 'demo-1', author_name: 'Marie', email: 'marie@exemple.fr', rating: 5, approved: false, verified: false, created_at: '2026-09-27T20:00:00Z',
    comment: 'Vu chez une amie, je craque ! Est-ce qu’il existe en 200 × 300 ?' },
];
