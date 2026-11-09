import { expect, expectNoHorizontalScroll, test } from './fixtures';

test('a day whose macros were not counted is marked in the diary and on the calendar', async ({ page }) => {
  await page.goto('/nutrition');
  await page.getByRole('button', { name: 'Macros pas comptées ?' }).click();
  const sheet = page.getByRole('dialog', { name: 'Macros pas comptées' });
  await sheet.getByRole('button', { name: 'Sous l’objectif' }).click();
  await expect(sheet).toHaveCount(0);

  const mark = page.getByRole('region', { name: 'Macros pas comptées' });
  await expect(mark).toContainText('série calories gardée');
  await expectNoHorizontalScroll(page);

  // No workout that day: the calendar shows a jour rouge, under the goal.
  await page.goto('/gym');
  await expect(page.locator('[aria-current="date"]')).toHaveAttribute(
    'aria-label',
    /jour rouge, sous l’objectif calories$/,
  );

  // Switching to "over" goes through cancelling the mark.
  await page.goto('/nutrition');
  await mark.getByRole('button', { name: 'Annuler' }).click();
  await page.getByRole('button', { name: 'Macros pas comptées ?' }).click();
  await page.getByRole('button', { name: 'Objectif dépassé' }).click();
  await expect(mark).toContainText('série calories cassée');
});
