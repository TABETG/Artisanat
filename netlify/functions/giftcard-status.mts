// Page « merci » d'une carte cadeau : affiche le code dès que le webhook l'a créé.
import { json, serviceClient } from '../shared/admin';

export default async (req: Request) => {
  const id = new URL(req.url).searchParams.get('session_id') ?? '';
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return json({ card: null }, 400);
  const { data } = await serviceClient().from('gift_cards')
    .select('code,amount_cents,recipient_name,expires_at').eq('stripe_session_id', id).maybeSingle();
  return json({ card: data ?? null });
};
