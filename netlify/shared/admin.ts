import { createClient } from '@supabase/supabase-js';

export const serviceClient = () => createClient(
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

/** Vérifie le jeton de connexion et l'appartenance à la table admins. Renvoie une réponse d'erreur, ou null si tout va bien. */
export async function requireAdmin(req: Request): Promise<Response | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Non connecté' }, 401);
  const supabase = serviceClient();
  const { data: auth } = await supabase.auth.getUser(token);
  if (!auth.user) return json({ error: 'Session expirée : reconnectez-vous.' }, 401);
  const { data: admin } = await supabase.from('admins').select('user_id').eq('user_id', auth.user.id).maybeSingle();
  if (!admin) return json({ error: 'Accès refusé' }, 403);

  // Double authentification activée → le jeton doit être de niveau aal2
  const { data: factors } = await supabase.auth.admin.mfa.listFactors({ userId: auth.user.id });
  const hasTotp = (factors?.factors ?? []).some((f) => f.status === 'verified');
  if (hasTotp && jwtClaim(token, 'aal') !== 'aal2') return json({ error: 'Code de double authentification requis.' }, 401);
  return null;
}

function jwtClaim(token: string, claim: string): unknown {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'))[claim];
  } catch {
    return undefined;
  }
}
