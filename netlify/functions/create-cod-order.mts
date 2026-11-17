// Boutique Algérie : commande avec paiement à la livraison (aucun paiement en ligne).
// Les prix, les frais de livraison et le stock sont vérifiés ici, côté serveur.
import { json, serviceClient } from '../shared/admin';
import { absoluteUrl, layout, sendEmails } from '../shared/email';
import { applyPromoExpiry } from '../../src/pricing';

const PHONE = /^(?:\+213|00213|0)(5|6|7)\d{8}$/;

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);
  let b: { items?: unknown; name?: unknown; phone?: unknown; wilaya?: unknown; commune?: unknown; address?: unknown; delivery?: unknown; note?: unknown; email?: unknown };
  try { b = await req.json(); } catch { return json({ error: 'Requête invalide' }, 400); }

  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const name = str(b.name, 100), commune = str(b.commune, 100), address = str(b.address, 300), note = str(b.note, 1000);
  const email = str(b.email, 200).toLowerCase() || null;
  const phone = str(b.phone, 20).replace(/[\s.-]/g, '');
  const delivery = b.delivery === 'bureau' ? 'bureau' : 'domicile';
  const wilayaCode = Number(b.wilaya);
  if (name.length < 2) return json({ error: 'Indiquez votre nom.' }, 400);
  if (!PHONE.test(phone)) return json({ error: 'Numéro de téléphone algérien invalide (ex. 0550 12 34 56).' }, 400);
  if (!commune || (delivery === 'domicile' && address.length < 3)) return json({ error: 'Adresse incomplète.' }, 400);

  const raw = Array.isArray(b.items) ? b.items.slice(0, 30) : [];
  const lines = raw.map((x) => x as { id?: unknown; quantity?: unknown })
    .filter((x) => typeof x.id === 'string' && Number.isInteger(x.quantity) && (x.quantity as number) > 0 && (x.quantity as number) <= 20)
    .map((x) => ({ id: x.id as string, quantity: x.quantity as number }));
  if (!lines.length) return json({ error: 'Votre panier est vide.' }, 400);

  const supabase = serviceClient();
  const { data: settingsRow } = await supabase.from('settings').select('data').eq('id', 1).maybeSingle();
  if ((settingsRow?.data as { dz_enabled?: boolean } | null)?.dz_enabled === false) return json({ error: 'La boutique Algérie est fermée pour le moment.' }, 403);

  // Limite anti-abus : 3 commandes en attente par numéro et par jour
  const since = new Date(Date.now() - 86400000).toISOString();
  const { count } = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('phone', phone).eq('status', 'to_confirm').gte('created_at', since);
  if ((count ?? 0) >= 3) return json({ error: 'Vous avez déjà des commandes en attente : nous allons vous appeler pour les confirmer.' }, 429);

  const { data: rate } = await supabase.from('dz_shipping_rates').select('name,home_cents,desk_cents,active').eq('code', wilayaCode).maybeSingle();
  const shipping = rate?.active ? (delivery === 'bureau' ? rate.desk_cents : rate.home_cents) : null;
  if (!rate || shipping == null) return json({ error: 'Cette wilaya ou ce mode de livraison n’est pas encore desservi.' }, 400);

  const { data: products } = await supabase.from('products')
    .select('id,name,price_cents,compare_at_price_cents,promo_ends_at,stock,active,market,moderation')
    .in('id', lines.map((l) => l.id));
  let subtotal = 0;
  const items: { product_id: string; name: string; unit_price_cents: number; quantity: number }[] = [];
  for (const line of lines) {
    const found = products?.find((p) => p.id === line.id);
    const p = found ? applyPromoExpiry(found) : undefined;
    if (!p || !p.active || p.market !== 'dz' || p.moderation !== 'approved') return json({ error: 'Un article de votre panier n’est plus disponible. Retirez-le pour continuer.' }, 409);
    if (p.stock < line.quantity) return json({ error: `Stock insuffisant pour « ${p.name} ».` }, 409);
    subtotal += p.price_cents * line.quantity;
    items.push({ product_id: p.id, name: p.name, unit_price_cents: p.price_cents, quantity: line.quantity });
  }

  const { data: order, error } = await supabase.from('orders').insert({
    stripe_session_id: `cod_${crypto.randomUUID()}`, market: 'dz', payment_method: 'cod', status: 'to_confirm',
    email, customer_name: name, phone, shipping_name: name, wilaya: `${String(wilayaCode).padStart(2, '0')} - ${rate.name}`, delivery_type: delivery,
    shipping_address: { line1: delivery === 'bureau' ? `Bureau du transporteur, ${commune}` : address, city: commune, state: rate.name, country: 'DZ' },
    subtotal_cents: subtotal, shipping_cents: shipping, total_cents: subtotal + shipping, customer_message: note || null,
    shipping_method: delivery === 'bureau' ? 'Retrait au bureau du transporteur' : 'Livraison à domicile',
  }).select('id').single();
  if (error || !order) { console.error('create-cod-order', error); return json({ error: 'La commande n’a pas pu être enregistrée. Réessayez.' }, 500); }

  await supabase.from('order_items').insert(items.map((i) => ({ ...i, order_id: order.id })));
  for (const i of items) await supabase.rpc('decrement_stock', { p_product_id: i.product_id, p_quantity: i.quantity });

  // Prévenir la famille qui gère la boutique Algérie
  const to = process.env.DZ_OWNER_EMAIL ?? process.env.OWNER_EMAIL;
  if (to && process.env.RESEND_API_KEY) {
    const lines = [`${name} — ${phone}`, `${rate.name}, ${commune} (${delivery === 'bureau' ? 'bureau' : 'domicile'})`, ...items.map((i) => `• ${i.quantity} × ${i.name}`),
      `Total à encaisser : ${((subtotal + shipping) / 100).toLocaleString('fr-FR')} DA`, 'Appelez le client pour confirmer avant de préparer le colis.'];
    sendEmails([{ to, subject: `Nouvelle commande Algérie — ${name}`, text: lines.join('\n'), html: layout('Nouvelle commande Algérie', lines, { label: 'Voir la commande', url: absoluteUrl('/admin/commandes') }) }],
      process.env.EMAIL_FROM ?? 'Boutique <onboarding@resend.dev>').catch(() => {});
  }
  return json({ number: order.id.slice(0, 8).toUpperCase(), total_cents: subtotal + shipping });
};
