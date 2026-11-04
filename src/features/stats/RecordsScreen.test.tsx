/** @vitest-environment jsdom */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    await Promise.all([db.workouts.clear(), db.workoutSets.clear(), db.settings.clear()]);
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

  it('sets a one-rep goal and shows how far the heaviest real lift is', async () => {
    const user = userEvent.setup();
    const bench = await seededId(BENCH_SEED_ID);
    const workoutId = await db.workouts.add({
      date: '2026-11-02' as LocalDate,
      status: 'done',
      startedAt: 1,
      endedAt: 2,
    });
    // 100 × 5 estimates ~117 kg, but the goal counts the 100 kg actually lifted.
    await db.workoutSets.add({
      workoutId,
      exerciseId: bench,
      order: 0,
      setNumber: 1,
      completed: true,
      weightKg: 100,
      reps: 5,
    });

    renderWithRouter(<RecordsScreen />);
    await user.click(await screen.findByRole('button', { name: 'Me fixer un objectif' }));
    const sheet = screen.getByRole('dialog', { name: 'Objectif au bench' });
    await user.type(screen.getByLabelText('Charge visée'), '120');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByText('Encore 20 kg · max 100 kg')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Objectif · 1 rep' }).textContent).toContain('120 kg');
    expect(sheet.isConnected).toBe(false);
    expect(await axeViolations()).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    await user.click(screen.getByRole('button', { name: 'Retirer l’objectif' }));
    expect(await screen.findByRole('button', { name: 'Me fixer un objectif' })).toBeTruthy();
  });
});
