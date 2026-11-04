/** @vitest-environment jsdom */
import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { db } from '../../db/db';
import { BENCH_SEED_ID } from '../../db/exerciseSeed';
import type { LocalDate } from '../../domain/date';
import { axeViolations, renderWithRouter } from '../../test/utils';
import { RecordsScreen } from './RecordsScreen';

async function seededId(seedId: string): Promise<number> {
  const exercise = await db.exercises.where('seedId').equals(seedId).first();
  if (!exercise) throw new Error(`Missing built-in exercise ${seedId}`);
  return exercise.id;
}

describe('RecordsScreen', () => {
  afterEach(async () => {
    await Promise.all([db.workouts.clear(), db.workoutSets.clear()]);
  });

  it('says what to do before the first bench set', async () => {
    renderWithRouter(<RecordsScreen />);
    expect(await screen.findByText('Pas encore de record au bench')).toBeTruthy();
  });

  it('follows the bench only, under its short name', async () => {
    const bench = await seededId(BENCH_SEED_ID);
    const squat = await seededId('back-squat');
    const workoutId = await db.workouts.add({
      date: '2026-11-02' as LocalDate,
      status: 'done',
      startedAt: 1,
      endedAt: 2,
    });
    const set = { workoutId, setNumber: 1, completed: true };
    await db.workoutSets.bulkAdd([
      { ...set, exerciseId: bench, order: 0, weightKg: 60, reps: 8 },
      { ...set, exerciseId: squat, order: 1, weightKg: 100, reps: 5 },
    ]);

    renderWithRouter(<RecordsScreen />);
    expect(await screen.findByRole('heading', { name: 'Bench' })).toBeTruthy();
    expect(screen.getByText('1RM estimé · 60 kg × 8')).toBeTruthy();
    expect(screen.queryByText(/Squat/)).toBeNull();
    expect(screen.getByRole('link', { name: 'Voir la progression' }).getAttribute('href')).toBe(
      `/stats/progress?exercise=${bench}`,
    );
    expect(await axeViolations()).toEqual([]);
  });
});
