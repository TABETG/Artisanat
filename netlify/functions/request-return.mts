// Demande de retour par le client, depuis « Suivre ma commande » (email + code postal vérifiés).
import { json, serviceClient } from '../shared/admin';
import { absoluteUrl, layout, sendEmails } from '../shared/email';
import { RETURN_REASONS } from '../../src/types';

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);
  let b: { email?: unknown; postalCode?: unknown; orderId?: unknown; items?: unknown; reason?: unknown; comment?: unknown };
  try { b = await req.json(); } catch { return json({ error: 'Requête invalide' }, 400); }

  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
  const postal = typeof b.postalCode === 'string' ? b.postalCode.replace(/\s/g, '').toUpperCase() : '';
  const reason = typeof b.reason === 'string' && RETURN_REASONS.includes(b.reason) ? b.reason : '';
  const comment = typeof b.comment === 'string' ? b.comment.trim().slice(0, 1500) : '';
  if (!email || !postal || !reason || typeof b.orderId !== 'string') return json({ error: 'Informations incomplètes.' }, 400);

  const supabase = serviceClient();
  const { data: order } = await supabase.from('orders').select('id,email,status,created_at,shipping_address,order_items(name,quantity)').eq('id', b.orderId).maybeSingle();
  const orderPostal = String((order?.shipping_address as { postal_code?: string } | null)?.postal_code ?? '').replace(/\s/g, '').toUpperCase();
  if (!order || order.email?.toLowerCase() !== email || orderPostal !== postal) return json({ error: 'Commande introuvable.' }, 404);
  if (!['shipped', 'delivered'].includes(order.status) || Date.now() - new Date(order.created_at).getTime() > 30 * 86400000) {
    return json({ error: 'Le délai de retour est dépassé pour cette commande. Écrivez-nous si besoin.' }, 400);
  }
  const { data: existing } = await supabase.from('returns').select('id').eq('order_id', order.id).neq('status', 'declined').maybeSingle();
  if (existing) return json({ error: 'Une demande de retour existe déjà pour cette commande.' }, 409);

  // On ne garde que des articles réellement présents dans la commande
  const wanted = Array.isArray(b.items) ? b.items as { name?: string; quantity?: number }[] : [];
  const items = (order.order_items ?? [])
    .map((i) => { const w = wanted.find((x) => x.name === i.name); return w ? { name: i.name, quantity: Math.max(1, Math.min(i.quantity, Number(w.quantity) || 1)) } : null; })
    .filter(Boolean);
  if (!items.length) return json({ error: 'Choisissez au moins un article.' }, 400);

  const { error } = await supabase.from('returns').insert({ order_id: order.id, email, items, reason, comment });
  if (error) return json({ error: 'Enregistrement impossible.' }, 500);

  const owner = process.env.OWNER_EMAIL;
  if (owner && process.env.RESEND_API_KEY) {
    const lines = [`${email} demande un retour.`, `Motif : ${reason}`, ...(comment ? [comment] : [])];
    sendEmails([{ to: owner, subject: 'Nouvelle demande de retour', text: lines.join('\n'), html: layout('Nouvelle demande de retour', lines, { label: 'Traiter le retour', url: absoluteUrl('/admin/retours') }) }],
      process.env.EMAIL_FROM ?? 'Boutique <onboarding@resend.dev>').catch(() => {});
  }
  return json({ ok: true });
};
