// Toutes les lectures/écritures passent par ce fichier.
// En mode démonstration → base simulée dans le navigateur ; sinon → Supabase.
import { db, DEMO_MODE } from './supabase';
import { demoAuth, demoDB, demoSave, wait } from './demoStore';
import { DEMO_ADMIN } from './demo';
import { imageToDataUrl, resizeImage } from './image';
import { AdminCounts, NotifyResult, Order, OrderStatus, Product, ProductInput, Review, ShopSettings, StockAlert, TrackedOrder } from '../types';
import { withDefaults } from '../settings';
import { CARRIERS, trackingUrl } from '../config';
import { shippingFor } from '../shipping';

const PRODUCT_FIELDS =
  'id,name,description,category,price_cents,stock,width_cm,length_cm,material,origin,images,featured,active,created_at,' +
  'reference,compare_at_price_cents,technique,colors,pile_height_mm,weight_kg,care,made_to_order,low_stock_threshold';

const byNewest = <T extends { created_at: string }>(a: T, b: T) => b.created_at.localeCompare(a.created_at);

// =============== Boutique (public) ===============

export async function listProducts(): Promise<Product[]> {
  if (DEMO_MODE) { await wait(150); return demoDB().products.filter((p) => p.active).sort(byNewest); }
  const { data, error } = await db()
    .from('products').select(PRODUCT_FIELDS).eq('active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as unknown as Product[];
}

export async function getProduct(id: string): Promise<Product | null> {
  if (DEMO_MODE) { await wait(100); return demoDB().products.find((p) => p.id === id && p.active) ?? null; }
  const { data, error } = await db().from('products').select(PRODUCT_FIELDS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data as unknown as Product | null;
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
  const shipping = shippingFor(subtotal, data.settings);
  const id = `demo-${Date.now()}`;
  data.orders.unshift({
    id, stripe_session_id: id, stripe_payment_id: null,
    email: 'client.demo@exemple.fr', customer_name: 'Client de démonstration', phone: '+33 6 00 00 00 00',
    shipping_name: 'Client de démonstration',
    shipping_address: { line1: '1 place de la République', postal_code: '75003', city: 'Paris', country: 'FR' },
    subtotal_cents: subtotal, shipping_cents: shipping, total_cents: subtotal + shipping,
    status: 'paid', tracking_number: null, tracking_carrier: null, shipped_email_sent_at: null, note: null, created_at: new Date().toISOString(), order_items: lines,
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
    window.addEventListener('artisanat-demo-auth', handler);
    return () => window.removeEventListener('artisanat-demo-auth', handler);
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
  return data as unknown as Product[];
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
  return data as unknown as Product;
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

export interface OrderPatch { status?: OrderStatus; tracking_number?: string | null; tracking_carrier?: string | null; note?: string | null }

export async function updateOrder(id: string, patch: OrderPatch): Promise<void> {
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
  const [products, orders, alerts, reviews] = await Promise.all([adminListProducts(), adminListOrders(), adminListStockAlerts(), adminListReviews()]);
  return {
    reviewsPending: reviews.filter((r) => !r.approved).length,
    outOfStock: products.filter((p) => p.active && p.stock === 0).length,
    alertsPending: alerts.filter((a) => !a.notified).length,
    ordersToPrepare: orders.filter((o) => o.status === 'paid' || o.status === 'check_stock').length,
  };
}

// =============== Espace vendeur : outils ===============

/** Copie un produit (pratique pour une série de coussins ou de tapis proches). */
export async function duplicateProduct(p: Product): Promise<Product> {
  const { id: _id, created_at: _c, ...rest } = p;
  void _id; void _c;
  return saveProduct({ ...rest, name: `${p.name} (copie)`, reference: p.reference ? `${p.reference}-COPIE` : '', active: false, featured: false });
}

async function callAdminFunction(body: Record<string, unknown>): Promise<NotifyResult> {
  const { data } = await db().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Session expirée : reconnectez-vous.');
  const res = await fetch('/.netlify/functions/admin-notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? 'Envoi impossible.');
  return json as NotifyResult;
}

/**
 * Produit de retour en stock : prévient les clients inscrits.
 * Avec Resend configuré → emails envoyés automatiquement. Sinon → liste d'emails à contacter soi-même.
 */
export async function notifyRestock(productId: string): Promise<NotifyResult> {
  if (DEMO_MODE) {
    await wait(500);
    const pending = demoDB().alerts.filter((a) => a.product_id === productId && !a.notified);
    pending.forEach((a) => { a.notified = true; });
    demoSave();
    return { mode: 'email', sent: pending.length, emails: pending.map((a) => a.email) };
  }
  return callAdminFunction({ action: 'restock', productId });
}

/** Commande expédiée : email au client avec le lien de suivi. */
export async function notifyShipped(orderId: string): Promise<NotifyResult> {
  if (DEMO_MODE) {
    await wait(500);
    const o = demoDB().orders.find((x) => x.id === orderId);
    if (o) o.shipped_email_sent_at = new Date().toISOString();
    demoSave();
    return { mode: 'email', sent: o?.email ? 1 : 0, emails: o?.email ? [o.email] : [] };
  }
  return callAdminFunction({ action: 'shipped', orderId });
}

/** Export des commandes pour la comptabilité (s'ouvre dans Excel). */
export function ordersToCsv(orders: Order[]): string {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const euros = (c: number) => (c / 100).toFixed(2).replace('.', ',');
  const head = ['Date', 'Numéro', 'Client', 'Email', 'Téléphone', 'Adresse', 'Code postal', 'Ville', 'Pays', 'Articles', 'Sous-total', 'Livraison', 'Total', 'Étape', 'Transporteur', 'Suivi'];
  const rows = orders.map((o) => [
    new Date(o.created_at).toLocaleDateString('fr-FR'), o.id.slice(0, 8).toUpperCase(), o.shipping_name ?? o.customer_name, o.email, o.phone,
    [o.shipping_address?.line1, o.shipping_address?.line2].filter(Boolean).join(' '), o.shipping_address?.postal_code, o.shipping_address?.city, o.shipping_address?.country,
    (o.order_items ?? []).map((i) => `${i.quantity} x ${i.name}`).join(' ; '),
    euros(o.subtotal_cents), euros(o.shipping_cents), euros(o.total_cents), o.status, o.tracking_carrier, o.tracking_number,
  ].map(esc).join(';'));
  return '\uFEFF' + [head.map(esc).join(';'), ...rows].join('\r\n');
}

export function downloadFile(name: string, content: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// =============== Réglages de la boutique ===============

export async function getSettings(): Promise<ShopSettings> {
  if (DEMO_MODE) return withDefaults(demoDB().settings);
  const { data } = await db().from('settings').select('data').eq('id', 1).maybeSingle();
  return withDefaults(data?.data as Partial<ShopSettings> | undefined);
}

export async function saveSettings(settings: ShopSettings): Promise<void> {
  if (DEMO_MODE) { await wait(); demoDB().settings = settings; demoSave(); return; }
  const { error } = await db().from('settings').update({ data: settings, updated_at: new Date().toISOString() }).eq('id', 1);
  if (error) throw error;
}

// =============== Avis clients ===============

const REVIEW_PUBLIC_FIELDS = 'id,product_id,author_name,rating,comment,approved,verified,created_at';

export async function listApprovedReviews(): Promise<Review[]> {
  if (DEMO_MODE) return demoDB().reviews.filter((r) => r.approved).map(({ email: _e, ...r }) => { void _e; return r; }).sort(byNewest);
  const { data, error } = await db().from('reviews').select(REVIEW_PUBLIC_FIELDS).eq('approved', true).order('created_at', { ascending: false }).limit(2000);
  if (error) throw error;
  return data as Review[];
}

export async function createReview(input: { product_id: string; author_name: string; email: string; rating: number; comment: string }): Promise<void> {
  const clean = { ...input, author_name: input.author_name.trim(), email: input.email.trim().toLowerCase(), comment: input.comment.trim() };
  if (!clean.author_name) throw new Error('Indiquez votre prénom.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean.email)) throw new Error('Adresse email invalide.');
  if (clean.rating < 1 || clean.rating > 5) throw new Error('Choisissez une note.');
  if (DEMO_MODE) {
    await wait();
    demoDB().reviews.push({ ...clean, id: Date.now(), approved: false, verified: false, created_at: new Date().toISOString() });
    demoSave();
    return;
  }
  const { error } = await db().from('reviews').insert(clean);
  if (error) throw new Error('Votre avis n’a pas pu être envoyé. Réessayez.');
}

export async function adminListReviews(): Promise<Review[]> {
  if (DEMO_MODE) return [...demoDB().reviews].sort(byNewest);
  const { data, error } = await db().from('reviews').select('*').order('created_at', { ascending: false }).limit(2000);
  if (error) throw error;
  return data as Review[];
}

export async function moderateReview(id: number, patch: { approved?: boolean; verified?: boolean }): Promise<void> {
  if (DEMO_MODE) { const r = demoDB().reviews.find((x) => x.id === id); if (r) Object.assign(r, patch); demoSave(); return; }
  const { error } = await db().from('reviews').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteReview(id: number): Promise<void> {
  if (DEMO_MODE) { const d = demoDB(); d.reviews = d.reviews.filter((r) => r.id !== id); demoSave(); return; }
  const { error } = await db().from('reviews').delete().eq('id', id);
  if (error) throw error;
}

// =============== Suivi de commande (client) ===============

export async function trackOrders(email: string, postalCode: string): Promise<TrackedOrder[]> {
  const e = email.trim().toLowerCase();
  const pc = postalCode.replace(/\s/g, '').toUpperCase();
  if (!e || !pc) throw new Error('Indiquez votre email et votre code postal.');
  if (DEMO_MODE) {
    await wait(400);
    return demoDB().orders
      .filter((o) => o.email?.toLowerCase() === e && (o.shipping_address?.postal_code ?? '').replace(/\s/g, '').toUpperCase() === pc)
      .sort(byNewest)
      .map((o) => ({
        number: o.id.replace(/^demo-/, '').slice(0, 8).toUpperCase(), created_at: o.created_at, status: o.status, total_cents: o.total_cents,
        items: (o.order_items ?? []).map((i) => ({ name: i.name, quantity: i.quantity })),
        tracking_number: o.tracking_number, tracking_url: trackingUrl(o.tracking_carrier, o.tracking_number),
        carrier: CARRIERS.find((c) => c.id === o.tracking_carrier)?.label ?? null,
      }));
  }
  const res = await fetch('/.netlify/functions/order-status', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e, postalCode: pc }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? 'Recherche impossible pour le moment.');
  return body.orders as TrackedOrder[];
}
