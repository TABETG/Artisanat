// Plan du site pour Google : /sitemap.xml
import { createClient } from '@supabase/supabase-js';

export default async (req: Request) => {
  const origin = process.env.URL ?? new URL(req.url).origin;
  const supabase = createClient(process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data } = await supabase.from('products').select('id,updated_at').eq('active', true).limit(5000);
  const pages = ['/', '/boutique', '/notre-histoire', '/livraison-et-retours', '/questions-frequentes', '/contact'];
  const urls = [
    ...pages.map((p) => `<url><loc>${origin}${p}</loc></url>`),
    ...(data ?? []).map((p) => `<url><loc>${origin}/produit/${p.id}</loc><lastmod>${String(p.updated_at).slice(0, 10)}</lastmod></url>`),
  ];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
};
