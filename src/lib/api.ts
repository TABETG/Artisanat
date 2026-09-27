// Toutes les lectures/écritures passent par ce fichier.
// En mode démonstration → base simulée dans le navigateur ; sinon → Supabase.
import { db, DEMO_MODE } from './supabase';
import { demoAuth, demoDB, demoSave, wait } from './demoStore';
import { DEMO_ADMIN } from './demo';
import { imageToDataUrl, resizeImage } from './image';
import { AdminCounts, Order, OrderStatus, Product, ProductInput, StockAlert } from '../types';
import { shippingFor } from '../shipping';

const PRODUCT_FIELDS =
  'id,name,description,category,price_cents,stock,width_cm,length_cm,material,origin,images,featured,active,created_at';

const byNewest = <T extends { created_at: string }>(a: T, b: T) => b.created_at.localeCompare(a.created_at);

// =============== Boutique (public) ===============

export async function listProducts(): Promise<Product[]> {
  if (DEMO_MODE) { await wait(150); return demoDB().products.filter((p) => p.active).sort(byNewest); }
  const { data, error } = await db()
    .from('products').select(PRODUCT_FIELDS).eq('active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Product[];
}

export async function getProduct(id: string): Promise<Product | null> {
  if (DEMO_MODE) { await wait(100); return demoDB().products.find((p) => p.id === id && p.active) ?? null; }
  const { data, error } = await db().from('products').select(PRODUCT_FIELDS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Product | null;
}

export async function startCheckout(items: { id: string; quantity: number }[]): Promise<string> {
  if (DEMO_MODE) return demoCheckout(items);
  const res = await fetch('/.netlify/functions/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.url) throw new Error(body.error ?? 'Le paiement n’a pas pu démarrer. Réessayez dans un instant.');
  return body.url as string;
}

/** Démo : simule un paiement réussi (commande créée + stock diminué). */
async function demoCheckout(items: { id: string; quantity: number }[]): Promise<string> {
  await wait(600);
  const data = demoDB();
  for (const it of items) {
    const p = data.products.find((x) => x.id === it.id);
    if (!p || !p.active) throw new Error('Un article de votre panier n’est plus en vente. Retirez-le pour continuer.');
    if (p.stock < it.quantity) throw new Error(p.stock === 0 ? `« ${p.name} » vient d’être vendu. Retirez-le du panier.` : `« ${p.name} » : il n’en reste que ${p.stock}.`);
  }
  const lines = items.map((it, i) => {
    const p = data.products.find((x) => x.id === it.id)!;
    p.stock -= it.quantity;
    return { id: Date.now() + i, product_id: p.id, name: p.name, unit_price_cents: p.price_cents, quantity: it.quantity };
  });
  const subtotal = lines.reduce((n, l) => n + l.unit_price_cents * l.quantity, 0);
  const shipping = shippingFor(subtotal);
  const id = `demo-${Date.now()}`;
  data.orders.unshift({
    id, stripe_session_id: id, stripe_payment_id: null,
    email: 'client.demo@exemple.fr', customer_name: 'Client de démonstration', phone: '+33 6 00 00 00 00',
    shipping_name: 'Client de démonstration',
    shipping_address: { line1: '1 place de la République', postal_code: '75003', city: 'Paris', country: 'FR' },
    subtotal_cents: subtotal, shipping_cents: shipping, total_cents: subtotal + shipping,
    status: 'paid', tracking_number: null, note: null, created_at: new Date().toISOString(), order_items: lines,
  });
  demoSave();
  return `/merci?session_id=${id}`;
}

/** Un client demande à être prévenu quand un produit revient en stock. */
export async function createStockAlert(productId: string, email: string): Promise<void> {
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) throw new Error('Adresse email invalide.');
  if (DEMO_MODE) {
    await wait();
    const data = demoDB();
    if (!data.alerts.some((a) => a.product_id === productId && a.email === clean && !a.notified)) {
      data.alerts.push({ id: Date.now(), product_id: productId, email: clean, notified: false, created_at: new Date().toISOString() });
      demoSave();
    }
    return;
  }
  const { error } = await db().from('stock_alerts').insert({ product_id: productId, email: clean });
  if (error && error.code !== '23505') throw new Error('Votre demande n’a pas pu être enregistrée. Réessayez.');
}

// =============== Connexion vendeur ===============

export type AdminStatus = 'anonymous' | 'forbidden' | 'ok';

export async function getAdminStatus(): Promise<AdminStatus> {
  if (DEMO_MODE) return demoAuth.isLoggedIn() ? 'ok' : 'anonymous';
  const { data: session } = await db().auth.getSession();
  if (!session.session) return 'anonymous';
  const { data } = await db().from('admins').select('user_id').eq('user_id', session.session.user.id).maybeSingle();
  return data ? 'ok' : 'forbidden';
}

export async function signIn(email: string, password: string): Promise<void> {
  if (DEMO_MODE) {
    await wait();
    if (email.trim().toLowerCase() !== DEMO_ADMIN.email || password !== DEMO_ADMIN.password) {
      throw new Error('Email ou mot de passe incorrect.');
    }
    demoAuth.set(true);
    return;
  }
  const { error } = await db().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error('Email ou mot de passe incorrect.');
}

export async function signOut(): Promise<void> {
  if (DEMO_MODE) { demoAuth.set(false); return; }
  await db().auth.signOut();
}

export function onSignedOut(callback: () => void): () => void {
  if (DEMO_MODE) {
    const handler = () => { if (!demoAuth.isLoggedIn()) callback(); };
    window.addEventListener('tamurt-demo-auth', handler);
    return () => window.removeEventListener('tamurt-demo-auth', handler);
  }
  const { data } = db().auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') callback(); });
  return () => data.subscription.unsubscribe();
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (DEMO_MODE) return;
  await db().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/admin/nouveau-mot-de-passe` });
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await db().auth.updateUser({ password });
  if (error) throw new Error('Le lien a expiré. Redemandez un email depuis la page de connexion.');
}

// =============== Espace vendeur : produits ===============

export async function adminListProducts(): Promise<Product[]> {
  if (DEMO_MODE) { await wait(150); return [...demoDB().products].sort(byNewest); }
  const { data, error } = await db().from('products').select(PRODUCT_FIELDS).order('created_at', { ascending: false });
  if (error) throw error;
  return data as Product[];
}

export async function saveProduct(input: ProductInput, id?: string): Promise<Product> {
  if (DEMO_MODE) {
    await wait();
    const data = demoDB();
    let product: Product;
    if (id) {
      const i = data.products.findIndex((p) => p.id === id);
      product = { ...data.products[i], ...input };
      data.products[i] = product;
    } else {
      product = { ...input, id: `demo-${Date.now()}`, created_at: new Date().toISOString() };
      data.products.push(product);
    }
    demoSave();
    return product;
  }
  const payload = { ...input, updated_at: new Date().toISOString() };
  const query = id
    ? db().from('products').update(payload).eq('id', id)
    : db().from('products').insert(payload);
  const { data, error } = await query.select(PRODUCT_FIELDS).single();
  if (error) throw error;
  return data as Product;
}

export async function setProductActive(id: string, active: boolean): Promise<void> {
  if (DEMO_MODE) { const p = demoDB().products.find((x) => x.id === id); if (p) p.active = active; demoSave(); return; }
  const { error } = await db().from('products').update({ active, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function setProductStock(id: string, stock: number): Promise<void> {
  if (DEMO_MODE) { const p = demoDB().products.find((x) => x.id === id); if (p) p.stock = stock; demoSave(); return; }
  const { error } = await db().from('products').update({ stock, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function deleteProduct(product: Product): Promise<void> {
  if (DEMO_MODE) {
    const data = demoDB();
    data.products = data.products.filter((p) => p.id !== product.id);
    data.alerts = data.alerts.filter((a) => a.product_id !== product.id);
    demoSave();
    return;
  }
  const { error } = await db().from('products').delete().eq('id', product.id);
  if (error) throw error;
  const paths = product.images.map(storagePath).filter((p): p is string => !!p);
  if (paths.length) await db().storage.from('product-images').remove(paths);
}

export async function uploadProductImage(file: File): Promise<string> {
  if (DEMO_MODE) return imageToDataUrl(file);
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

// =============== Espace vendeur : commandes ===============

export async function adminListOrders(): Promise<Order[]> {
  if (DEMO_MODE) { await wait(150); return [...demoDB().orders].sort(byNewest); }
  const { data, error } = await db()
    .from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).limit(500);
  if (error) throw error;
  return data as Order[];
}

export async function updateOrder(id: string, patch: { status?: OrderStatus; tracking_number?: string | null; note?: string | null }): Promise<void> {
  if (DEMO_MODE) {
    await wait();
    const o = demoDB().orders.find((x) => x.id === id);
    if (o) Object.assign(o, patch);
    demoSave();
    return;
  }
  const { error } = await db().from('orders').update(patch).eq('id', id);
  if (error) throw error;
}

// =============== Espace vendeur : alertes ===============

export async function adminListStockAlerts(): Promise<StockAlert[]> {
  if (DEMO_MODE) { await wait(100); return [...demoDB().alerts].sort(byNewest); }
  const { data, error } = await db().from('stock_alerts').select('*').order('created_at', { ascending: false }).limit(1000);
  if (error) throw error;
  return data as StockAlert[];
}

export async function markAlertsNotified(ids: number[]): Promise<void> {
  if (DEMO_MODE) {
    demoDB().alerts.forEach((a) => { if (ids.includes(a.id)) a.notified = true; });
    demoSave();
    return;
  }
  const { error } = await db().from('stock_alerts').update({ notified: true }).in('id', ids);
  if (error) throw error;
}

export async function deleteStockAlert(id: number): Promise<void> {
  if (DEMO_MODE) { const d = demoDB(); d.alerts = d.alerts.filter((a) => a.id !== id); demoSave(); return; }
  const { error } = await db().from('stock_alerts').delete().eq('id', id);
  if (error) throw error;
}

/** Chiffres des pastilles de notification du menu vendeur. */
export async function adminCounts(): Promise<AdminCounts> {
  const [products, orders, alerts] = await Promise.all([adminListProducts(), adminListOrders(), adminListStockAlerts()]);
  return {
    outOfStock: products.filter((p) => p.active && p.stock === 0).length,
    alertsPending: alerts.filter((a) => !a.notified).length,
    ordersToPrepare: orders.filter((o) => o.status === 'paid' || o.status === 'check_stock').length,
  };
}
