/** @vitest-environment jsdom */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { db } from '../../db/db';
import { BENCH_SEED_ID } from '../../db/exerciseSeed';
import { getLiftGoalKg, setLiftGoalKg } from '../../db/liftGoals';
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

  it('follows the bench by default, under its short name', async () => {
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
    expect(screen.getByText('Charge max · 60 kg × 8')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Squat' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Bench' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('heading', { name: 'Évolution du record' })).toBeTruthy();
    // The tracked lifts have their own tabs, not a place in the other exercises.
    const others = screen.queryByRole('combobox', { name: 'Autre exercice' });
    expect(others).toBeNull();
    expect(await axeViolations()).toEqual([]);
  });

  it('opens any other exercise from the menu, with its chart and records but no badges', async () => {
    const curl = await seededId('barbell-curl');
    const workoutId = await db.workouts.add({
      date: '2026-11-02' as LocalDate,
      status: 'done',
      startedAt: 1,
      endedAt: 2,
    });
    await db.workoutSets.add({
      workoutId,
      exerciseId: curl,
      order: 0,
      setNumber: 1,
      completed: true,
      weightKg: 30,
      reps: 10,
    });

    renderWithRouter(<RecordsScreen />, { route: '/stats/records' });
    const select = await screen.findByRole<HTMLSelectElement>('combobox', { name: 'Autre exercice' });
    await userEvent.setup().selectOptions(select, String(curl));

    expect(await screen.findByText('Charge max · 30 kg × 10')).toBeTruthy();
    expect(select.value).toBe(String(curl));
    expect(screen.getByRole('heading', { name: 'Évolution du record' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Badges' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Bench' }).getAttribute('aria-current')).toBeNull();
    expect(await axeViolations()).toEqual([]);
  });

  it('reads the lift from the URL and says what to do before its first set', async () => {
    renderWithRouter(<RecordsScreen />, { route: '/stats/records?lift=snatch' });
    expect(await screen.findByText('Pas encore de record au snatch')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Snatch' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: 'Me fixer un objectif' })).toBeTruthy();
  });

  it('switches lift with its own record, badges and goal', async () => {
    const user = userEvent.setup();
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
      { ...set, exerciseId: squat, order: 1, weightKg: 105, reps: 5 },
    ]);
    await setLiftGoalKg('bench', 100);

    renderWithRouter(<RecordsScreen />, { route: '/stats/records' });
    expect(await screen.findByRole('region', { name: 'Objectif · 1 rep' })).toBeTruthy();
    await user.click(screen.getByRole('link', { name: 'Squat' }));

    expect(await screen.findByRole('heading', { name: 'Squat' })).toBeTruthy();
    expect(screen.getByText('Charge max · 105 kg × 5')).toBeTruthy();
    // Squat milestones start at 75 kg, every 15 kg: 75, 90 and 105 are unlocked.
    expect(screen.getByRole('img', { name: 'Badge squat 105 kg, Argent I, débloqué' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Badge squat 120 kg, Argent II, à débloquer' })).toBeTruthy();
    // The bench goal stays with the bench.
    expect(screen.getByRole('button', { name: 'Me fixer un objectif' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Me fixer un objectif' }));
    expect(screen.getByRole('dialog', { name: 'Objectif au squat' })).toBeTruthy();
    await user.type(screen.getByLabelText('Charge visée'), '140');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect((await screen.findByRole('region', { name: 'Objectif · 1 rep' })).textContent).toContain('140 kg');
    expect(await getLiftGoalKg('bench')).toBe(100);
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

    expect(await screen.findByRole('button', { name: 'Modifier' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Objectif · 1 rep' }).textContent).toContain('120 kg');
    expect(screen.queryByText(/Encore/)).toBeNull();
    expect(sheet.isConnected).toBe(false);
    expect(await axeViolations()).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    await user.click(screen.getByRole('button', { name: 'Retirer l’objectif' }));
    expect(await screen.findByRole('button', { name: 'Me fixer un objectif' })).toBeTruthy();
  });
});
