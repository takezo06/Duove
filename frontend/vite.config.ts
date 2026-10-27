import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    // Makes Duove installable. The service worker keeps only the app's own files (code, styles, icons)
    // so it opens offline; API responses are never stored here (letters go through lib/cache.ts).
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['tab-icon.svg', 'duove-logo.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Duove',
        short_name: 'Duove',
        description: 'A shared journal for two.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0a0a0a', // neutral-950, the page background
        theme_color: '#0a0a0a',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Every route is the SPA, as in vercel.json
        navigateFallback: '/index.html',
      },
    }),
  ],
    build: {
    cssMinify: false,   // temporarily disable CSS minification
  },
  server: {
    allowedHosts: true // Allows localtunnel and VS Code dev tunnels to bypass host checks
  }
})
