import { expect, test as base, type Page } from '@playwright/test';

/**
 * `page` fails the test on any uncaught error or console error, so silent UI breakage can't pass.
 * Expected network noise (e.g. aborted requests in offline tests) can be allowed per test.
 */
export const test = base.extend<{ allowedConsoleErrors: RegExp[] }>({
  allowedConsoleErrors: [[], { option: true }],
  page: async ({ page, allowedConsoleErrors }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error' && !allowedConsoleErrors.some((re) => re.test(m.text()))) {
        errors.push(`console: ${m.text()}`);
      }
    });
    await use(page);
    expect(errors, 'browser errors').toEqual([]);
  },
});

export { expect };

/** Asserts the page doesn't scroll horizontally (a 390 px layout bug). */
export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, 'horizontal overflow (px)').toBeLessThanOrEqual(0);
}

/** Waits until the service worker controls the page (precache done, offline-ready). */
export async function waitForServiceWorker(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }),
      );
    }
  });
}
