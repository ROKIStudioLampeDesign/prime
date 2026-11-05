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

  // The home screen sums the same day.
  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('link', { name: "Aujourd'hui" })
    .click();
  await expect(
    page.getByRole('link', { name: /Calories du jour/ }).getByText('186', { exact: true }),
  ).toBeVisible();
});

test('the home screen opens the workout start sheet in one tap', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Commencer une séance' }).click();
  await expect(page).toHaveURL(/\/gym\?start=1$/);
  const sheet = page.getByRole('dialog', { name: 'Commencer une séance' });
  await expect(sheet.getByRole('button', { name: 'Séance libre' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(/\/gym$/);
});

test('log a workout set, see the rest timer and finish with a summary', async ({ page }) => {
  await page.goto('/gym');
  await page.getByRole('button', { name: 'Commencer une séance' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Séance libre' }).click();
  await expect(page).toHaveURL(/\/gym\/workout\/\d+$/);

  await page.getByRole('button', { name: 'Ajouter un exercice' }).click();
  await page.getByPlaceholder('Rechercher un exercice').fill('bench');
  await page.getByRole('button', { name: /^Bench/ }).click();

  const bench = page.getByRole('region', { name: 'Bench' });
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

  // …and the home screen lists today's finished workout.
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Salle' }).getByText(/1 série · 480 kg/)).toBeVisible();
});

test('a template plans each set and learns from the session done with it', async ({ page }) => {
  await page.goto('/gym/templates/new');
  await page.getByLabel('Nom du modèle').fill('Push');
  await page.getByRole('button', { name: 'Ajouter un exercice' }).click();
  await page.getByPlaceholder('Rechercher un exercice').fill('bench');
  await page.getByRole('button', { name: /^Bench/ }).click();
  await page.getByLabel('Poids en kg, série 1, Bench').fill('60');
  await page.getByLabel('Répétitions, série 1, Bench').fill('8');
  await page.getByRole('button', { name: 'Créer le modèle' }).click();
  await expect(page).toHaveURL(/\/gym\/templates$/);

  await page.getByRole('link', { name: /Push/ }).click();
  await page.getByRole('button', { name: 'Commencer cette séance' }).click();
  const bench = page.getByRole('region', { name: 'Bench' });
  await expect(bench.getByLabel('Poids en kg, série 1')).toHaveValue('60');
  await bench.getByLabel('Répétitions, série 1').fill('10');
  await bench.getByRole('button', { name: 'Valider la série 1' }).click();
  await page.getByRole('button', { name: 'Terminer' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Terminer' }).click();
  await expect(page.getByText(/Modèle « Push » mis à jour/)).toBeVisible();

  // Only the validated set is kept, with the reps actually done.
  await page.goto('/gym/templates');
  await page.getByRole('link', { name: /Push/ }).click();
  await expect(page.getByLabel('Répétitions, série 1, Bench')).toHaveValue('10');
  await expect(page.getByLabel('Poids en kg, série 2, Bench')).toHaveCount(0);
});

test('mark today as a rest day from the home screen, see it in the calendar, then undo it', async ({
  page,
}) => {
  await page.goto('/');
  const gym = page.getByRole('region', { name: 'Salle' });
  await gym.getByRole('button', { name: 'Jour de repos' }).click();
  await expect(gym.getByText('Jour de repos', { exact: true })).toBeVisible();
  await expect(gym.getByRole('link', { name: 'Commencer une séance' })).toBeHidden();

  // The mark survives a reload and shows in the calendar.
  await page.reload();
  await expect(gym.getByText('Jour de repos', { exact: true })).toBeVisible();
  await page.goto('/gym');
  const todayCell = page.getByRole('button', { name: /, repos$/ });
  await expect(todayCell).toHaveAttribute('aria-current', 'date');
  await todayCell.click();
  await expect(page.getByRole('dialog').getByRole('switch', { name: /Jour de repos/ })).toBeChecked();
  await page.keyboard.press('Escape');

  await page.goto('/');
  await gym.getByRole('button', { name: 'Annuler le jour de repos' }).click();
  await expect(gym.getByRole('link', { name: 'Commencer une séance' })).toBeVisible();
});

test('long-press a workout in the history to delete it', async ({ page }) => {
  await page.goto('/gym');
  await page.getByRole('button', { name: 'Commencer une séance' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Séance libre' }).click();
  await page.getByRole('button', { name: 'Ajouter un exercice' }).click();
  await page.getByPlaceholder('Rechercher un exercice').fill('bench');
  await page.getByRole('button', { name: /^Bench/ }).click();
  const bench = page.getByRole('region', { name: 'Bench' });
  await bench.getByLabel('Poids en kg, série 1').fill('50');
  await bench.getByLabel('Répétitions, série 1').fill('5');
  await bench.getByRole('button', { name: 'Valider la série 1' }).click();
  await page.getByRole('button', { name: 'Terminer' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Terminer' }).click();
  await expect(page).toHaveURL(/\/summary$/);

  await page.goto('/gym/history');
  const row = page.getByRole('link', { name: /250 kg/ });
  await row.hover();
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();

  // The press opens the confirmation instead of the workout.
  await expect(page).toHaveURL(/\/gym\/history$/);
  const sheet = page.getByRole('dialog', { name: 'Supprimer la séance ?' });
  await sheet.getByRole('button', { name: 'Annuler' }).click();
  await expect(row).toBeVisible();

  await row.click({ button: 'right' });
  await page.getByRole('dialog').getByRole('button', { name: 'Supprimer' }).click();
  await expect(page.getByText('Aucune séance terminée')).toBeVisible();
});

test('0 kg is bodyweight: the empty load reads PDC, and so does the summary', async ({ page }) => {
  await page.goto('/gym');
  await page.getByRole('button', { name: 'Commencer une séance' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Séance libre' }).click();
  await page.getByRole('button', { name: 'Ajouter un exercice' }).click();
  await page.getByPlaceholder('Rechercher un exercice').fill('dips');
  await page.getByRole('button', { name: /^Dips/ }).click();

  const dips = page.getByRole('region', { name: 'Dips' });
  await expect(dips.getByLabel('Poids en kg, série 1')).toHaveAttribute('placeholder', 'PDC');
  await expect(dips.getByRole('button', { name: /Poids du corps/ })).toHaveCount(0);
  await dips.getByLabel('Répétitions, série 1').fill('8');
  await dips.getByRole('button', { name: 'Valider la série 1' }).click();
  await page.getByRole('button', { name: 'Terminer' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Terminer' }).click();
  await expect(page).toHaveURL(/\/summary$/);
  await expect(page.getByText(/meilleure : PDC × 8/)).toBeVisible();
});

test('log a day from a template: its exercises and sets, loads and reps left empty', async ({ page }) => {
  await page.goto('/gym/templates/new');
  await page.getByLabel('Nom du modèle').fill('Push');
  await page.getByRole('button', { name: 'Ajouter un exercice' }).click();
  await page.getByPlaceholder('Rechercher un exercice').fill('bench');
  await page.getByRole('button', { name: /^Bench/ }).click();
  await page.getByLabel('Poids en kg, série 1, Bench').fill('60');
  await page.getByLabel('Répétitions, série 1, Bench').fill('8');
  await page.getByRole('button', { name: 'Créer le modèle' }).click();
  await expect(page).toHaveURL(/\/gym\/templates$/);

  await page.goto('/gym');
  await page.locator('[aria-current="date"]').click();
  await page.getByRole('dialog').getByRole('button', { name: /^Push/ }).click();
  await expect(page).toHaveURL(/\/gym\/workout\/\d+$/);

  const bench = page.getByRole('region', { name: 'Bench' });
  await expect(bench.getByLabel(/Poids en kg, série/)).not.toHaveCount(0);
  for (const input of await bench.getByLabel(/Poids en kg, série/).all()) await expect(input).toHaveValue('');
  for (const input of await bench.getByLabel(/Répétitions, série/).all()) await expect(input).toHaveValue('');
  await expect(bench.getByText(/Dernière fois/)).toHaveCount(0);
});

test('a bench PR session warms up, then a new record unlocks its badge', async ({ page }) => {
  await page.goto('/gym');
  await page.getByRole('button', { name: 'Commencer une séance' }).click();
  const sheet = page.getByRole('dialog', { name: 'Commencer une séance' });
  await sheet.getByRole('button', { name: 'Séance PR bench' }).click();
  await sheet.getByLabel('Charge visée pour 1 rep').fill('60');
  await sheet.getByRole('button', { name: 'Lancer la tentative' }).click();
  await expect(page).toHaveURL(/\/gym\/workout\/\d+$/);

  const bench = page.getByRole('region', { name: 'Bench' });
  await expect(bench.getByLabel('Poids en kg, série 1')).toHaveValue('20');
  await expect(bench.getByLabel('Poids en kg, série 6')).toHaveValue('60');
  await bench.getByRole('button', { name: 'Valider la série 6' }).click();
  await page.getByRole('button', { name: 'Terminer' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Terminer' }).click();

  const result = page.getByRole('region', { name: 'Résultat au bench' });
  await expect(result.getByText('Record battu')).toBeVisible();
  await expect(result.getByRole('img', { name: 'Badge bench 60 kg, débloqué' })).toBeVisible();

  await page.goto('/stats/records');
  await expect(page.getByRole('img', { name: 'Badge bench 60 kg, débloqué' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Badge bench 70 kg, à débloquer' })).toBeVisible();

  await page.goto('/');
  const streaks = page.getByRole('region', { name: 'Séries' });
  await expect(streaks.getByText('Semaines à 5 séances')).toBeVisible();
  await expect(streaks.getByText('1 / 5 cette semaine')).toBeVisible();
});
