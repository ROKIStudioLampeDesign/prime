import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { LocalDate } from '../domain/date';
import {
  DEFAULT_BODY_MAP_SETTINGS,
  getBodyMapSettings,
  listCompletedSetDates,
  saveBodyMapSettings,
} from './bodyMap';
import { PrimeDB } from './db';

let n = 0;
let db: PrimeDB;
beforeEach(() => {
  db = new PrimeDB(`prime-body-${++n}`);
});
afterEach(async () => {
  await db.delete();
});

describe('body map settings', () => {
  it('defaults to 2 / 10 days and counting secondary muscles', async () => {
    expect(await getBodyMapSettings(db)).toEqual({ freshDays: 2, staleDays: 10, countSecondary: true });
  });

  it('persists valid settings and rejects fresh ≥ stale', async () => {
    await saveBodyMapSettings({ freshDays: 3, staleDays: 14, countSecondary: false }, db);
    expect(await getBodyMapSettings(db)).toEqual({ freshDays: 3, staleDays: 14, countSecondary: false });
    await expect(
      saveBodyMapSettings({ freshDays: 5, staleDays: 5, countSecondary: true }, db),
    ).rejects.toThrow();
  });

  it('ignores corrupted stored values', async () => {
    await db.settings.put({
      key: 'bodyMap',
      value: { greenDays: 9, redDays: 1, countSecondary: 'yes' },
      updatedAt: 0,
    });
    expect(await getBodyMapSettings(db)).toEqual(DEFAULT_BODY_MAP_SETTINGS);
  });

  it('reads settings saved under the old green/red names (same numbers)', async () => {
    await db.settings.put({
      key: 'bodyMap',
      value: { greenDays: 3, redDays: 12, countSecondary: false },
      updatedAt: 0,
    });
    expect(await getBodyMapSettings(db)).toEqual({ freshDays: 3, staleDays: 12, countSecondary: false });
  });
});

describe('listCompletedSetDates', () => {
  it('returns completed sets with their workout date, including the active workout', async () => {
    const done = await db.workouts.add({ date: '2026-11-01' as LocalDate, status: 'done', startedAt: 1 });
    const active = await db.workouts.add({ date: '2026-11-02' as LocalDate, status: 'active', startedAt: 2 });
    const base = { order: 0, setNumber: 1, weightKg: 10, reps: 10 };
    await db.workoutSets.bulkAdd([
      { ...base, workoutId: done, exerciseId: 1, completed: true },
      { ...base, workoutId: done, exerciseId: 2, completed: false },
      { ...base, workoutId: active, exerciseId: 3, completed: true },
      { ...base, workoutId: 999, exerciseId: 4, completed: true }, // orphan: ignored
    ]);
    expect(await listCompletedSetDates(db)).toEqual([
      { date: '2026-11-01', exerciseId: 1 },
      { date: '2026-11-02', exerciseId: 3 },
    ]);
  });
});
