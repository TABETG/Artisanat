// /robots.txt : autorise l'indexation de la boutique, pas de l'espace vendeur.
export default async (req: Request) => {
  const origin = process.env.URL ?? new URL(req.url).origin;
  return new Response(`User-agent: *\nDisallow: /admin\nSitemap: ${origin}/sitemap.xml\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' },
  });
};
