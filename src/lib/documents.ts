// Documents imprimables partagés entre l'espace vendeur et l'espace client.
import { SHOP } from '../config';
import { formatPrice } from './format';
import { Order } from '../types';

export const orderNumber = (o: Pick<Order, 'id'>) => o.id.replace(/^demo-/, '').slice(0, 8).toUpperCase();

/** Facture numérotée (numérotation continue attribuée par la base de données). */
export function printInvoice(o: Order) {
  const esc = (v: unknown) => String(v ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
  const euro = (c: number) => formatPrice(c);
  const a = o.shipping_address ?? {};
  const year = new Date(o.created_at).getFullYear();
  const number = o.invoice_number ? `${year}-${String(o.invoice_number).padStart(5, '0')}` : orderNumber(o);
  const rows = (o.order_items ?? []).map((i) => `<tr><td>${esc(i.name)}</td><td class="r">${i.quantity}</td><td class="r">${euro(i.unit_price_cents)}</td><td class="r">${euro(i.unit_price_cents * i.quantity)}</td></tr>`).join('');
  const w = window.open('', '_blank', 'width=820,height=1000');
  if (!w) return;
  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Facture ${number}</title>
  <style>body{font-family:Arial,sans-serif;color:#222;margin:40px;font-size:13px}h1{font-family:Georgia,serif;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:24px}
  th,td{border-bottom:1px solid #ddd;padding:9px;text-align:left}.r{text-align:right}.grid{display:flex;justify-content:space-between;gap:40px;margin-top:28px}
  .tot td{border:none;padding:5px 9px}.muted{color:#666}.big{font-size:15px;font-weight:bold}</style></head><body>
  <div class="grid" style="margin-top:0"><div><h1>${esc(SHOP.name)}</h1><p class="muted">${esc(SHOP.legalName)} — ${esc(SHOP.legalForm)}<br>${esc(SHOP.address)}<br>SIRET ${esc(SHOP.siret)}</p></div>
  <div style="text-align:right"><h2 style="margin:0">FACTURE</h2><p>N° <strong>${number}</strong><br>Date : ${new Date(o.created_at).toLocaleDateString('fr-FR')}<br>Commande #${orderNumber(o)}</p></div></div>
  <div class="grid"><div><strong>Client</strong><br>${esc(o.customer_name ?? o.shipping_name)}<br>${esc(o.email)}</div>
  <div><strong>Livraison</strong><br>${esc(o.shipping_name)}<br>${esc(a.line1)}${a.line2 ? `<br>${esc(a.line2)}` : ''}<br>${esc(a.postal_code)} ${esc(a.city)} ${esc(a.country)}</div></div>
  <table><thead><tr><th>Désignation</th><th class="r">Qté</th><th class="r">Prix unitaire TTC</th><th class="r">Total TTC</th></tr></thead><tbody>${rows}</tbody></table>
  <table class="tot" style="width:320px;margin-left:auto;margin-top:12px">
  <tr><td>Sous-total</td><td class="r">${euro(o.subtotal_cents)}</td></tr>
  ${o.discount_cents ? `<tr><td>Remise${o.promo_code ? ` (${esc(o.promo_code)})` : ''}</td><td class="r">−${euro(o.discount_cents)}</td></tr>` : ''}
  <tr><td>${esc(o.shipping_method ?? 'Livraison')}</td><td class="r">${euro(o.shipping_cents)}</td></tr>
  <tr class="big"><td>Total TTC payé</td><td class="r">${euro(o.total_cents)}</td></tr>
  ${o.refunded_cents ? `<tr><td>Remboursé</td><td class="r">−${euro(o.refunded_cents)}</td></tr>` : ''}</table>
  <p style="margin-top:28px">Payée par carte le ${new Date(o.created_at).toLocaleDateString('fr-FR')} (Stripe).</p>
  <p class="muted">${esc(SHOP.vat)}</p>
  </body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}
