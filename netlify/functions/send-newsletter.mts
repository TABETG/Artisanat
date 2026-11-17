// Envoi d'une lettre d'information aux inscrits (ou d'un test à l'adresse du vendeur).
import { json, requireAdmin, serviceClient } from '../shared/admin';
import { absoluteUrl, canEmailCustomers, sendEmails } from '../shared/email';
import { unsubscribeToken } from '../shared/newsletter';
import { SHOP } from '../../src/config';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const euro = (c: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(c / 100);

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);
  const denied = await requireAdmin(req);
  if (denied) return denied;
  if (!canEmailCustomers()) return json({ error: 'Configurez d’abord l’envoi d’emails (Resend, étape 4 bis du guide).' }, 400);

  let b: { subject?: string; message?: string; productIds?: string[]; test?: boolean };
  try { b = await req.json(); } catch { return json({ error: 'Requête invalide' }, 400); }
  const subject = String(b.subject ?? '').trim().slice(0, 150);
  const message = String(b.message ?? '').trim().slice(0, 5000);
  if (!subject || !message) return json({ error: 'Objet et message obligatoires.' }, 400);

  const supabase = serviceClient();
  const ids = (b.productIds ?? []).slice(0, 6);
  const { data: products } = ids.length
    ? await supabase.from('products').select('id,name,price_cents,images').in('id', ids).eq('active', true)
    : { data: [] as { id: string; name: string; price_cents: number; images: string[] }[] };

  const productsHtml = (products ?? []).map((p) => `
    <td width="50%" style="padding:8px;vertical-align:top">
      <a href="${absoluteUrl(`/produit/${p.id}`)}" style="text-decoration:none;color:#231C17">
        ${p.images?.[0] ? `<img src="${absoluteUrl(p.images[0])}" alt="" width="250" style="width:100%;height:auto;border-radius:4px;display:block">` : ''}
        <p style="font-family:Georgia,serif;font-size:16px;margin:8px 0 2px">${esc(p.name)}</p>
        <p style="margin:0;color:#A3302A">${euro(p.price_cents)}</p>
      </a>
    </td>`);
  const rows: string[] = [];
  for (let i = 0; i < productsHtml.length; i += 2) rows.push(`<tr>${productsHtml[i]}${productsHtml[i + 1] ?? '<td></td>'}</tr>`);

  const html = (unsubscribe: string) => `<!doctype html><html lang="fr"><body style="margin:0;background:#F2ECE2;font-family:Arial,sans-serif;color:#231C17">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" style="max-width:600px;background:#fff;border-radius:6px" cellpadding="0" cellspacing="0">
    <tr><td style="background:#1B2440;color:#F2ECE2;padding:18px 24px;font-family:Georgia,serif;font-size:22px;border-radius:6px 6px 0 0">${esc(SHOP.name)}</td></tr>
    <tr><td style="padding:24px">
      <h1 style="font-family:Georgia,serif;font-size:24px;color:#1B2440;margin:0 0 16px">${esc(subject)}</h1>
      ${message.split(/\n\s*\n/).map((p) => `<p style="font-size:16px;line-height:1.6;margin:0 0 14px">${esc(p).replace(/\n/g, '<br>')}</p>`).join('')}
      ${rows.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px">${rows.join('')}</table>` : ''}
      <p style="margin:24px 0 8px"><a href="${absoluteUrl('/boutique')}" style="background:#A3302A;color:#fff;text-decoration:none;padding:14px 24px;border-radius:4px;display:inline-block">Voir la boutique</a></p>
    </td></tr>
    <tr><td style="padding:16px 24px;border-top:1px solid #eee;font-size:12px;color:#888">
      Vous recevez cet email car vous êtes inscrit(e) aux nouvelles de ${esc(SHOP.name)}. <a href="${unsubscribe}" style="color:#888">Se désinscrire</a>
    </td></tr>
  </table></td></tr></table></body></html>`;

  const recipients = b.test
    ? [process.env.OWNER_EMAIL ?? SHOP.email]
    : ((await supabase.from('newsletter').select('email').limit(10000)).data ?? []).map((r) => r.email as string);
  if (!recipients.length) return json({ error: 'Aucun inscrit pour le moment.' }, 400);

  const emails = recipients.map((to) => {
    const link = absoluteUrl(`/desinscription?email=${encodeURIComponent(to)}&jeton=${unsubscribeToken(to)}`);
    return { to, subject: b.test ? `[Test] ${subject}` : subject, html: html(link), text: `${message}\n\n${absoluteUrl('/boutique')}\n\nSe désinscrire : ${link}` };
  });
  try {
    const sent = await sendEmails(emails);
    if (!b.test) await supabase.from('campaigns').insert({ subject, sent_count: sent });
    return json({ sent });
  } catch (e) {
    console.error('send-newsletter', e);
    return json({ error: 'L’envoi a échoué. Vérifiez la configuration Resend.' }, 502);
  }
};
