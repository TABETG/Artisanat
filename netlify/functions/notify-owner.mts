// Email au propriétaire lors d'une nouvelle demande sur mesure.
// N'envoie rien si aucune demande n'a été créée dans les 2 dernières minutes (évite les abus).
import { json, serviceClient } from '../shared/admin';
import { absoluteUrl, layout, sendEmails } from '../shared/email';
import { FEATURES } from '../../src/features';

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);
  const to = process.env.OWNER_EMAIL;
  if (!to || !process.env.RESEND_API_KEY) return json({ ok: true });
  const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  let body: { kind?: string } = {};
  try { body = await req.json(); } catch { /* ignoré */ }
  if (body.kind === 'catalog') {
    const { data: c } = await serviceClient().from('catalog_requests').select('name,city,postal_code').gte('created_at', since).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (!c) return json({ ok: true });
    const lines = [`${c.name} (${c.postal_code} ${c.city}) demande le catalogue papier.`];
    try {
      await sendEmails([{ to, subject: 'Demande de catalogue papier', text: lines.join('\n'), html: layout('Demande de catalogue', lines, { label: 'Voir les demandes', url: absoluteUrl('/admin/catalogues') }) }],
        process.env.EMAIL_FROM ?? 'Boutique <onboarding@resend.dev>');
    } catch (e) { console.error('notify-owner catalog', e); }
    return json({ ok: true });
  }
  if (body.kind === 'seller') {
    const { data: sl } = await serviceClient().from('sellers').select('shop_name,craft,city').gte('created_at', since).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (!sl) return json({ ok: true });
    const lines = [`${sl.shop_name} (${sl.craft}, ${sl.city}) souhaite vendre sur la boutique.`];
    try {
      await sendEmails([{ to, subject: `Candidature artisan : ${sl.shop_name}`, text: lines.join('\n'), html: layout('Nouvelle candidature artisan', lines, { label: 'Examiner la candidature', url: absoluteUrl('/admin/artisans') }) }],
        process.env.EMAIL_FROM ?? 'Boutique <onboarding@resend.dev>');
    } catch (e) { console.error('notify-owner seller', e); }
    return json({ ok: true });
  }
  if (body.kind === 'contact') {
    const { data: m } = await serviceClient().from('contact_messages').select('name,email,subject,message')
      .gte('created_at', since).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (!m) return json({ ok: true });
    const lines = [`${m.name} (${m.email}) vous écrit${m.subject ? ` : ${m.subject}` : ''}.`, m.message];
    try {
      await sendEmails([{ to, subject: `Message de ${m.name}`, text: lines.join('\n\n'), html: layout('Nouveau message', lines, { label: 'Répondre', url: absoluteUrl('/admin/messages') }) }],
        process.env.EMAIL_FROM ?? 'Boutique <onboarding@resend.dev>');
    } catch (e) { console.error('notify-owner contact', e); }
    return json({ ok: true });
  }
  if (!FEATURES.customOrdersEnabled) return json({ ok: true }); // sur-mesure désactivé : aucune notification
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
