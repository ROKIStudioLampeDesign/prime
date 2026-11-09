import { expect, expectNoHorizontalScroll, test } from './fixtures';

test('a restaurant meal is logged as calories and macros, without a product', async ({ page }) => {
  await page.goto('/nutrition/add?slot=dinner');
  await page.getByRole('button', { name: /Ajout rapide/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Ajout rapide' });
  await sheet.getByLabel('Nom').fill('Resto italien');

  // Calories are required.
  await sheet.getByRole('button', { name: 'Ajouter' }).click();
  await expect(sheet.getByText('Indique au moins les calories')).toBeVisible();

  await sheet.getByLabel('Calories').fill('850');
  await sheet.getByLabel(/Protéines/).fill('42,5');
  await expectNoHorizontalScroll(page);
  await sheet.getByRole('button', { name: 'Ajouter' }).click();

  // Back on the diary: the entry counts in the day's totals.
  await expect(page.getByRole('heading', { level: 1, name: 'Alimentation' })).toBeVisible();
  const entry = page.getByRole('button', { name: /Resto italien/ });
  await expect(entry).toContainText('Ajout rapide');
  await expect(entry).toContainText('850');

  // Editing it opens the same sheet.
  await entry.click();
  const edit = page.getByRole('dialog', { name: 'Ajout rapide' });
  await expect(edit.getByLabel('Calories')).toHaveValue('850');
  await edit.getByLabel('Calories').fill('900');
  await edit.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByRole('button', { name: /Resto italien/ })).toContainText('900');
});
