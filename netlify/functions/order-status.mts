// Suivi de commande pour le client : email + code postal de livraison.
// Ne renvoie que des informations non sensibles (pas d'adresse ni de téléphone).
import { createClient } from '@supabase/supabase-js';
import { CARRIERS, trackingUrl } from '../../src/config';

const supabase = createClient(
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);
  let body: { email?: unknown; postalCode?: unknown };
  try { body = await req.json(); } catch { return json({ error: 'Requête invalide' }, 400); }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const postal = typeof body.postalCode === 'string' ? body.postalCode.replace(/\s/g, '').toUpperCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || postal.length < 3 || postal.length > 12) {
    return json({ error: 'Indiquez votre email et votre code postal.' }, 400);
  }

  // Petit délai constant : rend les essais en série peu intéressants
  await new Promise((r) => setTimeout(r, 400));

  const { data, error } = await supabase
    .from('orders')
    .select('id,created_at,status,total_cents,tracking_number,tracking_carrier,shipping_address,order_items(name,quantity)')
    .ilike('email', email)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) return json({ error: 'Service momentanément indisponible.' }, 500);

  const orders = (data ?? [])
    .filter((o) => String((o.shipping_address as { postal_code?: string } | null)?.postal_code ?? '').replace(/\s/g, '').toUpperCase() === postal)
    .map((o) => ({
      id: o.id,
      returnable: ['shipped', 'delivered'].includes(o.status) && Date.now() - new Date(o.created_at).getTime() < 30 * 86400000,
      number: o.id.slice(0, 8).toUpperCase(),
      created_at: o.created_at,
      status: o.status === 'check_stock' ? 'paid' : o.status === 'refunded' ? 'cancelled' : o.status,
      total_cents: o.total_cents,
      items: o.order_items ?? [],
      tracking_number: o.tracking_number,
      tracking_url: trackingUrl(o.tracking_carrier, o.tracking_number),
      carrier: CARRIERS.find((c) => c.id === o.tracking_carrier)?.label ?? null,
    }));
  return json({ orders });
};
