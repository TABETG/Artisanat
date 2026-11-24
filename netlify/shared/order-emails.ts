// Emails envoyés au client quand l'administrateur annule ou rembourse une commande.
// Fonctions pures (aucun envoi ici) : faciles à relire et à tester.
import type { Email } from './email';

export interface OrderForEmail { id: string; email: string; shipping_name: string | null }
export interface MailTools { layout: (title: string, paragraphs: string[], button?: { label: string; url: string }) => string; url: (path: string) => string; shopName: string }

export const orderNumber = (id: string) => id.replace(/^demo-/, '').slice(0, 8).toUpperCase();
const euro = (c: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(c / 100).replace(/ | /g, ' ');
const hello = (name: string | null) => `Bonjour ${name ?? ''},`.replace(' ,', ',');

/** Commande annulée par la boutique (pièce indisponible, demande du client…). */
export function cancelledEmail(o: OrderForEmail, mail: MailTools): Email {
  const n = orderNumber(o.id);
  const lines = [
    hello(o.shipping_name),
    `Votre commande n° ${n} a été annulée.`,
    'Le montant payé vous sera intégralement remboursé sur la carte utilisée, au plus tard sous 14 jours. Vous recevrez un email dès que le remboursement sera effectué.',
    'Pour toute question, il vous suffit de répondre à cet email.',
  ];
  return {
    to: o.email, subject: `Commande n° ${n} annulée`,
    text: `${lines.join('\n\n')}\n\n${mail.shopName}`,
    html: mail.layout('Votre commande a été annulée', lines, { label: 'Nous contacter', url: mail.url('/contact') }),
  };
}

/** Remboursement total ou partiel effectué. */
export function refundEmail(o: OrderForEmail, r: { amountCents: number; shippingCents: number; full: boolean }, mail: MailTools): Email {
  const n = orderNumber(o.id);
  const lines = [
    hello(o.shipping_name),
    r.full
      ? `Nous avons remboursé votre commande n° ${n} : ${euro(r.amountCents)}.`
      : `Nous avons effectué un remboursement partiel de ${euro(r.amountCents)} sur votre commande n° ${n}.`,
    ...(r.shippingCents > 0 ? [`Ce montant comprend ${euro(r.shippingCents)} de frais de livraison.`] : []),
    'L’argent est reversé sur la carte utilisée pour le paiement. Selon votre banque, il apparaît sur votre compte sous 5 à 10 jours ouvrés.',
    'Pour toute question, il vous suffit de répondre à cet email.',
  ];
  return {
    to: o.email, subject: `Remboursement de ${euro(r.amountCents)} — commande n° ${n}`,
    text: `${lines.join('\n\n')}\n\n${mail.shopName}`,
    html: mail.layout('Votre remboursement est effectué', lines),
  };
}
