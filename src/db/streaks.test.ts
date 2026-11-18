import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { LocalDate } from '../domain/date';
import { PrimeDB } from './db';
import { saveGoals } from './goals';
import { setGymDay } from './gymDays';
import { getStreaks } from './streaks';

let name = 0;
let db: PrimeDB;
beforeEach(() => {
  db = new PrimeDB(`prime-streaks-${++name}`);
});
afterEach(async () => {
  await db.delete();
});

const d = (s: string) => s as LocalDate;
const entry = (date: string, kcal: number) => ({
  date: d(date),
  slot: 'lunch' as const,
  grams: 100,
  name: 'Test',
  per100g: { kcal, protein: 0, carbs: 0, sugars: 0, fat: 0, fiber: 0 },
  macros: { kcal, protein: 0, carbs: 0, sugars: 0, fat: 0, fiber: 0 },
  kind: 'food' as const,
  foodId: 1,
  createdAt: 1,
  updatedAt: 1,
});

describe('getStreaks', () => {
  it('sums each day’s entries against the calorie goal', async () => {
    await saveGoals({ kcal: 1500 }, db);
    await db.logEntries.bulkAdd([
      entry('2026-11-03', 800),
      entry('2026-11-03', 600),
      entry('2026-11-04', 1500),
      entry('2026-11-05', 700),
    ]);
    const streaks = await getStreaks(d('2026-11-05'), db);
    expect(streaks.calories).toEqual({ days: 3, today: 'ok', goal: 1500 });
  });

  it('has no calorie streak without a goal, and counts manual gym days in the week', async () => {
    for (const day of ['2026-11-02', '2026-11-03']) await setGymDay(d(day), true, db);
    await db.workouts.add({ date: d('2026-11-04'), status: 'done', startedAt: 1 });
    const streaks = await getStreaks(d('2026-11-05'), db);
    expect(streaks.calories).toBeUndefined();
    expect(streaks.week).toEqual({ weeks: 0, thisWeek: 3, target: 5 });
  });
});
