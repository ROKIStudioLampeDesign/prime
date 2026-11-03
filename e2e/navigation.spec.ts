import { expect, expectNoHorizontalScroll, test } from './fixtures';

const SCREENS = [
  { path: '/', title: "Aujourd'hui" },
  { path: '/nutrition', title: 'Alimentation' },
  { path: '/nutrition/foods', title: 'Alimentation' },
  { path: '/nutrition/meals', title: 'Alimentation' },
  { path: '/gym', title: 'Salle' },
  { path: '/gym/history', title: 'Salle' },
  { path: '/gym/templates', title: 'Salle' },
  { path: '/gym/exercises', title: 'Salle' },
  { path: '/body', title: 'Corps' },
  { path: '/stats', title: 'Stats' },
  { path: '/stats/week', title: 'Stats' },
  { path: '/settings', title: 'Réglages' },
];

for (const { path, title } of SCREENS) {
  test(`${path} renders at 390 px without horizontal scroll`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
}

test('the tab bar navigates between sections', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Navigation principale' });
  for (const [tab, title] of [
    ['Alimentation', 'Alimentation'],
    ['Salle', 'Salle'],
    ['Corps', 'Corps'],
    ['Stats', 'Stats'],
    ["Aujourd'hui", "Aujourd'hui"],
  ] as const) {
    await nav.getByRole('link', { name: tab }).click();
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(nav.getByRole('link', { name: tab })).toHaveAttribute('aria-current', 'page');
  }
});
