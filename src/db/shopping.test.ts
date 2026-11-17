import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PrimeDB } from './db';
import {
  addShoppingItem,
  deleteShoppingItem,
  finishShopping,
  getShoppingPrices,
  listShoppingItems,
  priceKey,
  updateShoppingItem,
} from './shopping';

let n = 0;
let db: PrimeDB;
beforeEach(() => {
  db = new PrimeDB(`prime-shopping-${++n}`);
});
afterEach(async () => {
  await db.delete();
});

describe('shopping list', () => {
  it('adds products and hand-typed ingredients, merging quantities of the same one', async () => {
    await addShoppingItem({ name: 'Filet de poulet', foodId: 4, neededG: 550 }, db, 1);
    await addShoppingItem({ name: 'Poulet', foodId: 4, neededG: 200 }, db, 2);
    await addShoppingItem({ name: ' Gingembre ', neededG: 30 }, db, 3);
    await addShoppingItem({ name: 'gingembre' }, db, 4);
    await addShoppingItem({ name: 'Bananes' }, db, 5);
    const items = await listShoppingItems(db);
    expect(items.map((i) => [i.name, i.neededG])).toEqual([
      ['Filet de poulet', 750],
      ['Gingembre', 30],
      ['Bananes', undefined],
    ]);
    await expect(addShoppingItem({ name: '  ' }, db)).rejects.toThrow();
  });

  it('keys prices by product, else by normalized name', () => {
    expect(priceKey({ name: 'X', foodId: 3 })).toBe('food:3');
    expect(priceKey({ name: 'Gingembre frais' })).toBe(priceKey({ name: ' gingembre FRAIS' }));
  });

  it('finishing remembers the price per kg of what was taken and keeps the rest', async () => {
    await addShoppingItem({ name: 'Poulet', foodId: 4, neededG: 550 }, db, 1);
    await addShoppingItem({ name: 'Bananes' }, db, 2);
    await addShoppingItem({ name: 'Riz', foodId: 7, neededG: 500 }, db, 3);
    const [chicken, bananas] = await listShoppingItems(db);
    if (!chicken || !bananas) throw new Error('items');
    await updateShoppingItem(chicken.id, { boughtG: 600, priceCents: 695, checked: true }, db);
    await updateShoppingItem(bananas.id, { priceCents: 199, checked: true }, db); // no quantity: no price per kg
    await finishShopping(db, 10);
    expect((await listShoppingItems(db)).map((i) => i.name)).toEqual(['Riz']);
    const prices = await getShoppingPrices(db);
    expect(prices.get('food:4')).toBeCloseTo(1158.33, 1);
    expect(prices.has(priceKey({ name: 'Bananes' }))).toBe(false);
  });

  it('a taken line no longer absorbs new quantities; deleting removes a line', async () => {
    await addShoppingItem({ name: 'Riz', foodId: 7, neededG: 500 }, db, 1);
    const [rice] = await listShoppingItems(db);
    if (!rice) throw new Error('rice');
    await updateShoppingItem(rice.id, { checked: true }, db);
    await addShoppingItem({ name: 'Riz', foodId: 7, neededG: 300 }, db, 2);
    expect((await listShoppingItems(db)).map((i) => i.neededG)).toEqual([500, 300]);
    await deleteShoppingItem(rice.id, db);
    expect(await listShoppingItems(db)).toHaveLength(1);
  });
});
