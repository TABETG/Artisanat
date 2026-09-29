import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Sur Netlify, URL = adresse du site : l'image de partage devient une adresse complète
const siteUrl = process.env.URL ?? '';
const absoluteOgImage = { name: 'image-partage-absolue', transformIndexHtml: (html: string) => (siteUrl ? html.replace('content="/og-image.jpg"', `content="${siteUrl}/og-image.jpg"`) : html) };

export default defineConfig({
  plugins: [react(), tailwindcss(), absoluteOgImage],
  server: { host: '0.0.0.0', port: 5173 },
});
