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
}

export type ProductInput = Omit<Product, 'id' | 'created_at'>;

export type OrderStatus = 'paid' | 'check_stock' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  id: number;
  product_id: string | null;
  name: string;
  unit_price_cents: number;
  quantity: number;
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
};

export interface StockAlert {
  id: number;
  product_id: string;
  email: string;
  notified: boolean;
  created_at: string;
}

export interface AdminCounts {
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
  number: string;
  created_at: string;
  status: OrderStatus;
  total_cents: number;
  items: { name: string; quantity: number }[];
  tracking_number: string | null;
  tracking_url: string | null;
  carrier: string | null;
}
