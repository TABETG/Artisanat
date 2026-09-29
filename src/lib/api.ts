// Toutes les lectures/écritures passent par ce fichier.
// En mode démonstration → base simulée dans le navigateur ; sinon → Supabase.
import { db, DEMO_MODE } from './supabase';
import { demoAuth, demoDB, demoSave, wait } from './demoStore';
import { DEMO_ADMIN } from './demo';
import { imageToDataUrl, resizeImage } from './image';
import { AdminCounts, ContactMessage, Campaign, ReturnRequest, ReturnStatus, CustomRequest, CustomRequestInput, CustomStatus, GiftCard, GiftCardOrder, NotifyResult, Order, OrderStatus, Product, ProductInput, PromoCode, PromoCodeInput, Review, ShopSettings, StockAlert, Subscriber, TrackedOrder } from '../types';
import { withDefaults } from '../settings';
import { statsAllowed } from './privacy';
import { adminListSellers } from './marketplace';
import { applyPromoExpiry } from '../pricing';
import { CARRIERS, trackingUrl } from '../config';
import { quoteShipping } from '../shipping';
import { sellerShippingCents } from '../sellerShipping';

const PRODUCT_FIELDS =
  'id,name,description,category,price_cents,stock,width_cm,length_cm,material,origin,images,featured,active,created_at,' +
  'reference,compare_at_price_cents,technique,colors,pile_height_mm,weight_kg,care,made_to_order,low_stock_threshold,' +
  'badges,promo_ends_at,sales_count,publish_at,views_count,cart_adds_count,seller_id,moderation,moderation_note,' +
  'metal,stones,jewelry_size,nickel_free,net_content,ingredients,usage,warnings,pao_months,cpnp_ref';

const byNewest = <T extends { created_at: string }>(a: T, b: T) => b.created_at.localeCompare(a.created_at);

// =============== Boutique (public) ===============

export async function listProducts(): Promise<Product[]> {
  if (DEMO_MODE) { await wait(150); const d = demoDB(); return d.products.filter((p) => p.active && isPublished(p) && isSellable(p, d.sellers)).map(normalize).sort(byNewest); }
  const { data, error } = await db()
    .from('products').select(PRODUCT_FIELDS).eq('active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  // Un artisan connecté voit aussi ses produits en relecture : on ne garde que les produits validés
  return (data as unknown as Product[]).filter((p) => (p.moderation ?? 'approved') === 'approved').map(normalize);
}

export async function getProduct(id: string): Promise<Product | null> {
  if (DEMO_MODE) { await wait(100); const d = demoDB(); const p = d.products.find((x) => x.id === id && x.active && isPublished(x) && isSellable(x, d.sellers)); return p ? normalize(p) : null; }
  const { data, error } = await db().from('products').select(PRODUCT_FIELDS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? normalize(data as unknown as Product) : null;
}

/** Valeurs par défaut des champs récents + fin de promotion appliquée (côté boutique). */
function normalize(p: Product): Product {
  return applyPromoExpiry({ ...p, badges: p.badges ?? [], promo_ends_at: p.promo_ends_at ?? null, sales_count: p.sales_count ?? 0,
    publish_at: p.publish_at ?? null, views_count: p.views_count ?? 0, cart_adds_count: p.cart_adds_count ?? 0 });
}

export const isPublished = (p: Pick<Product, 'publish_at'>) => !p.publish_at || new Date(p.publish_at).getTime() <= Date.now();

/** Produit d'artisan : visible seulement s'il est validé et que l'artisan l'est aussi. */
const isSellable = (p: Product, sellers: { id: string; status: string }[]) =>
  (p.moderation ?? 'approved') === 'approved' && (!p.seller_id || sellers.some((s) => s.id === p.seller_id && s.status === 'approved'));

export async function startCheckout(items: { id: string; quantity: number }[], country = 'FR', methodId: string | null = null): Promise<string> {
  if (DEMO_MODE) return demoCheckout(items, country, methodId);
  const res = await fetch('/.netlify/functions/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, country, methodId }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.url) throw new Error(body.error ?? 'Le paiement n’a pas pu démarrer. Réessayez dans un instant.');
  return body.url as string;
}

/** Démo : simule un paiement réussi (commande créée + stock diminué). */
async function demoCheckout(items: { id: string; quantity: number }[], country: string, methodId: string | null): Promise<string> {
  await wait(600);
  const data = demoDB();
  for (const it of items) {
    const p = data.products.find((x) => x.id === it.id);
    if (!p || !p.active) throw new Error('Un article de votre panier n’est plus en vente. Retirez-le pour continuer.');
    if (p.stock < it.quantity) throw new Error(p.stock === 0 ? `« ${p.name} » vient d’être vendu. Retirez-le du panier.` : `« ${p.name} » : il n’en reste que ${p.stock}.`);
  }
  const s = withDefaults(data.settings);
  const prod = (id: string) => data.products.find((x) => x.id === id)!;
  const ownItems = items.filter((it) => !prod(it.id).seller_id);
  let quote: ReturnType<typeof quoteShipping>[number] | null = null;
  if (ownItems.length) {
    const quotes = quoteShipping(country, ownItems.map((it) => { const p = prod(it.id); return { quantity: it.quantity, price_cents: p.price_cents, width_cm: p.width_cm, length_cm: p.length_cm }; }), s.shipping_zones, s.shipping_methods);
    if (!quotes.length) throw new Error('Nous ne livrons pas encore ce pays. Écrivez-nous pour une solution.');
    quote = quotes.find((q) => q.method.id === methodId) ?? quotes[0];
  }
  // Pièces d'artisans : frais d'envoi de chaque artisan
  const sellerIds = [...new Set(items.map((it) => prod(it.id).seller_id).filter((x): x is string => !!x))];
  const sellerShip = new Map<string, number>();
  for (const sid of sellerIds) {
    const seller = data.sellers.find((x) => x.id === sid);
    const total = items.filter((it) => prod(it.id).seller_id === sid).reduce((n, it) => n + prod(it.id).price_cents * it.quantity, 0);
    const c = seller ? sellerShippingCents(seller, country, total, s.shipping_zones) : null;
    if (c == null) throw new Error(`${seller?.shop_name ?? 'Un artisan'} ne livre pas ce pays.`);
    sellerShip.set(sid, c);
  }
  const lines = items.map((it, i) => {
    const p = prod(it.id);
    p.stock -= it.quantity;
    p.sales_count = (p.sales_count ?? 0) + it.quantity;
    return { id: Date.now() + i, product_id: p.id, name: p.name, unit_price_cents: p.price_cents, quantity: it.quantity, seller_id: p.seller_id ?? null };
  });
  const subtotal = lines.reduce((n, l) => n + l.unit_price_cents * l.quantity, 0);
  const shipping = (quote?.cents ?? 0) + [...sellerShip.values()].reduce((n, c) => n + c, 0);
  const id = `demo-${Date.now()}`;
  data.orders.unshift({
    id, stripe_session_id: id, stripe_payment_id: null,
    email: 'client.demo@exemple.fr', customer_name: 'Client de démonstration', phone: '+33 6 00 00 00 00',
    shipping_name: 'Client de démonstration',
    shipping_address: { line1: '1 place de la République', postal_code: '75003', city: 'Paris', country },
    subtotal_cents: subtotal, shipping_cents: shipping, total_cents: subtotal + shipping,
    status: 'paid', tracking_number: null, tracking_carrier: null, shipped_email_sent_at: null, note: null, created_at: new Date().toISOString(), order_items: lines,
    shipping_method: [quote?.method.name, sellerIds.length ? 'Expédié par les artisans' : null].filter(Boolean).join(' + '),
    invoice_number: Math.max(0, ...data.orders.map((o) => o.invoice_number ?? 0)) + 1,
  });
  const commission = s.marketplace_commission_percent;
  for (const sid of sellerIds) {
    const seller = data.sellers.find((x) => x.id === sid)!;
    const sales = lines.filter((l) => l.seller_id === sid).reduce((n, l) => n + l.unit_price_cents * l.quantity, 0);
    const c = Math.round((sales * Number(seller.commission_percent ?? commission)) / 100);
    const ship = sellerShip.get(sid) ?? 0;
    data.shipments.push({ order_id: id, seller_id: sid, shipping_cents: ship, status: 'to_ship', carrier: null, tracking_number: null, shipped_at: null });
    data.transfers.unshift({ id: Date.now(), order_id: id, seller_id: sid, sales_cents: sales, shipping_cents: ship, commission_cents: c, amount_cents: sales - c + ship, stripe_transfer_id: 'tr_demo', created_at: new Date().toISOString() });
  }
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

export type AdminStatus = 'anonymous' | 'forbidden' | 'mfa' | 'ok';

export async function getAdminStatus(): Promise<AdminStatus> {
  if (DEMO_MODE) return demoAuth.isLoggedIn() ? 'ok' : 'anonymous';
  const { data: session } = await db().auth.getSession();
  if (!session.session) return 'anonymous';
  const { data: aal } = await db().auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') return 'mfa';
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
  logActivity(id ? `Produit modifié : ${input.name}` : `Produit ajouté : ${input.name}`);
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
  logActivity(`Produit supprimé : ${product.name}`);
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
  logActivity(`Commande #${id.replace(/^demo-/, '').slice(0, 8).toUpperCase()} mise à jour${patch.status ? ` (${patch.status})` : ''}`);
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
  const [products, orders, alerts, reviews, requests, returns, messages, sellers] = await Promise.all([adminListProducts(), adminListOrders(), adminListStockAlerts(), adminListReviews(), adminListCustomRequests(), adminListReturns(), adminListMessages(), adminListSellers()]);
  return {
    sellersPending: sellers.filter((s) => s.status === 'pending').length,
    productsToReview: products.filter((p) => p.moderation === 'pending').length,
    messagesNew: messages.filter((m) => !m.handled).length,
    returnsNew: returns.filter((r) => r.status === 'new').length,
    customRequestsNew: requests.filter((r) => r.status === 'new').length,
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
  return saveProduct({ ...rest, name: `${p.name} (copie)`, reference: p.reference ? `${p.reference}-COPIE` : '', active: false, featured: false, sales_count: 0, views_count: 0, cart_adds_count: 0, publish_at: null });
}

async function callAdminFunction<T = NotifyResult>(body: Record<string, unknown>, fn = 'admin-notify'): Promise<T> {
  const { data } = await db().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Session expirée : reconnectez-vous.');
  const res = await fetch(`/.netlify/functions/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? 'Envoi impossible.');
  return json as T;
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
  logActivity('Réglages de la boutique modifiés');
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
        id: o.id, returnable: isReturnable(o.status, o.created_at),
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

// =============== Actions groupées sur les produits ===============

export async function updateProductFields(id: string, patch: Partial<ProductInput>): Promise<void> {
  if (DEMO_MODE) { const p = demoDB().products.find((x) => x.id === id); if (p) Object.assign(p, patch); demoSave(); return; }
  const { error } = await db().from('products').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

/** Promotion en pourcentage : l'ancien prix est conservé et affiché barré. */
export function discountPatch(p: Product, percent: number, endsAt: string | null = null): Partial<ProductInput> {
  const reference = p.compare_at_price_cents && p.compare_at_price_cents > p.price_cents ? p.compare_at_price_cents : p.price_cents;
  const price = Math.round((reference * (100 - percent)) / 100 / 10) * 10; // arrondi aux 10 centimes
  return { compare_at_price_cents: reference, price_cents: price, promo_ends_at: endsAt };
}

export function removeDiscountPatch(p: Product): Partial<ProductInput> {
  return p.compare_at_price_cents && p.compare_at_price_cents > p.price_cents
    ? { price_cents: p.compare_at_price_cents, compare_at_price_cents: null, promo_ends_at: null }
    : { compare_at_price_cents: null, promo_ends_at: null };
}

// =============== Lettre d'information ===============

export async function subscribeNewsletter(email: string): Promise<void> {
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) throw new Error('Adresse email invalide.');
  if (DEMO_MODE) {
    await wait();
    const d = demoDB();
    if (!d.subscribers.some((s) => s.email === clean)) d.subscribers.push({ id: Date.now(), email: clean, created_at: new Date().toISOString() });
    demoSave();
    return;
  }
  const { error } = await db().from('newsletter').insert({ email: clean });
  if (error && error.code !== '23505') throw new Error('Inscription impossible pour le moment.');
}

export async function adminListSubscribers(): Promise<Subscriber[]> {
  if (DEMO_MODE) return [...demoDB().subscribers].sort(byNewest);
  const { data, error } = await db().from('newsletter').select('*').order('created_at', { ascending: false }).limit(10000);
  if (error) throw error;
  return data as Subscriber[];
}

// =============== Codes promo (Stripe) ===============

export async function adminListPromoCodes(): Promise<PromoCode[]> {
  if (DEMO_MODE) { await wait(200); return [...demoDB().promoCodes].sort(byNewest); }
  return (await callAdminFunction<{ codes: PromoCode[] }>({ action: 'list' }, 'admin-promo')).codes;
}

export async function createPromoCode(input: PromoCodeInput): Promise<PromoCode> {
  logActivity(`Code promo créé : ${input.code.toUpperCase()}`);
  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,30}$/.test(code)) throw new Error('Le code doit faire 3 à 30 caractères : lettres, chiffres ou tirets.');
  if (DEMO_MODE) {
    await wait();
    const d = demoDB();
    if (d.promoCodes.some((p) => p.code === code)) throw new Error('Ce code existe déjà.');
    const promo: PromoCode = {
      id: `promo_${Date.now()}`, code, active: true, times_redeemed: 0, created_at: new Date().toISOString(),
      percent_off: input.kind === 'percent' ? input.value : null, amount_off_cents: input.kind === 'amount' ? input.value : null,
      max_redemptions: input.max_redemptions, expires_at: input.expires_at, minimum_amount_cents: input.minimum_amount_cents,
    };
    d.promoCodes.push(promo); demoSave();
    return promo;
  }
  return (await callAdminFunction<{ code: PromoCode }>({ action: 'create', input: { ...input, code } }, 'admin-promo')).code;
}

export async function deactivatePromoCode(id: string): Promise<void> {
  if (DEMO_MODE) { const p = demoDB().promoCodes.find((x) => x.id === id); if (p) p.active = false; demoSave(); return; }
  await callAdminFunction({ action: 'deactivate', id }, 'admin-promo');
}

// =============== Remboursements ===============

export async function refundOrder(orderId: string, amountCents: number, restock: boolean, reason: string): Promise<{ refunded_cents: number; full: boolean; note: string }> {
  logActivity(`Remboursement de ${(amountCents / 100).toFixed(2).replace('.', ',')} € (commande #${orderId.replace(/^demo-/, '').slice(0, 8).toUpperCase()})`);
  if (DEMO_MODE) {
    await wait(600);
    const d = demoDB();
    const o = d.orders.find((x) => x.id === orderId);
    if (!o) throw new Error('Commande introuvable');
    const remaining = o.total_cents - (o.refunded_cents ?? 0);
    if (!(amountCents > 0) || amountCents > remaining) throw new Error(`Montant invalide (maximum ${(remaining / 100).toFixed(2).replace('.', ',')} €).`);
    o.refunded_cents = (o.refunded_cents ?? 0) + amountCents;
    const full = o.refunded_cents >= o.total_cents;
    if (full) o.status = 'refunded';
    const note = `Remboursé ${(amountCents / 100).toFixed(2).replace('.', ',')} € le ${new Date().toLocaleDateString('fr-FR')}${reason ? ` : ${reason}` : ''}`;
    o.note = [o.note, note].filter(Boolean).join('\n');
    if (restock) o.order_items?.forEach((i) => { const p = d.products.find((x) => x.id === i.product_id); if (p) p.stock += i.quantity; });
    demoSave();
    return { refunded_cents: o.refunded_cents, full, note };
  }
  return callAdminFunction({ orderId, amountCents, restock, reason }, 'admin-refund');
}

// =============== Double authentification (application d'authentification) ===============

export interface MfaState { enabled: boolean; factorId: string | null }

export async function getMfaState(): Promise<MfaState> {
  if (DEMO_MODE) return { enabled: false, factorId: null };
  const { data } = await db().auth.mfa.listFactors();
  const f = data?.totp?.find((x) => x.status === 'verified');
  return { enabled: !!f, factorId: f?.id ?? null };
}

/** Étape 1 : QR code à scanner avec Google Authenticator, Microsoft Authenticator… */
export async function startMfaEnrollment(): Promise<{ factorId: string; qr: string; secret: string }> {
  if (DEMO_MODE) throw new Error('Indisponible en démonstration.');
  // nettoie une tentative précédente non terminée
  const { data: existing } = await db().auth.mfa.listFactors();
  for (const f of existing?.all ?? []) if (f.status !== 'verified') await db().auth.mfa.unenroll({ factorId: f.id });
  const { data, error } = await db().auth.mfa.enroll({ factorType: 'totp', friendlyName: `Artisanat ${new Date().toLocaleDateString('fr-FR')}` });
  if (error || !data) throw new Error('Activation impossible pour le moment.');
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

/** Étape 2 (activation) ou connexion : vérifie le code à 6 chiffres. */
export async function verifyMfaCode(code: string, factorId?: string): Promise<void> {
  const id = factorId ?? (await getMfaState()).factorId;
  if (!id) throw new Error('Aucune double authentification active.');
  const { error } = await db().auth.mfa.challengeAndVerify({ factorId: id, code: code.replace(/\s/g, '') });
  if (error) throw new Error('Code incorrect ou expiré. Réessayez avec le code affiché maintenant.');
}

export async function disableMfa(factorId: string): Promise<void> {
  const { error } = await db().auth.mfa.unenroll({ factorId });
  if (error) throw new Error('Désactivation impossible : reconnectez-vous avec votre code puis réessayez.');
}

// =============== Exports ===============

export function productsToCsv(products: Product[]): string {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const euros = (c: number | null) => (c == null ? '' : (c / 100).toFixed(2).replace('.', ','));
  const head = ['Référence', 'Nom', 'Catégorie', 'Prix', 'Ancien prix', 'Stock', 'Vendus', 'Largeur (cm)', 'Longueur (cm)', 'Matière', 'Technique', 'Origine', 'En ligne', 'Lien'];
  const rows = products.map((p) => [p.reference, p.name, p.category, euros(p.price_cents), euros(p.compare_at_price_cents), p.stock, p.sales_count ?? 0,
    p.width_cm, p.length_cm, p.material, p.technique, p.origin, p.active ? 'oui' : 'non', `${window.location.origin}/produit/${p.id}`].map(esc).join(';'));
  return '\uFEFF' + [head.map(esc).join(';'), ...rows].join('\r\n');
}

// =============== Demandes sur mesure ===============

export async function createCustomRequest(input: CustomRequestInput): Promise<void> {
  const clean = { ...input, name: input.name.trim(), email: input.email.trim().toLowerCase(), message: input.message.trim() };
  if (!clean.name) throw new Error('Indiquez votre nom.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean.email)) throw new Error('Adresse email invalide.');
  if (!clean.message && !clean.width_cm) throw new Error('Décrivez votre projet ou indiquez les dimensions souhaitées.');
  if (DEMO_MODE) {
    await wait(400);
    demoDB().customRequests.unshift({ ...clean, id: Date.now(), status: 'new', note: null, created_at: new Date().toISOString() });
    demoSave();
    return;
  }
  const { error } = await db().from('custom_requests').insert(clean);
  if (error) throw new Error('Votre demande n’a pas pu être envoyée. Réessayez ou écrivez-nous.');
  // Prévient le vendeur par email si l'envoi automatique est configuré (sans bloquer le client)
  fetch('/.netlify/functions/notify-owner', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'custom_request' }) }).catch(() => {});
}

export async function adminListCustomRequests(): Promise<CustomRequest[]> {
  if (DEMO_MODE) return [...demoDB().customRequests].sort(byNewest);
  const { data, error } = await db().from('custom_requests').select('*').order('created_at', { ascending: false }).limit(1000);
  if (error) throw error;
  return data as CustomRequest[];
}

export async function updateCustomRequest(id: number, patch: { status?: CustomStatus; note?: string | null }): Promise<void> {
  if (DEMO_MODE) { const r = demoDB().customRequests.find((x) => x.id === id); if (r) Object.assign(r, patch); demoSave(); return; }
  const { error } = await db().from('custom_requests').update(patch).eq('id', id);
  if (error) throw error;
}

// =============== Cartes cadeaux ===============

export const GIFT_AMOUNTS = [5000, 10000, 15000, 20000, 30000, 50000];

function randomGiftCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `CADEAU-${part()}-${part()}`;
}

export async function startGiftCardCheckout(order: GiftCardOrder): Promise<string> {
  if (!(order.amount_cents >= 2000 && order.amount_cents <= 200000)) throw new Error('Montant entre 20 € et 2 000 €.');
  if (order.recipient_email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(order.recipient_email.trim())) throw new Error('Email du destinataire invalide.');
  if (DEMO_MODE) {
    await wait(600);
    const d = demoDB();
    const code = randomGiftCode();
    const session = `demo-gift-${Date.now()}`;
    d.giftCards.unshift({ id: session, code, amount_cents: order.amount_cents, buyer_name: order.buyer_name || 'Client de démonstration', buyer_email: 'client.demo@exemple.fr',
      recipient_name: order.recipient_name || null, recipient_email: order.recipient_email || null, message: order.message || null,
      expires_at: new Date(Date.now() + 365 * 86400000).toISOString(), created_at: new Date().toISOString(), used: false });
    d.promoCodes.unshift({ id: `promo_${session}`, code, percent_off: null, amount_off_cents: order.amount_cents, active: true, times_redeemed: 0, max_redemptions: 1,
      expires_at: new Date(Date.now() + 365 * 86400000).toISOString(), minimum_amount_cents: null, created_at: new Date().toISOString() });
    demoSave();
    return `/merci?carte_cadeau=${session}`;
  }
  const res = await fetch('/.netlify/functions/create-giftcard-checkout', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.url) throw new Error(body.error ?? 'Le paiement n’a pas pu démarrer.');
  return body.url as string;
}

/** Page de remerciement : récupère le code de la carte (quelques secondes après le paiement). */
export async function getGiftCardBySession(sessionId: string): Promise<GiftCard | null> {
  if (DEMO_MODE) return demoDB().giftCards.find((g) => g.id === sessionId) ?? null;
  const res = await fetch(`/.netlify/functions/giftcard-status?session_id=${encodeURIComponent(sessionId)}`);
  if (!res.ok) return null;
  return ((await res.json()) as { card: GiftCard | null }).card;
}

export async function adminListGiftCards(): Promise<GiftCard[]> {
  if (DEMO_MODE) {
    const d = demoDB();
    return d.giftCards.map((g) => ({ ...g, used: (d.promoCodes.find((p) => p.code === g.code)?.times_redeemed ?? 0) > 0 }));
  }
  const [{ data, error }, codes] = await Promise.all([
    db().from('gift_cards').select('*').order('created_at', { ascending: false }).limit(1000),
    adminListPromoCodes().catch(() => [] as { code: string; times_redeemed: number }[]),
  ]);
  if (error) throw error;
  return (data as GiftCard[]).map((g) => ({ ...g, used: (codes.find((c) => c.code === g.code)?.times_redeemed ?? 0) > 0 }));
}

// =============== Statistiques anonymes ===============

/** Compte une vue ou un ajout au panier (une seule fois par produit et par visite). */
export function trackProduct(productId: string, kind: 'view' | 'cart'): void {
  if (!statsAllowed()) return;
  const key = `artisanat-stat-${kind}-${productId}`;
  try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, '1'); } catch { /* ignoré */ }
  if (DEMO_MODE) {
    const p = demoDB().products.find((x) => x.id === productId);
    if (p) { if (kind === 'view') p.views_count = (p.views_count ?? 0) + 1; else p.cart_adds_count = (p.cart_adds_count ?? 0) + 1; try { demoSave(); } catch { /* ignoré */ } }
    return;
  }
  db().rpc('track_product', { p_product_id: productId, p_kind: kind }).then(() => {}, () => {});
}

// =============== Retours ===============

/** Retour possible pour une commande expédiée ou livrée depuis moins de 30 jours (14 jours après réception). */
export function isReturnable(status: OrderStatus, createdAt: string): boolean {
  return (status === 'shipped' || status === 'delivered') && Date.now() - new Date(createdAt).getTime() < 30 * 86400000;
}

export async function requestReturn(input: { email: string; postalCode: string; orderId: string; items: { name: string; quantity: number }[]; reason: string; comment: string }): Promise<void> {
  if (!input.items.length) throw new Error('Choisissez au moins un article à retourner.');
  if (!input.reason) throw new Error('Indiquez le motif du retour.');
  if (DEMO_MODE) {
    await wait(500);
    const d = demoDB();
    if (d.returns.some((r) => r.order_id === input.orderId && r.status !== 'declined')) throw new Error('Une demande de retour existe déjà pour cette commande.');
    d.returns.unshift({ id: Date.now(), order_id: input.orderId, email: input.email.trim().toLowerCase(), items: input.items, reason: input.reason, comment: input.comment.trim(),
      status: 'new', note: null, created_at: new Date().toISOString() });
    demoSave();
    return;
  }
  const res = await fetch('/.netlify/functions/request-return', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? 'La demande n’a pas pu être envoyée.');
}

export async function adminListReturns(): Promise<ReturnRequest[]> {
  if (DEMO_MODE) return [...demoDB().returns].sort(byNewest);
  const { data, error } = await db().from('returns').select('*').order('created_at', { ascending: false }).limit(1000);
  if (error) throw error;
  return data as ReturnRequest[];
}

export async function updateReturn(id: number, patch: { status?: ReturnStatus; note?: string | null }): Promise<void> {
  if (DEMO_MODE) { const r = demoDB().returns.find((x) => x.id === id); if (r) Object.assign(r, patch); demoSave(); return; }
  const { error } = await db().from('returns').update(patch).eq('id', id);
  if (error) throw error;
}

// =============== Lettre d'information : envois ===============

export async function sendCampaign(input: { subject: string; message: string; productIds: string[]; test: boolean }): Promise<{ sent: number }> {
  if (!input.subject.trim()) throw new Error('Indiquez un objet.');
  if (!input.message.trim()) throw new Error('Écrivez un message.');
  if (DEMO_MODE) {
    await wait(800);
    const d = demoDB();
    const sent = input.test ? 1 : d.subscribers.length;
    if (!input.test) d.campaigns.unshift({ id: Date.now(), subject: input.subject.trim(), sent_count: sent, created_at: new Date().toISOString() });
    demoSave();
    return { sent };
  }
  return callAdminFunction<{ sent: number }>(input, 'send-newsletter');
}

export async function adminListCampaigns(): Promise<Campaign[]> {
  if (DEMO_MODE) return [...demoDB().campaigns].sort(byNewest);
  const { data, error } = await db().from('campaigns').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return data as Campaign[];
}

export async function unsubscribeNewsletter(email: string, token: string): Promise<void> {
  if (DEMO_MODE) { const d = demoDB(); d.subscribers = d.subscribers.filter((s) => s.email !== email.toLowerCase()); demoSave(); return; }
  const res = await fetch('/.netlify/functions/newsletter-unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, token }) });
  if (!res.ok) throw new Error('Lien invalide ou expiré. Écrivez-nous pour être désinscrit.');
}

// =============== Messages de contact ===============

export async function sendContactMessage(input: { name: string; email: string; subject: string; message: string }): Promise<void> {
  const clean = { name: input.name.trim(), email: input.email.trim().toLowerCase(), subject: input.subject.trim(), message: input.message.trim() };
  if (!clean.name) throw new Error('Indiquez votre nom.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean.email)) throw new Error('Adresse email invalide.');
  if (!clean.message) throw new Error('Écrivez votre message.');
  if (DEMO_MODE) {
    await wait(400);
    demoDB().messages.unshift({ ...clean, id: Date.now(), handled: false, created_at: new Date().toISOString() });
    demoSave();
    return;
  }
  const { error } = await db().from('contact_messages').insert(clean);
  if (error) throw new Error('Le message n’a pas pu être envoyé. Écrivez-nous directement par email.');
  fetch('/.netlify/functions/notify-owner', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'contact' }) }).catch(() => {});
}

export async function adminListMessages(): Promise<ContactMessage[]> {
  if (DEMO_MODE) return [...(demoDB().messages ?? [])].sort(byNewest);
  const { data, error } = await db().from('contact_messages').select('*').order('created_at', { ascending: false }).limit(1000);
  if (error) throw error;
  return data as ContactMessage[];
}

export async function setMessageHandled(id: number, handled: boolean): Promise<void> {
  if (DEMO_MODE) { const m = demoDB().messages.find((x) => x.id === id); if (m) m.handled = handled; demoSave(); return; }
  const { error } = await db().from('contact_messages').update({ handled }).eq('id', id);
  if (error) throw error;
}

// =============== Équipe et journal d'activité ===============

export interface TeamMember { user_id: string; email: string; last_sign_in_at: string | null; me: boolean }

export async function listTeam(): Promise<TeamMember[]> {
  if (DEMO_MODE) return [{ user_id: 'demo', email: DEMO_ADMIN.email, last_sign_in_at: new Date().toISOString(), me: true }, ...(demoDB().team ?? [])];
  return (await callAdminFunction<{ members: TeamMember[] }>({ action: 'list' }, 'admin-team')).members;
}

export async function addTeamMember(email: string): Promise<void> {
  if (DEMO_MODE) { await wait(); const d = demoDB(); d.team = [...(d.team ?? []), { user_id: `demo-${Date.now()}`, email: email.trim().toLowerCase(), last_sign_in_at: null, me: false }]; demoSave(); return; }
  await callAdminFunction({ action: 'add', email }, 'admin-team');
  logActivity(`Accès vendeur donné à ${email}`);
}

export async function removeTeamMember(userId: string): Promise<void> {
  if (DEMO_MODE) { const d = demoDB(); d.team = (d.team ?? []).filter((m) => m.user_id !== userId); demoSave(); return; }
  await callAdminFunction({ action: 'remove', userId }, 'admin-team');
  logActivity('Accès vendeur retiré');
}

export interface Activity { id: number; user_email: string | null; action: string; created_at: string }

/** Note une action de l'espace vendeur (qui a fait quoi, quand). Sans effet bloquant. */
export function logActivity(action: string): void {
  if (DEMO_MODE) {
    const d = demoDB();
    d.activity = [{ id: Date.now(), user_email: DEMO_ADMIN.email, action, created_at: new Date().toISOString() }, ...(d.activity ?? [])].slice(0, 300);
    try { demoSave(); } catch { /* ignoré */ }
    return;
  }
  db().auth.getUser().then(({ data }) => db().from('activity_log').insert({ user_email: data.user?.email ?? null, action: action.slice(0, 200) })).then(() => {}, () => {});
}

export async function listActivity(): Promise<Activity[]> {
  if (DEMO_MODE) return demoDB().activity ?? [];
  const { data, error } = await db().from('activity_log').select('*').order('created_at', { ascending: false }).limit(300);
  if (error) throw error;
  return data as Activity[];
}
