import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { LocalDate } from '../domain/date';
import { backupFileName, exportBackup, importBackup, readBackup } from './backup';
import { upsertBodyWeight } from './bodyWeights';
import { PrimeDB } from './db';
import { createFood } from './foods';
import { saveGoals } from './goals';
import { addEntry } from './logEntries';
import { createMeal } from './meals';
import { createTemplate } from './templates';
import { addExerciseToWorkout, finishWorkout, setCompleted, startWorkout } from './workouts';

const d = (s: string) => s as LocalDate;
let n = 0;
let source: PrimeDB;
let target: PrimeDB;

beforeEach(() => {
  n++;
  source = new PrimeDB(`prime-backup-src-${n}`);
  target = new PrimeDB(`prime-backup-dst-${n}`);
});
afterEach(async () => {
  await source.delete();
  await target.delete();
});

async function fill(db: PrimeDB) {
  const photo = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x10, 0x80, 0xfe])], {
    type: 'image/jpeg',
  });
  const foodId = await createFood(
    {
      name: 'Avoine',
      brand: 'Quaker',
      barcode: '3017620422003',
      photo,
      per100g: { kcal: 372, protein: 13.5, carbs: 58.7, fat: 7 },
    },
    db,
  );
  const food = await db.foods.get(foodId);
  if (!food) throw new Error('food');
  await addEntry({ date: d('2026-11-02'), slot: 'breakfast', food, grams: 60 }, db);
  await createMeal({ name: 'Porridge', ingredients: [{ foodId, grams: 80 }], portions: 2 }, db);
  await saveGoals({ kcal: 2300, protein: 160 }, db);
  await upsertBodyWeight(d('2026-11-01'), 80.4, db);
  await db.gymDays.put({ date: d('2026-11-01'), attended: true });
  const bench = (await db.exercises.where('seedId').equals('bench-press').first())?.id ?? 0;
  await createTemplate(
    { name: 'Push', exercises: [{ exerciseId: bench, targetSets: 3, targetReps: 8 }] },
    db,
  );
  const workoutId = await startWorkout(undefined, db);
  await addExerciseToWorkout(workoutId, bench, { setCount: 2 }, db);
  const firstSet = await db.workoutSets.where('workoutId').equals(workoutId).first();
  if (firstSet) await setCompleted(firstSet.id, true, 0, db);
  await finishWorkout(workoutId, db);
  await db.settings.put({
    key: 'bodyMap',
    value: { greenDays: 3, redDays: 12, countSecondary: false },
    updatedAt: 1,
  });
  await db.settings.put({ key: 'lastExportAt', value: 123, updatedAt: 1 }); // device-specific
}

/** Table contents with Blobs replaced by their bytes, for deep comparison. */
async function snapshot(db: PrimeDB) {
  const out: Record<string, unknown[]> = {};
  for (const table of db.tables) {
    const rows = await table.toArray();
    out[table.name] = await Promise.all(
      rows.map(async (r: Record<string, unknown>) => {
        const copy: Record<string, unknown> = { ...r };
        for (const [k, v] of Object.entries(copy)) {
          if (v instanceof Blob)
            copy[k] = { type: v.type, bytes: [...new Uint8Array(await v.arrayBuffer())] };
        }
        return copy;
      }),
    );
  }
  out.settings = (out.settings ?? []).filter(
    (s) => !['lastExportAt', 'storagePersisted'].includes((s as { key: string }).key),
  );
  return out;
}

describe('backup', () => {
  it('round-trips: export → JSON → wipe → import (replace) gives identical data', async () => {
    await fill(source);
    const json = JSON.stringify(await exportBackup(source, 1_700_000_000_000));

    // The target already has unrelated data, which "replace" must wipe.
    await createFood({ name: 'À effacer', per100g: { kcal: 1, protein: 0, carbs: 0, fat: 0 } }, target);
    await target.settings.put({ key: 'lastExportAt', value: 999, updatedAt: 1 });

    const parsed = readBackup(json, target);
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.backup.exportedAt).toBe(1_700_000_000_000);
    await importBackup(parsed.backup, 'replace', target);

    expect(await snapshot(target)).toEqual(await snapshot(source));
    // The photo is a real Blob again, bytes and type intact.
    const photo = (await target.foods.toArray())[0]?.photo;
    expect(photo).toBeInstanceOf(Blob);
    expect(photo?.type).toBe('image/jpeg');
    // Device settings are neither exported nor overwritten.
    expect(JSON.parse(json).tables.settings.some((s: { key: string }) => s.key === 'lastExportAt')).toBe(
      false,
    );
    expect((await target.settings.get('lastExportAt'))?.value).toBe(999);
  });

  it('merges: adds missing rows, keeps existing ones, skips unique conflicts', async () => {
    await fill(source);
    const backup = readBackup(JSON.stringify(await exportBackup(source)), target);
    if (!backup.ok) throw new Error(backup.error);

    // Local data: food id 1 differs, and a weigh-in already exists on the same day.
    await createFood({ name: 'Local', per100g: { kcal: 1, protein: 0, carbs: 0, fat: 0 } }, target);
    await upsertBodyWeight(d('2026-11-01'), 70, target);

    const result = await importBackup(backup.backup, 'merge', target);
    expect((await target.foods.get(1))?.name).toBe('Local'); // kept
    expect((await target.bodyWeights.toArray()).map((w) => w.kg)).toEqual([70]); // unique date conflict skipped
    expect(await target.logEntries.count()).toBe(1);
    expect(await target.meals.count()).toBe(1);
    expect(await target.workouts.count()).toBe(1);
    expect(result.added).toBeGreaterThan(0);
    // Built-in exercises exist on both sides with the same ids: all skipped, none duplicated.
    expect(await target.exercises.count()).toBe(await source.exercises.count());
    expect(result.skipped).toBeGreaterThanOrEqual(await source.exercises.count());
  });

  it('names files by local date', () => {
    expect(backupFileName(new Date(2026, 10, 2, 23, 59))).toBe('prime-sauvegarde-2026-11-02.json');
  });
});
