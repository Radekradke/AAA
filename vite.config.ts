import { defineConfig, loadEnv } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

/**
 * Abre a conexão (DNS + TLS) com o Supabase enquanto o JS ainda baixa: o
 * primeiro pedido de login/sessão não paga o aperto de mão. Só entra no HTML
 * quando o projeto tem nuvem configurada.
 */
function preconnectSupabase(): Plugin {
  let origin: string | null = null;
  return {
    name: 'fv-preconnect-supabase',
    configResolved(cfg) {
      const url = loadEnv(cfg.mode, cfg.envDir || process.cwd(), 'VITE_').VITE_SUPABASE_URL;
      try {
        origin = url ? new URL(url).origin : null;
      } catch {
        origin = null;
      }
    },
    transformIndexHtml() {
      if (!origin) return [];
      return [{ tag: 'link', attrs: { rel: 'preconnect', href: origin, crossorigin: '' }, injectTo: 'head' }];
    },
  };
}

/** Versão do build para os relatórios de erro: commit na Vercel/CI, senão a data. */
const APP_VERSION = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || '').slice(0, 7) || new Date().toISOString().slice(0, 10);

// https://vitejs.dev/config/
export default defineConfig({
  define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(APP_VERSION) },
  plugins: [
    react(),
    preconnectSupabase(),
    // App instalável e offline (mesa de RPG costuma ter sinal ruim).
    // O service worker guarda o app inteiro; as fichas já vivem no IndexedDB.
    VitePWA({
      // atualização só quando o jogador aceitar (nunca recarrega no meio do combate)
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        // identidade fixa do app instalado (não muda se o start_url mudar)
        id: '/',
        name: 'Ficha Viva AAA',
        short_name: 'Ficha Viva',
        description: 'Crie, desperte e jogue suas fichas de D&D 5e com experiência cinematográfica.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'any',
        // abrir de novo (atalho, link) reaproveita a janela do app em vez de abrir outra
        launch_handler: { client_mode: ['navigate-existing', 'auto'] },
        background_color: '#06080c',
        theme_color: '#06080c',
        categories: ['games', 'entertainment'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // segurar o ícone do app instalado (Android/Windows): atalhos direto para o que importa
        shortcuts: [
          { name: 'Continuar a última ficha', short_name: 'Continuar', url: '/continuar', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Meus heróis', short_name: 'Heróis', url: '/personagens', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Mesas', short_name: 'Mesas', url: '/mesas', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Nova ficha', short_name: 'Nova ficha', url: '/criar', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
        ],
        // tela de instalação mais rica no Android/Chrome (fora do precache: só baixa quem for instalar)
        screenshots: [
          { src: '/screenshots/ficha-celular.webp', sizes: '780x1688', type: 'image/webp', form_factor: 'narrow', label: 'A ficha na mesa: vida, defesa e rolagens' },
          { src: '/screenshots/carta-celular.webp', sizes: '780x1688', type: 'image/webp', form_factor: 'narrow', label: 'A carta do herói, com título e selos' },
          { src: '/screenshots/ficha-pc.webp', sizes: '1280x720', type: 'image/webp', form_factor: 'wide', label: 'O retrato do herói no computador' },
        ],
      },
      workbox: {
        // precache = só a casca do app (código, estilos, ícones, texturas dos dados).
        // Fontes e artes entram no cache na primeira vez que aparecem (runtime):
        // a instalação baixa ~2,5 MB em vez de ~7,5 MB de fontes de temas que a
        // pessoa talvez nunca abra.
        globPatterns: ['**/*.{js,css,html,svg}', 'icons/*.png', 'dice/textures/*.webp'],
        // texturas dos dados conquistados: só quem ganhou baixa (runtime, abaixo)
        globIgnores: ['dice/textures/{skulls,dragon,dragon-bump,ice,stainedglass,stainedglass-bump,tiger,water,wood}.webp'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // fontes do tema em uso (arquivos com hash: nunca mudam)
            urlPattern: ({ url, sameOrigin }) => sameOrigin && /^\/static\/.*\.woff2$/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'fv-fontes', expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            // artes de classe (build) e retratos padrão (public): guardados na primeira vez que aparecem
            urlPattern: ({ url, sameOrigin }) => sameOrigin && /^\/(static|assets)\/.*\.(png|jpe?g|webp)$/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'fv-imagens', expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 60 } },
          },
          {
            // texturas dos dados conquistados (a do tema já vem no precache)
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/dice/textures/'),
            handler: 'CacheFirst',
            options: { cacheName: 'fv-dados', expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            // efeitos sonoros gravados (Kenney, CC0): baixam no primeiro toque
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/sfx/'),
            handler: 'CacheFirst',
            options: { cacheName: 'fv-sons', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
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
          // vídeos de fundo (MBs) e Supabase ficam fora do cache de propósito
        ],
      },
      // o SW não roda no `vite dev` (evita cache confuso durante o desenvolvimento)
      devOptions: { enabled: false },
    }),
  ],
  build: {
    // arquivos com hash ficam em /static (cache imutável de 1 ano no vercel.json),
    // separados de public/assets (nomes fixos, que podem mudar de conteúdo)
    assetsDir: 'static',
    rollupOptions: {
      output: {
        // bibliotecas mudam pouco: em pacotes próprios, continuam no cache do
        // navegador quando só o código do app muda (atualizações frequentes)
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@supabase')) return 'vendor-supabase';
          // framer-motion fica fora: o núcleo (m + LazyMotion) vai com o app e os
          // recursos de animação (domMax) viram um pedaço próprio, carregado depois
          if (/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom|@remix-run)\//.test(id)) return 'vendor-react';
          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
