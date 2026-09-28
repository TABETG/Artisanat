// Quand un lien produit est partagé (WhatsApp, Facebook, Messenger, SMS…),
// l'aperçu affiche la photo, le nom et le prix du produit au lieu de l'image générique.
// Exécuté par Netlify avant l'envoi de la page ; sans effet sur la navigation normale.

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export default async (request: Request, context: { next: () => Promise<Response> }) => {
  const response = await context.next();
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/produit\/([0-9a-f-]{36})\/?$/i);
  const env = (globalThis as unknown as { Netlify?: { env: { get: (k: string) => string | undefined } } }).Netlify?.env;
  const base = env?.get('VITE_SUPABASE_URL');
  const key = env?.get('VITE_SUPABASE_ANON_KEY');
  if (!match || !base || !key || !(response.headers.get('content-type') ?? '').includes('text/html')) return response;

  try {
    const res = await fetch(`${base}/rest/v1/products?id=eq.${match[1]}&active=eq.true&select=name,description,price_cents,images`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const [product] = (await res.json()) as { name: string; description: string; price_cents: number; images: string[] }[];
    if (!product) return response;

    const price = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(product.price_cents / 100);
    const title = esc(`${product.name} — ${price}`);
    const description = esc((product.description || 'Pièce tissée à la main.').slice(0, 180));
    const image = product.images?.[0] ? esc(new URL(product.images[0], url.origin).href) : `${url.origin}/og-image.jpg`;
    const tags = `<meta property="og:type" content="product" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:url" content="${esc(url.href)}" />
    <meta property="product:price:amount" content="${(product.price_cents / 100).toFixed(2)}" />
    <meta property="product:price:currency" content="EUR" />
    <meta name="description" content="${description}" />`;

    let html = await response.text();
    html = html
      .replace(/<meta property="og:[^>]*>\s*/g, '')
      .replace(/<meta name="description"[^>]*>\s*/, '')
      .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
      .replace('</head>', `${tags}\n  </head>`);
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    return new Response(html, { status: response.status, headers });
  } catch {
    return response;
  }
};

export const config = { path: '/produit/*' };
