// Actions de l'espace vendeur qui envoient des emails.
// Accès réservé : le jeton de connexion Supabase est vérifié, puis l'appartenance à la table admins.
import { requireAdmin, serviceClient } from '../shared/admin';
import { absoluteUrl, canEmailCustomers, layout, sendEmails } from '../shared/email';
import { SHOP, trackingUrl, CARRIERS } from '../../src/config';

import { json } from '../shared/admin';

const supabase = serviceClient();

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);

  const denied = await requireAdmin(req);
  if (denied) return denied;

  let body: { action?: string; productId?: string; orderId?: string };
  try { body = await req.json(); } catch { return json({ error: 'Requête invalide' }, 400); }

  try {
    if (body.action === 'restock' && body.productId) return await restock(body.productId);
    if (body.action === 'shipped' && body.orderId) return await shipped(body.orderId);
  } catch (e) {
    console.error('admin-notify', e);
    return json({ error: 'Les emails n’ont pas pu être envoyés. Vérifiez la configuration Resend.' }, 502);
  }
  return json({ error: 'Action inconnue' }, 400);
};

async function restock(productId: string) {
  const { data: product } = await supabase.from('products').select('id,name,stock,active,images').eq('id', productId).maybeSingle();
  if (!product) return json({ error: 'Produit introuvable' }, 404);
  if (!product.active || product.stock <= 0) return json({ error: 'Remettez d’abord le produit en stock et en ligne.' }, 409);

  const { data: alerts } = await supabase.from('stock_alerts').select('id,email').eq('product_id', productId).eq('notified', false);
  const list = alerts ?? [];
  const emails = list.map((a) => a.email);
  if (list.length === 0) return json({ mode: 'email', sent: 0, emails: [] });
  if (!canEmailCustomers()) return json({ mode: 'manual', sent: 0, emails });

  const url = absoluteUrl(`/produit/${product.id}`);
  const image = product.images?.[0] ? absoluteUrl(product.images[0]) : undefined;
  const sent = await sendEmails(list.map((a) => ({
    to: a.email,
    subject: `${product.name} est de nouveau disponible`,
    text: `Bonjour,\n\nVous nous aviez demandé d’être prévenu(e) : « ${product.name} » est de nouveau disponible.\n${product.stock === 1 ? 'Il s’agit d’une pièce unique : premier arrivé, premier servi.\n' : ''}\n${url}\n\n${SHOP.name}`,
    html: layout(`${product.name} est de nouveau disponible`, [
      'Bonjour,',
      'Vous nous aviez demandé d’être prévenu(e) : cette création est de nouveau en vente sur notre boutique.',
      ...(product.stock === 1 ? ['Il s’agit d’une pièce unique : premier arrivé, premier servi.'] : []),
    ], { label: 'Voir la création', url }, image),
  })));

  await supabase.from('stock_alerts').update({ notified: true }).in('id', list.map((a) => a.id));
  return json({ mode: 'email', sent, emails });
}

async function shipped(orderId: string) {
  const { data: order } = await supabase.from('orders').select('id,email,shipping_name,tracking_number,tracking_carrier').eq('id', orderId).maybeSingle();
  if (!order) return json({ error: 'Commande introuvable' }, 404);
  if (!order.email) return json({ error: 'Pas d’email pour ce client' }, 400);
  if (!canEmailCustomers()) return json({ mode: 'manual', sent: 0, emails: [order.email] });

  const link = trackingUrl(order.tracking_carrier, order.tracking_number);
  const carrier = CARRIERS.find((c) => c.id === order.tracking_carrier)?.label;
  const lines = [
    `Bonjour ${order.shipping_name ?? ''},`.trim(),
    'Bonne nouvelle : votre commande vient de partir de notre atelier. Elle a été emballée avec soin.',
    ...(order.tracking_number ? [`Numéro de suivi${carrier ? ` (${carrier})` : ''} : ${order.tracking_number}`] : []),
    'Merci pour votre confiance.',
  ];
  const sent = await sendEmails([{
    to: order.email,
    subject: 'Votre commande est en route',
    text: `${lines.join('\n\n')}${link ? `\n\nSuivre le colis : ${link}` : ''}\n\n${SHOP.name}`,
    html: layout('Votre commande est en route', lines, link ? { label: 'Suivre mon colis', url: link } : undefined),
  }]);
  await supabase.from('orders').update({ shipped_email_sent_at: new Date().toISOString() }).eq('id', order.id);
  return json({ mode: 'email', sent, emails: [order.email] });
}
