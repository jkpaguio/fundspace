import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      includeAssets: [
        'favicon.svg',
        'fundspace-icon.svg',
        'fundspace-logo-dark.svg',
        'fundspace-logo-light.svg',
      ],
      manifest: {
        name: 'FundSpace',
        short_name: 'FundSpace',
        description: 'Offline-first finance workspace for personal, family, and business money.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ecf1f0',
        theme_color: '#0c7a6a',
        icons: [
          {
            src: '/fundspace-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      registerType: 'autoUpdate',
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,ico,txt}'],
      },
    }),
  ],
})
