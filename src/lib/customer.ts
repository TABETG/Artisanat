// Espace client : connexion par lien envoyé par email (sans mot de passe), commandes et favoris.
import { db, DEMO_MODE } from './supabase';
import { demoDB, demoSave, wait } from './demoStore';
import { GiftCard, Order, ReturnRequest } from '../types';

const DEMO_KEY = 'artisanat-demo-client';
export const DEMO_CUSTOMER = 'claire.martin@exemple.fr';

export interface CustomerSession { email: string; userId: string | null }

export async function getCustomerSession(): Promise<CustomerSession | null> {
  if (DEMO_MODE) { try { const e = sessionStorage.getItem(DEMO_KEY); return e ? { email: e, userId: null } : null; } catch { return null; } }
  const { data } = await db().auth.getSession();
  const u = data.session?.user;
  return u?.email ? { email: u.email.toLowerCase(), userId: u.id } : null;
}

export function onCustomerChange(cb: () => void): () => void {
  if (DEMO_MODE) { window.addEventListener('artisanat-client', cb); return () => window.removeEventListener('artisanat-client', cb); }
  const { data } = db().auth.onAuthStateChange(() => cb());
  return () => data.subscription.unsubscribe();
}

/** Envoie un lien de connexion par email. Le compte est créé automatiquement à la première connexion. */
export async function sendLoginLink(email: string): Promise<void> {
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) throw new Error('Adresse email invalide.');
  if (DEMO_MODE) { await wait(400); return; }
  const { error } = await db().auth.signInWithOtp({ email: clean, options: { emailRedirectTo: `${window.location.origin}/compte` } });
  if (error) throw new Error(error.message.includes('rate') ? 'Trop de demandes : réessayez dans quelques minutes.' : 'L’email n’a pas pu être envoyé. Réessayez.');
}

/** Démonstration : connexion immédiate, sans email. */
export function demoLogin(email: string): void {
  try { sessionStorage.setItem(DEMO_KEY, email.trim().toLowerCase()); } catch { /* ignoré */ }
  window.dispatchEvent(new Event('artisanat-client'));
}

export async function customerSignOut(): Promise<void> {
  if (DEMO_MODE) { try { sessionStorage.removeItem(DEMO_KEY); } catch { /* ignoré */ } window.dispatchEvent(new Event('artisanat-client')); return; }
  await db().auth.signOut();
}

export async function listMyOrders(email: string): Promise<Order[]> {
  if (DEMO_MODE) { await wait(200); return demoDB().orders.filter((o) => o.email?.toLowerCase() === email).sort((a, b) => b.created_at.localeCompare(a.created_at)); }
  // Les règles de sécurité de la base ne renvoient que les commandes de cet email
  const { data, error } = await db().from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return (data as Order[]).filter((o) => o.email?.toLowerCase() === email);
}

export async function listMyReturns(email: string): Promise<ReturnRequest[]> {
  if (DEMO_MODE) return demoDB().returns.filter((r) => r.email === email);
  const { data } = await db().from('returns').select('*').order('created_at', { ascending: false });
  return (data ?? []) as ReturnRequest[];
}

export async function listMyGiftCards(email: string): Promise<GiftCard[]> {
  if (DEMO_MODE) return demoDB().giftCards.filter((g) => g.buyer_email === email || g.recipient_email === email);
  const { data } = await db().from('gift_cards').select('code,amount_cents,recipient_name,expires_at,created_at,buyer_email,recipient_email,id,buyer_name,message');
  return (data ?? []) as GiftCard[];
}

export async function isSubscribed(email: string): Promise<boolean> {
  if (DEMO_MODE) return demoDB().subscribers.some((s) => s.email === email);
  const { data } = await db().from('newsletter').select('id').eq('email', email).maybeSingle();
  return !!data;
}

export async function setSubscribed(email: string, on: boolean): Promise<void> {
  if (DEMO_MODE) {
    const d = demoDB();
    d.subscribers = d.subscribers.filter((s) => s.email !== email);
    if (on) d.subscribers.push({ id: Date.now(), email, created_at: new Date().toISOString() });
    demoSave(); return;
  }
  if (on) { const { error } = await db().from('newsletter').insert({ email }); if (error && error.code !== '23505') throw error; }
  else { const { error } = await db().from('newsletter').delete().eq('email', email); if (error) throw error; }
}

// ---------- Favoris synchronisés ----------
export async function loadRemoteFavorites(userId: string): Promise<string[]> {
  const { data } = await db().from('customer_favorites').select('product_id').eq('user_id', userId);
  return (data ?? []).map((r) => r.product_id as string);
}

export async function saveRemoteFavorites(userId: string, ids: string[]): Promise<void> {
  const current = await loadRemoteFavorites(userId);
  const toAdd = ids.filter((id) => !current.includes(id) && /^[0-9a-f-]{36}$/i.test(id));
  const toRemove = current.filter((id) => !ids.includes(id));
  if (toAdd.length) await db().from('customer_favorites').insert(toAdd.map((product_id) => ({ user_id: userId, product_id })));
  if (toRemove.length) await db().from('customer_favorites').delete().eq('user_id', userId).in('product_id', toRemove);
}

/** Export RGPD : toutes les données liées à ce compte, au format JSON. */
export async function exportMyData(email: string): Promise<string> {
  const [orders, returns, cards, subscribed] = await Promise.all([listMyOrders(email), listMyReturns(email), listMyGiftCards(email), isSubscribed(email)]);
  return JSON.stringify({ email, exporte_le: new Date().toISOString(), lettre_information: subscribed, commandes: orders, retours: returns, cartes_cadeaux: cards }, null, 2);
}
