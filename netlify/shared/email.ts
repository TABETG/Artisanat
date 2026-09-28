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
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#F2ECE2;font-family:Arial,sans-serif;color:#231C17">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:6px" cellpadding="0" cellspacing="0">
    <tr><td style="background:#1B2440;color:#F2ECE2;padding:18px 24px;font-family:Georgia,serif;font-size:22px;border-radius:6px 6px 0 0">${escapeHtml(SHOP.name)}</td></tr>
    ${image ? `<tr><td><img src="${image}" alt="" width="560" style="width:100%;height:auto;display:block"></td></tr>` : ''}
    <tr><td style="padding:24px">
      <h1 style="font-family:Georgia,serif;font-size:24px;color:#1B2440;margin:0 0 16px">${escapeHtml(title)}</h1>
      ${paragraphs.map((p) => `<p style="font-size:16px;line-height:1.6;margin:0 0 14px">${escapeHtml(p)}</p>`).join('')}
      ${button ? `<p style="margin:24px 0 8px"><a href="${button.url}" style="background:#A3302A;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:4px;display:inline-block;font-size:16px">${escapeHtml(button.label)}</a></p>` : ''}
    </td></tr>
    <tr><td style="padding:16px 24px;border-top:1px solid #eee;font-size:13px;color:#777">${escapeHtml(SHOP.name)} — tissé à la main depuis ${SHOP.since} · ${escapeHtml(SHOP.email)}</td></tr>
  </table></td></tr></table></body></html>`;
}

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${process.env.URL ?? ''}${path}`;
}
