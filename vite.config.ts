import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Sur Netlify, URL = adresse du site : l'image de partage devient une adresse complète
const siteUrl = process.env.URL ?? '';
const absoluteOgImage = { name: 'image-partage-absolue', transformIndexHtml: (html: string) => (siteUrl ? html.replace('content="/og-image.jpg"', `content="${siteUrl}/og-image.jpg"`) : html) };

/**
 * Garde-fous de construction :
 *  • en production Netlify, refuse de construire sans Supabase (sinon le site partirait en mode démonstration
 *    sans que personne ne s'en aperçoive) — contournement volontaire : ALLOW_DEMO_BUILD=1 ;
 *  • partout, refuse une clé secrète placée dans une variable VITE_ (ces variables sont lisibles par tous les visiteurs).
 */
function productionGuard(mode: string): Plugin {
  return {
    name: 'garde-fous-production',
    apply: 'build',
    configResolved() {
      const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith('VITE_'))) };
      const leaks = Object.entries(env).filter(([k, v]) =>
        /SECRET|SERVICE_ROLE|PRIVATE|RESEND|WEBHOOK/i.test(k) || /^(sk|rk)_(live|test)_|^whsec_|^re_[A-Za-z0-9]{8,}/.test(String(v ?? '')));
      if (leaks.length) {
        throw new Error(`Clé secrète dans une variable publique : ${leaks.map(([k]) => k).join(', ')}. Renommez-la sans le préfixe VITE_ (elle ne doit être lue que par les fonctions serveur).`);
      }
      const isNetlifyProduction = process.env.NETLIFY === 'true' && process.env.CONTEXT === 'production';
      if (isNetlifyProduction && process.env.ALLOW_DEMO_BUILD !== '1' && (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY)) {
        throw new Error('VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY manquent : la boutique démarrerait en mode démonstration. Renseignez-les dans Netlify (Site configuration → Environment variables) ou définissez ALLOW_DEMO_BUILD=1 pour une démonstration volontaire.');
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), absoluteOgImage, productionGuard(mode)],
  server: { host: '0.0.0.0', port: 5173 },
}));
