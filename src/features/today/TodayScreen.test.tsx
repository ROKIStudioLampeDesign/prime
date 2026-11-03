/** @vitest-environment jsdom */
import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { upsertBodyWeight } from '../../db/bodyWeights';
import { db } from '../../db/db';
import { saveGoals } from '../../db/goals';
import { addEntry } from '../../db/logEntries';
import { todayLocalDate } from '../../domain/date';
import { axeViolations, renderWithRouter } from '../../test/utils';
import { TodayScreen } from './TodayScreen';

describe('TodayScreen', () => {
  afterEach(async () => {
    await Promise.all([db.logEntries.clear(), db.goals.clear(), db.bodyWeights.clear(), db.workouts.clear()]);
  });

  it('guides a new user from each card', async () => {
    renderWithRouter(<TodayScreen />);
    expect(await screen.findByText('Rien de noté pour l’instant : ajoute ton premier repas.')).toBeTruthy();
    expect(await screen.findByText('Aucune pesée : note ton poids pour suivre ta courbe.')).toBeTruthy();
    expect(await screen.findByText('Ta première séance apparaîtra ici.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Commencer une séance' }).getAttribute('href')).toBe(
      '/gym?start=1',
    );
    expect(await axeViolations()).toEqual([]);
  });

  it('sums today’s entries against the goals and shows today’s weigh-in', async () => {
    const today = todayLocalDate();
    await saveGoals({ kcal: 2000, protein: 150 });
    const food = {
      id: 1,
      name: 'Riz',
      nameNormalized: 'riz',
      per100g: { kcal: 350, protein: 7, carbs: 78, fat: 1 },
      favorite: 0 as const,
      createdAt: 0,
      updatedAt: 0,
    };
    await addEntry({ date: today, slot: 'lunch', food, grams: 200 });
    await upsertBodyWeight(today, 79.4);

    renderWithRouter(<TodayScreen />);
    expect(await screen.findByText('700')).toBeTruthy();
    expect(screen.getByText('/ 2 000 kcal')).toBeTruthy();
    expect(screen.getByText('Reste 1 300 kcal · Protéines 14 / 150 g')).toBeTruthy();
    expect(await screen.findByText('79,4')).toBeTruthy();
    expect(screen.getByText('Pesée du jour enregistrée.')).toBeTruthy();
  });
});
