import { expect, test } from './fixtures';

test('create a product, log it in the diary and see the totals', async ({ page }) => {
  await page.goto('/nutrition/foods/new');
  await page.getByLabel('Nom', { exact: true }).fill('Avoine test');
  await page.getByLabel('Calories').fill('372');
  await page.getByLabel('Protéines').fill('13,5');
  await page.getByLabel('Glucides', { exact: true }).fill('58,7');
  await page.getByLabel('Lipides').fill('7');
  await page.getByRole('button', { name: 'Créer le produit' }).click();
  await expect(page).toHaveURL(/\/nutrition\/foods$/);

  await page.goto('/nutrition/add');
  await page.getByRole('button', { name: /Avoine test/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Avoine test' });
  await sheet.getByLabel('Quantité en grammes').fill('50');
  await expect(sheet.getByText('186', { exact: true })).toBeVisible(); // live preview: 372 × 0,5
  await sheet.getByRole('button', { name: 'Ajouter', exact: true }).click();

  await expect(page).toHaveURL(/\/nutrition$/);
  await expect(page.getByRole('button', { name: /Avoine test/ })).toBeVisible();
  await expect(page.getByLabel('Totaux du jour').getByText('186', { exact: true })).toBeVisible();
});

test('log a workout set, see the rest timer and finish with a summary', async ({ page }) => {
  await page.goto('/gym');
  await page.getByRole('button', { name: 'Commencer une séance' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Séance libre' }).click();
  await expect(page).toHaveURL(/\/gym\/workout\/\d+$/);

  await page.getByRole('button', { name: 'Ajouter un exercice' }).click();
  await page.getByPlaceholder('Rechercher un exercice').fill('couché (barre)');
  await page.getByRole('button', { name: /^Développé couché \(barre\)/ }).click();

  const bench = page.getByRole('region', { name: 'Développé couché (barre)' });
  await bench.getByLabel('Poids en kg, série 1').fill('60');
  await bench.getByLabel('Répétitions, série 1').fill('8');
  await bench.getByRole('button', { name: 'Valider la série 1' }).click();
  await expect(page.getByRole('timer')).toContainText('Repos');

  // A reload must not lose the session (the database is the draft).
  await page.reload();
  await expect(bench.getByLabel('Poids en kg, série 1')).toHaveValue('60');
  await expect(bench.getByRole('button', { name: 'Annuler la validation, série 1' })).toBeVisible();

  await page.getByRole('button', { name: 'Terminer' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Terminer' }).click();
  await expect(page).toHaveURL(/\/summary$/);
  await expect(page.getByText('480 kg')).toBeVisible(); // 60 kg × 8
});
