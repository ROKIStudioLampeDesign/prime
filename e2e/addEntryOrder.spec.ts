import { expect, test } from './fixtures';

test('the add screen lists meals before products, even favorite ones', async ({ page }) => {
  await page.goto('/nutrition');
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const req = indexedDB.open('prime');
      req.onsuccess = () => resolve(req.result);
    });
    const tx = db.transaction(['foods', 'meals'], 'readwrite');
    const foods = tx.objectStore('foods');
    const add = foods.add({
      name: 'Yaourt',
      nameNormalized: 'yaourt',
      per100g: { kcal: 60, protein: 4, carbs: 5, fat: 2 },
      favorite: 1,
      createdAt: 1,
      updatedAt: 1,
    });
    add.onsuccess = () => {
      tx.objectStore('meals').add({
        name: 'Poulet riz',
        nameNormalized: 'poulet riz',
        ingredients: [{ foodId: add.result, grams: 300 }],
        favorite: 0,
        createdAt: 1,
        updatedAt: 1,
      });
    };
    await new Promise((resolve) => (tx.oncomplete = resolve));
  });

  await page.goto('/nutrition/add?slot=lunch');
  const headings = page.getByRole('heading', { level: 2 });
  await expect(headings.first()).toHaveText('Plats');
  await expect(headings.nth(1)).toHaveText('Produits favoris');
  const rows = page.getByRole('listitem');
  await expect(rows.first()).toContainText('Poulet riz');

  // Search results keep meals first too.
  await page.getByRole('searchbox').fill('r');
  await expect(page.getByRole('listitem').first()).toContainText('Poulet riz');
});
