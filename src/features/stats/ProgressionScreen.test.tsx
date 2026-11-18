/** @vitest-environment jsdom */
import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { db } from '../../db/db';
import { addDays, todayLocalDate, type LocalDate } from '../../domain/date';
import { axeViolations, renderWithRouter } from '../../test/utils';
import { ProgressionScreen } from './ProgressionScreen';

async function seededId(seedId: string): Promise<number> {
  const exercise = await db.exercises.where('seedId').equals(seedId).first();
  if (!exercise) throw new Error(`Missing built-in exercise ${seedId}`);
  return exercise.id;
}

async function logSet(exerciseId: number, date: LocalDate, weightKg: number, startedAt: number) {
  const workoutId = await db.workouts.add({ date, status: 'done', startedAt, endedAt: startedAt + 1 });
  await db.workoutSets.add({
    workoutId,
    exerciseId,
    order: 0,
    setNumber: 1,
    completed: true,
    weightKg,
    reps: 5,
  });
}

describe('ProgressionScreen', () => {
  afterEach(async () => {
    await Promise.all([db.workouts.clear(), db.workoutSets.clear()]);
  });

  it('says what to do before the first finished workout', async () => {
    renderWithRouter(<ProgressionScreen />);
    expect(await screen.findByText('Pas encore de données')).toBeTruthy();
  });

  it('lists recent records, the weekly volume and the perfs', async () => {
    const today = todayLocalDate(new Date());
    const squat = await seededId('back-squat');
    await logSet(squat, addDays(today, -40), 100, 1);
    await logSet(squat, addDays(today, -3), 110, 2);

    renderWithRouter(<ProgressionScreen />);
    const list = await screen.findByRole('list');
    expect(within(list).getByText('Squat (barre)')).toBeTruthy();
    expect(within(list).getByText('110 kg')).toBeTruthy();
    expect(within(list).getByRole('link').getAttribute('href')).toBe('/stats/records?lift=squat');
    expect(screen.getByRole('heading', { name: /Volume hebdo/ })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Perfs' })).toBeTruthy();
    expect(await axeViolations()).toEqual([]);
  });
});
