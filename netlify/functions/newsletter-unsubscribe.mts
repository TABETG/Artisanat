// Lien « Se désinscrire » présent dans chaque lettre d'information.
import { json, serviceClient } from '../shared/admin';
import { checkUnsubscribeToken } from '../shared/newsletter';

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);
  let b: { email?: unknown; token?: unknown };
  try { b = await req.json(); } catch { return json({ error: 'Requête invalide' }, 400); }
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
  if (!email || !checkUnsubscribeToken(email, String(b.token ?? ''))) return json({ error: 'Lien invalide' }, 400);
  await serviceClient().from('newsletter').delete().eq('email', email);
  return json({ ok: true });
};
