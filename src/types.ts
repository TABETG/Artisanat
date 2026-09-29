import type { ShippingMethod, ShippingZone } from './shipping';

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price_cents: number;
  stock: number;
  width_cm: number | null;
  length_cm: number | null;
  material: string;
  origin: string;
  images: string[];
  featured: boolean;
  active: boolean;
  created_at: string;
  // version 3
  reference: string;
  compare_at_price_cents: number | null;   // ancien prix (affiché barré)
  technique: string;
  colors: string[];
  pile_height_mm: number | null;
  weight_kg: number | null;
  care: string;
  made_to_order: boolean;                  // « sur mesure possible »
  low_stock_threshold: number;
  // version 6
  badges: string[];                        // badges choisis par le vendeur
  promo_ends_at: string | null;            // fin de la promotion (le prix d'origine revient automatiquement)
  sales_count: number;                     // nombre d'exemplaires vendus (mis à jour après chaque paiement)
  // version 10
  publish_at: string | null;               // mise en ligne programmée
  views_count: number;
  cart_adds_count: number;
  // version 14 : place de marché
  seller_id?: string | null;               // null = pièce de l'atelier
  moderation?: 'approved' | 'pending' | 'rejected';
  moderation_note?: string | null;
  // version 15 : bijoux et cosmétiques
  metal?: string;                // bijou : argent, laiton, métal doré…
  stones?: string;               // bijou : corail, ambre, émail…
  jewelry_size?: string;         // bijou : « Longueur 45 cm », « Taille ajustable »
  nickel_free?: boolean;         // bijou : conforme à la limite de libération du nickel
  net_content?: string;          // cosmétique : « 5 g », « 10 ml »
  ingredients?: string;          // cosmétique : liste INCI (obligatoire)
  usage?: string;                // cosmétique : mode d'emploi
  warnings?: string;             // cosmétique : précautions d'emploi
  pao_months?: number | null;    // cosmétique : durée d'utilisation après ouverture
  cpnp_ref?: string;             // cosmétique : référence de notification européenne
}

export type ProductInput = Omit<Product, 'id' | 'created_at'>;

export type OrderStatus = 'paid' | 'check_stock' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

export interface OrderItem {
  id: number;
  product_id: string | null;
  name: string;
  unit_price_cents: number;
  quantity: number;
  seller_id?: string | null;
}

export interface Address {
  line1?: string | null;
  line2?: string | null;
  postal_code?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}

export interface Order {
  id: string;
  stripe_session_id: string;
  stripe_payment_id: string | null;
  email: string | null;
  customer_name: string | null;
  phone: string | null;
  shipping_name: string | null;
  shipping_address: Address | null;
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  status: OrderStatus;
  tracking_number: string | null;
  tracking_carrier: string | null;
  shipped_email_sent_at: string | null;
  customer_message?: string | null;
  shipping_method?: string | null;
  discount_cents?: number;
  promo_code?: string | null;
  refunded_cents?: number;
  invoice_number?: number | null;
  note: string | null;
  created_at: string;
  order_items?: OrderItem[];
}

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: string }> = {
  paid: { label: 'Payée — à préparer', tone: 'bg-safran/25 text-henne' },
  check_stock: { label: 'Stock à vérifier', tone: 'bg-garance/15 text-garance' },
  shipped: { label: 'Expédiée', tone: 'bg-nuit/10 text-nuit' },
  delivered: { label: 'Livrée', tone: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Annulée', tone: 'bg-stone-200 text-stone-600' },
  refunded: { label: 'Remboursée', tone: 'bg-violet-100 text-violet-800' },
};

export interface StockAlert {
  id: number;
  product_id: string;
  email: string;
  notified: boolean;
  created_at: string;
}

export interface Subscriber { id: number; email: string; created_at: string }

export type CustomStatus = 'new' | 'quoted' | 'accepted' | 'done' | 'declined';

export const CUSTOM_STATUS: Record<CustomStatus, { label: string; tone: string }> = {
  new: { label: 'Nouvelle', tone: 'bg-garance/10 text-garance' },
  quoted: { label: 'Devis envoyé', tone: 'bg-safran/25 text-henne' },
  accepted: { label: 'Acceptée — en fabrication', tone: 'bg-nuit/10 text-nuit' },
  done: { label: 'Terminée', tone: 'bg-emerald-100 text-emerald-800' },
  declined: { label: 'Refusée', tone: 'bg-stone-200 text-stone-600' },
};

export interface CustomRequest {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  product_id: string | null;
  room: string | null;
  width_cm: number | null;
  length_cm: number | null;
  colors: string | null;
  budget: string | null;
  message: string;
  status: CustomStatus;
  note: string | null;
  created_at: string;
}

export type CustomRequestInput = Omit<CustomRequest, 'id' | 'status' | 'note' | 'created_at'>;

export interface GiftCard {
  id: string;
  code: string;
  amount_cents: number;
  buyer_name: string | null;
  buyer_email: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
  message: string | null;
  expires_at: string | null;
  created_at: string;
  used?: boolean;
}

export interface GiftCardOrder {
  amount_cents: number;
  buyer_name: string;
  recipient_name: string;
  recipient_email: string;
  message: string;
}

export type ReturnStatus = 'new' | 'accepted' | 'received' | 'refunded' | 'declined';

export const RETURN_STATUS: Record<ReturnStatus, { label: string; tone: string }> = {
  new: { label: 'Nouvelle demande', tone: 'bg-garance/10 text-garance' },
  accepted: { label: 'Acceptée — en attente du colis', tone: 'bg-safran/25 text-henne' },
  received: { label: 'Colis reçu', tone: 'bg-nuit/10 text-nuit' },
  refunded: { label: 'Remboursé', tone: 'bg-emerald-100 text-emerald-800' },
  declined: { label: 'Refusée', tone: 'bg-stone-200 text-stone-600' },
};

export const RETURN_REASONS = [
  'Ne me convient pas (couleurs, taille…)',
  'Article différent de la photo',
  'Article abîmé à la réception',
  'Erreur dans la commande',
  'Autre raison',
];

export interface ReturnRequest {
  id: number;
  order_id: string;
  email: string;
  items: { name: string; quantity: number }[];
  reason: string;
  comment: string;
  status: ReturnStatus;
  note: string | null;
  created_at: string;
}

export interface Campaign { id: number; subject: string; sent_count: number; created_at: string }

export interface ContactMessage { id: number; name: string; email: string; subject: string; message: string; handled: boolean; created_at: string }

export interface AdminCounts {
  sellersPending: number;
  productsToReview: number;
  messagesNew: number;
  returnsNew: number;
  customRequestsNew: number;
  reviewsPending: number;
  outOfStock: number;
  alertsPending: number;
  ordersToPrepare: number;
}

export interface NotifyResult {
  /** email : envoyé automatiquement ; manual : pas de service d'email configuré, à faire soi-même */
  mode: 'email' | 'manual';
  sent: number;
  emails: string[];
}

export interface ShopSettings {
  announcement: string;          // bandeau en haut du site (ex. « Soldes : −20 % »)
  announcement_active: boolean;
  shipping_cents: number;
  free_shipping_from_cents: number; // 0 = jamais offerte
  shipping_min_days: number;
  shipping_max_days: number;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  instagram: string;
  facebook: string;
  // version 5 : contenus et catégories modifiables
  categories: { id: string; label: string; kind?: 'textile' | 'bijou' | 'cosmetique' | 'autre' }[];
  hero_title: string;
  hero_subtitle: string;
  story: string;                    // page « Notre histoire » (paragraphes séparés par une ligne vide)
  gift_message_enabled: boolean;    // champ « message / précisions » au paiement
  new_days: number;                 // durée du badge « Nouveauté »
  // version 7 : modes de livraison et paiement en plusieurs fois
  express_enabled: boolean;
  express_cents: number;
  express_min_days: number;
  express_max_days: number;
  pickup_enabled: boolean;          // retrait gratuit à l'atelier
  pickup_details: string;           // adresse / horaires du retrait
  installments_enabled: boolean;    // affichage « payez en 3 fois » (Klarna activé dans Stripe)
  installments_min_cents: number;
  announcement_ends_at: string | null;  // compte à rebours dans le bandeau (vente flash)
  // version 12 : zones et modes de livraison
  shipping_zones: ShippingZone[];
  shipping_methods: ShippingMethod[];
  preparation_days: number;             // délai de préparation avant expédition
  // version 14 : place de marché
  marketplace_enabled: boolean;
  marketplace_commission_percent: number;
  mediator: string;                     // médiateur de la consommation (obligatoire en France)
}

export type SellerStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface Seller {
  id: string;
  user_id: string | null;
  shop_name: string;
  slug: string;
  craft: string;
  bio: string;
  city: string;
  country: string;
  legal_status: 'particulier' | 'professionnel';
  siret: string | null;
  avatar_url: string | null;
  status: SellerStatus;
  commission_percent: number | null;
  payouts_enabled: boolean;
  shipping_france_cents: number;
  shipping_europe_cents: number | null;
  free_shipping_from_cents: number | null;
  prep_days: number;
  return_policy: string;
  created_at: string;
}

export interface SellerPrivate { seller_id: string; email: string; phone: string | null; application_message: string | null; stripe_account_id: string | null; rejection_reason: string | null }

export interface SellerOrder {
  id: string;
  created_at: string;
  shipping_name: string | null;
  shipping_address: Address | null;
  phone: string | null;
  customer_message: string | null;
  order_status: OrderStatus;
  status: 'to_ship' | 'shipped' | 'delivered';
  carrier: string | null;
  tracking_number: string | null;
  shipped_at: string | null;
  shipping_cents: number;
  items: { name: string; quantity: number; unit_price_cents: number }[];
}

export interface SellerTransfer { id: number; order_id: string; seller_id: string; sales_cents: number; shipping_cents: number; commission_cents: number; amount_cents: number; stripe_transfer_id: string | null; created_at: string }

export const SELLER_STATUS: Record<SellerStatus, { label: string; tone: string }> = {
  pending: { label: 'Candidature à examiner', tone: 'bg-safran/25 text-henne' },
  approved: { label: 'Validé', tone: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: 'Refusé', tone: 'bg-stone-200 text-stone-600' },
  suspended: { label: 'Suspendu', tone: 'bg-garance/10 text-garance' },
};

export interface PromoCode {
  id: string;
  code: string;
  percent_off: number | null;
  amount_off_cents: number | null;
  active: boolean;
  times_redeemed: number;
  max_redemptions: number | null;
  expires_at: string | null;          // ISO
  minimum_amount_cents: number | null;
  created_at: string;
}

export interface PromoCodeInput {
  code: string;
  kind: 'percent' | 'amount';
  value: number;                      // pourcentage ou centimes
  expires_at: string | null;
  max_redemptions: number | null;
  minimum_amount_cents: number | null;
}

export interface Review {
  id: number;
  product_id: string;
  author_name: string;
  email?: string;           // visible uniquement dans l'espace vendeur
  rating: number;
  comment: string;
  approved: boolean;
  verified: boolean;
  created_at: string;
}

export interface TrackedOrder {
  id?: string;
  returnable?: boolean;
  number: string;
  created_at: string;
  status: OrderStatus;
  total_cents: number;
  items: { name: string; quantity: number }[];
  tracking_number: string | null;
  tracking_url: string | null;
  carrier: string | null;
}
