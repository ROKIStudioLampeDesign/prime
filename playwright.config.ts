import { defineConfig } from '@playwright/test';

/**
 * End-to-end tests against the production build (service worker included), at iPhone width.
 * Locally they drive the installed Microsoft Edge (no browser download); set PW_CHANNEL to use
 * another installed browser, or PW_CHANNEL=chromium after `npx playwright install chromium`.
 */
const PORT = 4173;

export default defineConfig({
  testDir: 'e2e',
  // One IndexedDB per test context; serial keeps the single preview server predictable.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: process.env.PW_CHANNEL ?? 'msedge',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    colorScheme: 'dark',
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
