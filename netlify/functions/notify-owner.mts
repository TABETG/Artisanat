// Email au propriétaire lors d'une nouvelle demande sur mesure.
// N'envoie rien si aucune demande n'a été créée dans les 2 dernières minutes (évite les abus).
import { json, serviceClient } from '../shared/admin';
import { absoluteUrl, layout, sendEmails } from '../shared/email';

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);
  const to = process.env.OWNER_EMAIL;
  if (!to || !process.env.RESEND_API_KEY) return json({ ok: true });
  const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data } = await serviceClient().from('custom_requests').select('name,email,width_cm,length_cm,budget,message')
    .gte('created_at', since).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!data) return json({ ok: true });
  const lines = [
    `${data.name} (${data.email}) souhaite une pièce sur mesure.`,
    ...(data.width_cm && data.length_cm ? [`Dimensions : ${data.width_cm} × ${data.length_cm} cm`] : []),
    ...(data.budget ? [`Budget : ${data.budget}`] : []),
    ...(data.message ? [data.message] : []),
  ];
  try {
    await sendEmails([{ to, subject: `Demande sur mesure : ${data.name}`, text: lines.join('\n\n'), html: layout('Nouvelle demande sur mesure', lines, { label: 'Voir la demande', url: absoluteUrl('/admin/sur-mesure') }) }],
      process.env.EMAIL_FROM ?? 'Boutique <onboarding@resend.dev>');
  } catch (e) { console.error('notify-owner', e); }
  return json({ ok: true });
};
