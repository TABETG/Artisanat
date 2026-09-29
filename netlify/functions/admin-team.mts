// Équipe : plusieurs personnes peuvent gérer la boutique (chacune avec son propre compte).
import { json, requireAdmin, serviceClient } from '../shared/admin';

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const supabase = serviceClient();
  const token = req.headers.get('authorization')!.replace(/^Bearer\s+/i, '');
  const { data: me } = await supabase.auth.getUser(token);

  let b: { action?: string; email?: string; userId?: string };
  try { b = await req.json(); } catch { return json({ error: 'Requête invalide' }, 400); }

  if (b.action === 'list') {
    const { data: rows } = await supabase.from('admins').select('user_id');
    const members = await Promise.all((rows ?? []).map(async (r) => {
      const { data } = await supabase.auth.admin.getUserById(r.user_id);
      return { user_id: r.user_id, email: data.user?.email ?? '—', last_sign_in_at: data.user?.last_sign_in_at ?? null, me: r.user_id === me.user?.id };
    }));
    return json({ members });
  }

  if (b.action === 'add') {
    const email = String(b.email ?? '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ error: 'Adresse email invalide.' }, 400);
    // Compte existant ? sinon invitation par email (la personne choisit son mot de passe)
    let userId: string | null = null;
    for (let page = 1; page <= 10 && !userId; page++) {
      const { data } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
      userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
      if (data.users.length < 200) break;
    }
    if (!userId) {
      const origin = process.env.URL ?? new URL(req.url).origin;
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, { redirectTo: `${origin}/admin/nouveau-mot-de-passe` });
      if (error || !data.user) return json({ error: 'Invitation impossible : vérifiez l’adresse.' }, 400);
      userId = data.user.id;
    }
    await supabase.from('admins').upsert({ user_id: userId });
    return json({ ok: true });
  }

  if (b.action === 'remove' && b.userId) {
    if (b.userId === me.user?.id) return json({ error: 'Vous ne pouvez pas vous retirer vous-même.' }, 400);
    await supabase.from('admins').delete().eq('user_id', b.userId);
    return json({ ok: true });
  }
  return json({ error: 'Action inconnue' }, 400);
};
