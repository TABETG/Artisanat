// Envoi d'emails via Resend (gratuit jusqu'à 3 000 emails / mois).
// Pour écrire aux CLIENTS, il faut un domaine vérifié dans Resend et EMAIL_FROM renseigné.
import { SHOP } from '../../src/config';

export interface Email { to: string; subject: string; html: string; text: string }

export function canEmailCustomers(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;
}

export async function sendEmails(emails: Email[], from = process.env.EMAIL_FROM): Promise<number> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !from || emails.length === 0) return 0;
  let sent = 0;
  for (let i = 0; i < emails.length; i += 100) {
    const chunk = emails.slice(i, i + 100).map((e) => ({ from, reply_to: SHOP.email, ...e, to: [e.to] }));
    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) throw new Error(`Resend ${res.status} : ${await res.text()}`);
    sent += chunk.length;
  }
  return sent;
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Gabarit sobre, lisible sur téléphone. */
export function layout(title: string, paragraphs: string[], button?: { label: string; url: string }, image?: string): string {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#FAF6EF;font-family:Arial,Helvetica,sans-serif;color:#242424">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #E8D9C5;border-radius:12px" cellpadding="0" cellspacing="0">
    <tr><td style="background:#1C203D;color:#FAF6EF;padding:20px 24px;border-radius:12px 12px 0 0"><div style="font-family:Georgia,serif;font-size:24px">${escapeHtml(SHOP.name)}</div><div style="color:#B88746;font-size:11px;letter-spacing:3px;margin-top:4px">by ${escapeHtml(SHOP.brand)}</div></td></tr>
    <tr><td style="height:4px;background:#B88746;font-size:0;line-height:0">&nbsp;</td></tr>
    ${image ? `<tr><td><img src="${image}" alt="" width="560" style="width:100%;height:auto;display:block"></td></tr>` : ''}
    <tr><td style="padding:24px">
      <h1 style="font-family:Georgia,serif;font-size:24px;font-weight:normal;color:#1C203D;margin:0 0 16px">${escapeHtml(title)}</h1>
      ${paragraphs.map((p) => `<p style="font-size:16px;line-height:1.6;margin:0 0 14px">${escapeHtml(p)}</p>`).join('')}
      ${button ? `<p style="margin:24px 0 8px"><a href="${button.url}" style="background:#1C203D;color:#FAF6EF;text-decoration:none;padding:14px 26px;border-radius:999px;display:inline-block;font-size:15px;font-weight:bold">${escapeHtml(button.label)}</a></p>` : ''}
    </td></tr>
    <tr><td style="padding:16px 24px;border-top:1px solid #E8D9C5;font-size:13px;color:#6A5646"><em style="font-family:Georgia,serif;color:#A64932">${escapeHtml(SHOP.slogan)}</em><br>${escapeHtml(SHOP.name)} ${escapeHtml(SHOP.signature)} — ${escapeHtml(SHOP.tagline)}${SHOP.email && !SHOP.email.includes('exemple.') ? ` · ${escapeHtml(SHOP.email)}` : ''}</td></tr>
  </table></td></tr></table></body></html>`;
}

/** Outils de mise en forme passés aux gabarits d'emails de commande. */
export const mailTools = () => ({ layout, url: absoluteUrl, shopName: SHOP.name });

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${process.env.URL ?? ''}${path}`;
}
