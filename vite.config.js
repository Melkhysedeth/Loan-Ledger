import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      workbox: {
        // FIX: navigateFallback en null evita que el SW redirija siempre a /
        // En su lugar usamos navigationPreload + NetworkFirst para rutas HTML
        navigateFallback: null,

        // FIX: RuntimeCaching con NetworkFirst para navegación:
        // intenta red primero, si falla (offline) sirve el cache.
        // Esto preserva la URL real en vez de forzar /
        runtimeCaching: [
          {
            // Todas las peticiones de navegación (páginas)
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-cache',
              networkTimeoutSeconds: 3,
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // JS, CSS, fuentes y otros assets estáticos
            urlPattern: /\.(?:js|css|woff2?|png|svg|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 días
              },
            },
          },
        ],

        skipWaiting: false,
        clientsClaim: false,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      manifest: {
        name: 'Loan Ledger',
        short_name: 'LoanLedger',
        description: 'Gestión de préstamos',
        theme_color: '#1d4ed8',
        background_color: '#030712',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
  ],
})