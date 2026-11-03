import { expect, test, waitForServiceWorker } from './fixtures';

// Every request that reaches the network is aborted, so failed fetches are expected noise.
test.use({ allowedConsoleErrors: [/Failed to load resource/, /net::ERR_FAILED/] });

test('the installed app works fully offline, including saving data', async ({ page, context }) => {
  await page.goto('/');
  await waitForServiceWorker(page);

  // From here on, only the service worker's cache can answer.
  await context.route('**/*', (route) => route.abort());

  for (const [path, title] of [
    ['/nutrition', 'Alimentation'],
    ['/gym', 'Salle'],
    ['/body', 'Corps'],
    ['/stats', 'Stats'], // lazy route: its chunk must be precached too
    ['/settings', 'Réglages'],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  }

  await page.goto('/stats');
  await page.getByLabel('Poids', { exact: true }).fill('80,4');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByRole('button', { name: 'Enregistré ✓' })).toBeVisible();
  await page.reload();
  await expect(page.getByText('80,4 kg').first()).toBeVisible();
});
