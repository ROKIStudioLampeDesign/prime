// Dev-only demo data. Only imported dynamically behind `import.meta.env.DEV`, so it is not
// part of production builds.
import { addDays, todayLocalDate } from '../domain/date';
import type { MealSlot, Per100g } from '../domain/nutrition';
import { db } from './db';
import { createFood } from './foods';
import { saveGoals } from './goals';
import { addEntry, addMealEntry } from './logEntries';
import { createMeal, getMeal, summarizeWithFoods } from './meals';

const FOODS: { name: string; brand?: string; per100g: Per100g; favorite?: boolean }[] = [
  {
    name: 'Flocons d’avoine',
    brand: 'Quaker',
    per100g: { kcal: 372, protein: 13.5, carbs: 58.7, sugars: 1.2, fat: 7, fiber: 10 },
    favorite: true,
  },
  {
    name: 'Skyr nature',
    brand: 'Siggi’s',
    per100g: { kcal: 63, protein: 11, carbs: 4, sugars: 4, fat: 0.2, fiber: 0 },
    favorite: true,
  },
  { name: 'Banane', per100g: { kcal: 89, protein: 1.1, carbs: 20, sugars: 12, fat: 0.3, fiber: 2.6 } },
  {
    name: 'Blanc de poulet',
    per100g: { kcal: 110, protein: 23, carbs: 0, sugars: 0, fat: 2, fiber: 0 },
    favorite: true,
  },
  {
    name: 'Riz basmati cuit',
    per100g: { kcal: 130, protein: 2.7, carbs: 28, sugars: 0.1, fat: 0.3, fiber: 0.4 },
  },
  { name: 'Brocolis', per100g: { kcal: 34, protein: 2.8, carbs: 4, sugars: 1.7, fat: 0.4, fiber: 2.6 } },
  { name: 'Œufs entiers', per100g: { kcal: 143, protein: 12.6, carbs: 0.7, sugars: 0.4, fat: 9.5 } },
  { name: 'Pain complet', per100g: { kcal: 247, protein: 9, carbs: 41, sugars: 4, fat: 3.4, fiber: 7 } },
  { name: 'Huile d’olive', per100g: { kcal: 884, protein: 0, carbs: 0, fat: 100 } },
  { name: 'Saumon', per100g: { kcal: 208, protein: 20, carbs: 0, sugars: 0, fat: 13, fiber: 0 } },
  { name: 'Amandes', per100g: { kcal: 579, protein: 21, carbs: 22, sugars: 4.4, fat: 50, fiber: 12.5 } },
  {
    name: 'Crème fraîche épaisse',
    brand: 'Président',
    per100g: { kcal: 292, protein: 2.4, carbs: 3, sugars: 3, fat: 30 },
  },
];

const DAY_PLAN: [MealSlot, number, number][] = [
  ['breakfast', 0, 60],
  ['breakfast', 1, 150],
  ['breakfast', 2, 120],
  ['lunch', 3, 180],
  ['lunch', 4, 200],
  ['lunch', 5, 150],
  ['lunch', 8, 10],
  ['snack', 10, 25],
  ['dinner', 9, 150],
  ['dinner', 7, 80],
  ['dinner', 5, 200],
];

/** Wipes nutrition data and loads a week of plausible entries. */
export async function loadDemoData(): Promise<void> {
  await db.transaction('rw', [db.foods, db.meals, db.logEntries, db.goals], async () => {
    await Promise.all([db.foods.clear(), db.meals.clear(), db.logEntries.clear(), db.goals.clear()]);
    const ids: number[] = [];
    for (const food of FOODS) ids.push(await createFood(food));
    const foods = await db.foods.bulkGet(ids);
    const foodId = (index: number) => ids[index] ?? 0;

    const bowlId = await createMeal({
      name: 'Bowl poulet riz brocolis',
      ingredients: [
        { foodId: foodId(3), grams: 300 },
        { foodId: foodId(4), grams: 400 },
        { foodId: foodId(5), grams: 300 },
        { foodId: foodId(8), grams: 15 },
      ],
      cookedWeight: 950,
      portions: 2,
      favorite: true,
    });
    await createMeal({
      name: 'Porridge skyr banane',
      ingredients: [
        { foodId: foodId(0), grams: 60 },
        { foodId: foodId(1), grams: 150 },
        { foodId: foodId(2), grams: 100 },
        { foodId: foodId(10), grams: 15 },
      ],
    });
    const bowl = await getMeal(bowlId);
    if (bowl) {
      const allFoods = new Map((await db.foods.toArray()).map((f) => [f.id, f]));
      const summary = summarizeWithFoods(bowl, allFoods);
      const today0 = todayLocalDate();
      await addMealEntry({
        date: addDays(today0, -1),
        slot: 'dinner',
        meal: bowl,
        summary,
        serving: { portions: 1 },
      });
      await addMealEntry({
        date: addDays(today0, -2),
        slot: 'lunch',
        meal: bowl,
        summary,
        serving: { grams: 350 },
      });
    }

    const today = todayLocalDate();
    for (let back = 6; back >= 0; back--) {
      const date = addDays(today, -back);
      for (const [i, [slot, foodIndex, grams]] of DAY_PLAN.entries()) {
        const food = foods[foodIndex];
        // Vary days a bit and leave today partly filled.
        if (!food || (back === 0 && slot === 'dinner') || (i + back) % 5 === 0) continue;
        await addEntry({ date, slot, food, grams: Math.round(grams * (0.8 + ((i * back) % 5) / 10)) });
      }
    }
    await saveGoals({ kcal: 2300, protein: 160, carbs: 250, sugars: 50, fat: 75, fiber: 30 });
  });
}
