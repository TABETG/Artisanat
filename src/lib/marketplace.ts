// Place de marché : d'autres artisans vendent leurs créations sur la boutique.
import { db, DEMO_MODE } from './supabase';
import { demoDB, demoSave, wait } from './demoStore';
import { resizeImage, imageToDataUrl } from './image';
import { getCustomerSession } from './customer';
import { Product, ProductInput, Seller, SellerOrder, SellerPrivate, SellerStatus, SellerTransfer } from '../types';
import { slugify } from '../settings';

const PRODUCT_FIELDS = 'id,name,description,category,price_cents,stock,width_cm,length_cm,material,origin,images,featured,active,created_at,' +
  'reference,compare_at_price_cents,technique,colors,pile_height_mm,weight_kg,care,made_to_order,low_stock_threshold,badges,promo_ends_at,sales_count,' +
  'publish_at,views_count,cart_adds_count,seller_id,moderation,moderation_note,' +
  'metal,stones,jewelry_size,nickel_free,net_content,ingredients,usage,warnings,pao_months,cpnp_ref';

// =============== Côté public ===============

export async function listSellers(): Promise<Seller[]> {
  if (DEMO_MODE) return demoDB().sellers.filter((s) => s.status === 'approved');
  const { data } = await db().from('sellers').select('*').eq('status', 'approved').order('shop_name');
  return (data ?? []) as Seller[];
}

export async function getSellerBySlug(slug: string): Promise<Seller | null> {
  if (DEMO_MODE) return demoDB().sellers.find((s) => s.slug === slug && s.status === 'approved') ?? null;
  const { data } = await db().from('sellers').select('*').eq('slug', slug).eq('status', 'approved').maybeSingle();
  return (data as Seller) ?? null;
}

// =============== Espace artisan (vendeur connecté) ===============

export interface MySeller { seller: Seller; priv: SellerPrivate | null }

export async function getMySeller(): Promise<MySeller | null> {
  const session = await getCustomerSession();
  if (!session) return null;
  if (DEMO_MODE) {
    const d = demoDB();
    const priv = d.sellerPrivate.find((p) => p.email === session.email);
    const seller = priv ? d.sellers.find((s) => s.id === priv.seller_id) : undefined;
    return seller ? { seller, priv: priv ?? null } : null;
  }
  const { data: seller } = await db().from('sellers').select('*').eq('user_id', session.userId).maybeSingle();
  if (!seller) return null;
  const { data: priv } = await db().from('seller_private').select('*').eq('seller_id', seller.id).maybeSingle();
  return { seller: seller as Seller, priv: (priv as SellerPrivate) ?? null };
}

export interface Application {
  shop_name: string; craft: string; bio: string; city: string; country: string;
  legal_status: 'particulier' | 'professionnel'; siret: string; phone: string; message: string;
}

export async function applyAsSeller(a: Application): Promise<void> {
  const session = await getCustomerSession();
  if (!session) throw new Error('Connectez-vous d’abord.');
  if (a.shop_name.trim().length < 2) throw new Error('Indiquez le nom de votre atelier.');
  if (!a.craft.trim()) throw new Error('Indiquez votre spécialité.');
  if (a.legal_status === 'professionnel' && !/^\d{14}$/.test(a.siret.replace(/\s/g, ''))) throw new Error('Le SIRET doit contenir 14 chiffres.');
  const slugBase = slugify(a.shop_name) || 'atelier';
  const seller = {
    shop_name: a.shop_name.trim(), slug: `${slugBase}-${Math.random().toString(36).slice(2, 6)}`, craft: a.craft.trim(), bio: a.bio.trim(),
    city: a.city.trim(), country: a.country, legal_status: a.legal_status, siret: a.legal_status === 'professionnel' ? a.siret.replace(/\s/g, '') : null,
  };
  if (DEMO_MODE) {
    await wait(500);
    const d = demoDB();
    const id = `seller-${Date.now()}`;
    d.sellers.push({ ...seller, id, user_id: null, avatar_url: null, status: 'pending', commission_percent: null, payouts_enabled: false,
      shipping_france_cents: 900, shipping_europe_cents: null, free_shipping_from_cents: null, prep_days: 3, return_policy: '', created_at: new Date().toISOString() });
    d.sellerPrivate.push({ seller_id: id, email: session.email, phone: a.phone || null, application_message: a.message || null, stripe_account_id: null, rejection_reason: null });
    demoSave();
    return;
  }
  const { data, error } = await db().from('sellers').insert({ ...seller, user_id: session.userId }).select('id').single();
  if (error) throw new Error(error.code === '23505' ? 'Vous avez déjà une candidature.' : 'Envoi impossible. Réessayez.');
  await db().from('seller_private').insert({ seller_id: data.id, email: session.email, phone: a.phone || null, application_message: a.message || null });
  fetch('/.netlify/functions/notify-owner', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'seller' }) }).catch(() => {});
}

export type SellerProfilePatch = Partial<Pick<Seller, 'shop_name' | 'craft' | 'bio' | 'city' | 'avatar_url' | 'shipping_france_cents' | 'shipping_europe_cents' | 'free_shipping_from_cents' | 'prep_days' | 'return_policy'>>;

export async function updateMySeller(id: string, patch: SellerProfilePatch): Promise<void> {
  if (DEMO_MODE) { const s = demoDB().sellers.find((x) => x.id === id); if (s) Object.assign(s, patch); demoSave(); return; }
  const { error } = await db().from('sellers').update(patch).eq('id', id);
  if (error) throw new Error('Enregistrement impossible.');
}

export async function listMyProducts(sellerId: string): Promise<Product[]> {
  if (DEMO_MODE) return demoDB().products.filter((p) => p.seller_id === sellerId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const { data, error } = await db().from('products').select(PRODUCT_FIELDS).eq('seller_id', sellerId).order('created_at', { ascending: false });
  if (error) throw error;
  return data as unknown as Product[];
}

/** Enregistre un produit de l'artisan. Tout changement de contenu repasse en relecture par la boutique. */
export async function saveMyProduct(sellerId: string, input: ProductInput, id?: string): Promise<void> {
  const clean = { ...input, seller_id: sellerId, featured: false };
  if (DEMO_MODE) {
    await wait(300);
    const d = demoDB();
    if (id) {
      const p = d.products.find((x) => x.id === id && x.seller_id === sellerId);
      if (!p) throw new Error('Produit introuvable');
      const contentChanged = p.name !== clean.name || p.description !== clean.description || p.price_cents !== clean.price_cents || JSON.stringify(p.images) !== JSON.stringify(clean.images);
      Object.assign(p, clean, { moderation: contentChanged ? 'pending' : p.moderation, moderation_note: contentChanged ? null : p.moderation_note });
    } else {
      d.products.push({ ...clean, id: `demo-art-${Date.now()}`, created_at: new Date().toISOString(), moderation: 'pending', moderation_note: null } as Product);
    }
    demoSave();
    return;
  }
  const payload = { ...clean, updated_at: new Date().toISOString() };
  const { error } = id ? await db().from('products').update(payload).eq('id', id) : await db().from('products').insert(payload);
  if (error) throw new Error('Enregistrement impossible : vérifiez les champs.');
}

export async function deleteMyProduct(id: string): Promise<void> {
  if (DEMO_MODE) { const d = demoDB(); d.products = d.products.filter((p) => p.id !== id); demoSave(); return; }
  const { error } = await db().from('products').delete().eq('id', id);
  if (error) throw new Error('Suppression impossible (le produit a peut-être déjà été vendu : masquez-le plutôt).');
}

export async function uploadMyImage(sellerId: string, file: File): Promise<string> {
  if (DEMO_MODE) return imageToDataUrl(file);
  const blob = await resizeImage(file);
  const path = `artisans/${sellerId}/${crypto.randomUUID()}.jpg`;
  const { error } = await db().storage.from('product-images').upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
  if (error) throw error;
  return db().storage.from('product-images').getPublicUrl(path).data.publicUrl;
}

export async function listMySellerOrders(sellerId: string): Promise<SellerOrder[]> {
  if (DEMO_MODE) {
    const d = demoDB();
    return d.shipments.filter((s) => s.seller_id === sellerId).map((sh) => {
      const o = d.orders.find((x) => x.id === sh.order_id)!;
      return { id: o.id, created_at: o.created_at, shipping_name: o.shipping_name, shipping_address: o.shipping_address, phone: o.phone, customer_message: o.customer_message ?? null,
        order_status: o.status, status: sh.status, carrier: sh.carrier, tracking_number: sh.tracking_number, shipped_at: sh.shipped_at, shipping_cents: sh.shipping_cents,
        items: (o.order_items ?? []).filter((i) => i.seller_id === sellerId).map((i) => ({ name: i.name, quantity: i.quantity, unit_price_cents: i.unit_price_cents })) };
    }).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const { data, error } = await db().rpc('seller_orders');
  if (error) throw error;
  return (data ?? []) as SellerOrder[];
}

export async function markShippedBySeller(sellerId: string, orderId: string, carrier: string, tracking: string): Promise<void> {
  if (DEMO_MODE) {
    const sh = demoDB().shipments.find((s) => s.order_id === orderId && s.seller_id === sellerId);
    if (sh) Object.assign(sh, { status: 'shipped', carrier, tracking_number: tracking, shipped_at: new Date().toISOString() });
    demoSave(); return;
  }
  const { error } = await db().rpc('seller_mark_shipped', { p_order_id: orderId, p_carrier: carrier, p_tracking: tracking });
  if (error) throw new Error('Mise à jour impossible.');
}

export async function listMyTransfers(sellerId: string): Promise<SellerTransfer[]> {
  if (DEMO_MODE) return demoDB().transfers.filter((t) => t.seller_id === sellerId);
  const { data } = await db().from('seller_transfers').select('*').eq('seller_id', sellerId).order('created_at', { ascending: false });
  return (data ?? []) as SellerTransfer[];
}

/** Paiements : l'artisan ouvre son compte Stripe (identité, IBAN) ; Stripe lui verse ses ventes. */
export async function sellerStripe(action: 'onboard' | 'status' | 'dashboard'): Promise<{ url?: string; payouts_enabled?: boolean }> {
  if (DEMO_MODE) {
    await wait(600);
    const me = await getMySeller();
    if (me && action === 'onboard') { me.seller.payouts_enabled = true; if (me.priv) me.priv.stripe_account_id = 'acct_demo'; demoSave(); }
    return { payouts_enabled: me?.seller.payouts_enabled };
  }
  const { data } = await db().auth.getSession();
  const res = await fetch('/.netlify/functions/seller-stripe', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token ?? ''}` }, body: JSON.stringify({ action }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? 'Service de paiement indisponible.');
  return body;
}

// =============== Espace vendeur de la boutique (administration) ===============

export interface SellerWithPrivate extends Seller { priv: SellerPrivate | null; products: number }

export async function adminListSellers(): Promise<SellerWithPrivate[]> {
  if (DEMO_MODE) {
    const d = demoDB();
    return d.sellers.map((s) => ({ ...s, priv: d.sellerPrivate.find((p) => p.seller_id === s.id) ?? null, products: d.products.filter((p) => p.seller_id === s.id).length }));
  }
  const [{ data: sellers }, { data: privs }, { data: prods }] = await Promise.all([
    db().from('sellers').select('*').order('created_at', { ascending: false }),
    db().from('seller_private').select('*'),
    db().from('products').select('seller_id').not('seller_id', 'is', null),
  ]);
  return ((sellers ?? []) as Seller[]).map((s) => ({ ...s, priv: ((privs ?? []) as SellerPrivate[]).find((p) => p.seller_id === s.id) ?? null, products: (prods ?? []).filter((p) => p.seller_id === s.id).length }));
}

export async function adminSetSeller(id: string, patch: { status?: SellerStatus; commission_percent?: number | null }, reason?: string): Promise<void> {
  if (DEMO_MODE) {
    const d = demoDB();
    const s = d.sellers.find((x) => x.id === id); if (s) Object.assign(s, patch);
    const p = d.sellerPrivate.find((x) => x.seller_id === id); if (p && reason !== undefined) p.rejection_reason = reason;
    demoSave(); return;
  }
  const { error } = await db().from('sellers').update(patch).eq('id', id);
  if (error) throw error;
  if (reason !== undefined) await db().from('seller_private').update({ rejection_reason: reason }).eq('seller_id', id);
}

export async function adminModerateProduct(id: string, decision: 'approved' | 'rejected', note: string | null): Promise<void> {
  if (DEMO_MODE) { const p = demoDB().products.find((x) => x.id === id); if (p) Object.assign(p, { moderation: decision, moderation_note: note }); demoSave(); return; }
  const { error } = await db().from('products').update({ moderation: decision, moderation_note: note }).eq('id', id);
  if (error) throw error;
}

export async function adminListTransfers(): Promise<SellerTransfer[]> {
  if (DEMO_MODE) return demoDB().transfers;
  const { data } = await db().from('seller_transfers').select('*').order('created_at', { ascending: false }).limit(1000);
  return (data ?? []) as SellerTransfer[];
}
