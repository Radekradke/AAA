import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // App instalável e offline (mesa de RPG costuma ter sinal ruim).
    // O service worker guarda o app inteiro; as fichas já vivem no IndexedDB.
    VitePWA({
      // atualização só quando o jogador aceitar (nunca recarrega no meio do combate)
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Ficha Viva AAA',
        short_name: 'Ficha Viva',
        description: 'Crie, desperte e jogue suas fichas de D&D 5e com experiência cinematográfica.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#06080c',
        theme_color: '#06080c',
        categories: ['games', 'entertainment'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // código do app (inclui o chunk dos dados 3D) + ícones
        globPatterns: ['**/*.{js,css,html,svg,woff2,webp}', 'icons/*.png'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // retratos dos heróis: guardados na primeira vez que aparecem
            urlPattern: ({ url, sameOrigin }) => sameOrigin && /\/assets\/.*\.(png|jpe?g|webp)$/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'fv-imagens', expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 60 } },
          },
          {
            // trilha sonora: baixa só a faixa que tocar e guarda para jogar offline
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/music/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'fv-musica',
              rangeRequests: true,
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
          // fontes vêm embutidas no build (@fontsource) e entram no precache (woff2)
          // vídeos de fundo (MBs) e Supabase ficam fora do cache de propósito
        ],
      },
      // o SW não roda no `vite dev` (evita cache confuso durante o desenvolvimento)
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
