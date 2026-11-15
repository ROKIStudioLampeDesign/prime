/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt': a new version waits for the user (UpdatePrompt) instead of reloading mid-workout.
      registerType: 'prompt',
      pwaAssets: { config: true },
      manifest: {
        id: '/',
        name: 'Prime',
        short_name: 'Prime',
        description: 'Suivi de la salle, de l’alimentation et du corps, hors connexion.',
        categories: ['health', 'fitness', 'lifestyle'],
        dir: 'ltr',
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#020106',
        background_color: '#020106',
      },
      workbox: {
        // The manifest is added by the plugin itself; globbing it too creates a conflicting precache entry.
        // wasm: the barcode decoder, so scanning works offline too.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,wasm}'],
        navigateFallback: '/index.html',
        // Control the page on first install (offline-ready right away). Updates still wait for
        // the user's "Mettre à jour" because skipWaiting stays off in prompt mode.
        clientsClaim: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    rolldownOptions: {
      output: {
        // Vendor code changes rarely: separate chunks stay cached across app updates.
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              test: /[\\/]node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/,
            },
            { name: 'vendor-data', test: /[\\/]node_modules[\\/](dexie|dexie-react-hooks|date-fns)[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    // Pure and DB tests run in node; component tests opt into jsdom with a
    // '@vitest-environment jsdom' docblock. End-to-end tests live in e2e/ (Playwright).
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
  },
});
