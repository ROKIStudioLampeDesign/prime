/** @vitest-environment jsdom */
import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { db } from '../../db/db';
import { BENCH_SEED_ID } from '../../db/exerciseSeed';
import type { LocalDate } from '../../domain/date';
import { renderWithRouter } from '../../test/utils';
import { ProgressionScreen } from './ProgressionScreen';

async function seededId(seedId: string): Promise<number> {
  const exercise = await db.exercises.where('seedId').equals(seedId).first();
  if (!exercise) throw new Error(`Missing built-in exercise ${seedId}`);
  return exercise.id;
}

async function logSet(exerciseId: number, startedAt: number) {
  const workoutId = await db.workouts.add({
    date: '2026-11-02' as LocalDate,
    status: 'done',
    startedAt,
    endedAt: startedAt + 1,
  });
  await db.workoutSets.add({
    workoutId,
    exerciseId,
    order: 0,
    setNumber: 1,
    completed: true,
    weightKg: 60,
    reps: 8,
  });
}

describe('ProgressionScreen', () => {
  afterEach(async () => {
    await Promise.all([db.workouts.clear(), db.workoutSets.clear()]);
  });

  it('shows the bench by default, even when another exercise was trained more recently', async () => {
    const bench = await seededId(BENCH_SEED_ID);
    const squat = await seededId('back-squat');
    await logSet(bench, 1000);
    await logSet(squat, 2000);

    renderWithRouter(<ProgressionScreen />);
    const select = await screen.findByRole<HTMLSelectElement>('combobox', { name: 'Exercice' });
    expect(select.value).toBe(String(bench));
  });

  it('falls back to the most recent exercise without bench history', async () => {
    const squat = await seededId('back-squat');
    await logSet(squat, 2000);

    renderWithRouter(<ProgressionScreen />);
    const select = await screen.findByRole<HTMLSelectElement>('combobox', { name: 'Exercice' });
    expect(select.value).toBe(String(squat));
  });
});
