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
