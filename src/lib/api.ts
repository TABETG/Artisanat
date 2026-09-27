import { db, DEMO_MODE } from './supabase';
import { DEMO_PRODUCTS } from './demo';
import { resizeImage } from './image';
import { Order, OrderStatus, Product, ProductInput } from '../types';

const PRODUCT_FIELDS =
  'id,name,description,category,price_cents,stock,width_cm,length_cm,material,origin,images,featured,active,created_at';

// ---------------- Boutique (public) ----------------

export async function listProducts(): Promise<Product[]> {
  if (DEMO_MODE) return DEMO_PRODUCTS;
  const { data, error } = await db()
    .from('products').select(PRODUCT_FIELDS).eq('active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Product[];
}

export async function getProduct(id: string): Promise<Product | null> {
  if (DEMO_MODE) return DEMO_PRODUCTS.find((p) => p.id === id) ?? null;
  const { data, error } = await db().from('products').select(PRODUCT_FIELDS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Product | null;
}

export async function startCheckout(items: { id: string; quantity: number }[]): Promise<string> {
  if (DEMO_MODE) throw new Error('Mode démonstration : le paiement sera actif une fois le site configuré.');
  const res = await fetch('/.netlify/functions/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.url) throw new Error(body.error ?? 'Le paiement n’a pas pu démarrer. Réessayez dans un instant.');
  return body.url as string;
}

// ---------------- Espace vendeur ----------------

export async function isCurrentUserAdmin(): Promise<boolean> {
  const { data: auth } = await db().auth.getUser();
  if (!auth.user) return false;
  const { data } = await db().from('admins').select('user_id').eq('user_id', auth.user.id).maybeSingle();
  return !!data;
}

export async function adminListProducts(): Promise<Product[]> {
  const { data, error } = await db().from('products').select(PRODUCT_FIELDS).order('created_at', { ascending: false });
  if (error) throw error;
  return data as Product[];
}

export async function saveProduct(input: ProductInput, id?: string): Promise<Product> {
  const payload = { ...input, updated_at: new Date().toISOString() };
  const query = id
    ? db().from('products').update(payload).eq('id', id)
    : db().from('products').insert(payload);
  const { data, error } = await query.select(PRODUCT_FIELDS).single();
  if (error) throw error;
  return data as Product;
}

export async function setProductActive(id: string, active: boolean): Promise<void> {
  const { error } = await db().from('products').update({ active, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function deleteProduct(product: Product): Promise<void> {
  const { error } = await db().from('products').delete().eq('id', product.id);
  if (error) throw error;
  const paths = product.images.map(storagePath).filter((p): p is string => !!p);
  if (paths.length) await db().storage.from('product-images').remove(paths);
}

export async function uploadProductImage(file: File): Promise<string> {
  const blob = await resizeImage(file);
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.jpg`;
  const { error } = await db().storage.from('product-images').upload(path, blob, {
    contentType: 'image/jpeg', cacheControl: '31536000',
  });
  if (error) throw error;
  return db().storage.from('product-images').getPublicUrl(path).data.publicUrl;
}

function storagePath(url: string): string | null {
  const marker = '/product-images/';
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}

export async function adminListOrders(): Promise<Order[]> {
  const { data, error } = await db()
    .from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).limit(500);
  if (error) throw error;
  return data as Order[];
}

export async function updateOrder(id: string, patch: { status?: OrderStatus; tracking_number?: string | null; note?: string | null }): Promise<void> {
  const { error } = await db().from('orders').update(patch).eq('id', id);
  if (error) throw error;
}
