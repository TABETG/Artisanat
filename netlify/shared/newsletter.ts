import { createHmac, timingSafeEqual } from 'node:crypto';

const secret = () => process.env.NEWSLETTER_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'secret';

/** Jeton de désinscription propre à chaque adresse (impossible à deviner sans la clé du serveur). */
export function unsubscribeToken(email: string): string {
  return createHmac('sha256', secret()).update(email.trim().toLowerCase()).digest('base64url').slice(0, 32);
}

export function checkUnsubscribeToken(email: string, token: string): boolean {
  const expected = Buffer.from(unsubscribeToken(email));
  const given = Buffer.from(String(token));
  return expected.length === given.length && timingSafeEqual(expected, given);
}
