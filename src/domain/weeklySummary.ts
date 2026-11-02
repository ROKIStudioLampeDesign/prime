import type { WeightPoint } from './bodyWeight';
import type { LocalDate } from './date';
import { sumMacros, type Goals, type Macros } from './nutrition';
import { weekDays, weekStart } from './week';

/** Calorie goal counts as met within ±10 % of the target (being 50 kcal over is still on target). */
export const KCAL_GOAL_TOLERANCE = 0.1;

export function kcalGoalMet(kcal: number, goal: number): boolean {
  return goal > 0 && Math.abs(kcal - goal) <= goal * KCAL_GOAL_TOLERANCE;
}

/** Protein is a minimum: met once the goal is reached. */
export function proteinGoalMet(protein: number, goal: number): boolean {
  return goal > 0 && protein >= goal;
}

export interface DayNutrition {
  date: LocalDate;
  /** False when no food entry exists for the day (then totals are not meaningful). */
  logged: boolean;
  kcal: number;
  protein: number;
}

export interface WeeklySummaryInput {
  /** Any day of the week to summarize. */
  weekOf: LocalDate;
  workouts: readonly { date: LocalDate; volumeKg: number }[];
  foodEntries: readonly { date: LocalDate; macros: Macros }[];
  goals: Goals;
  /** All weigh-ins (any range); only the relevant ones are used. */
  weights: readonly WeightPoint[];
}

export interface WeeklySummary {
  start: LocalDate;
  end: LocalDate;
  workoutCount: number;
  volumeKg: number;
  days: DayNutrition[];
  loggedDays: number;
  /** Averages over logged days only; undefined when no day is logged. */
  avgKcal?: number;
  avgProtein?: number;
  /** Logged days meeting each goal; undefined when that goal isn't set. */
  kcalGoalDays?: number;
  proteinGoalDays?: number;
  /**
   * Last weigh-in of the week minus the last one before the week (or the first of the week when
   * there is none before). Undefined without a weigh-in this week.
   */
  weightChange?: number;
}

export function weeklySummary(input: WeeklySummaryInput): WeeklySummary {
  const dates = weekDays(input.weekOf);
  const start = weekStart(input.weekOf);
  const end = dates[6] as LocalDate;
  const inWeek = (d: LocalDate) => d >= start && d <= end;

  const workouts = input.workouts.filter((w) => inWeek(w.date));
  const days: DayNutrition[] = dates.map((date) => {
    const entries = input.foodEntries.filter((e) => e.date === date);
    const total = sumMacros(entries.map((e) => e.macros));
    return { date, logged: entries.length > 0, kcal: total.kcal, protein: total.protein };
  });
  const logged = days.filter((d) => d.logged);
  const avg = (key: 'kcal' | 'protein') =>
    logged.length > 0 ? logged.reduce((s, d) => s + d[key], 0) / logged.length : undefined;

  const { kcal: kcalGoal, protein: proteinGoal } = input.goals;
  const sortedWeights = [...input.weights].sort((a, b) => (a.date < b.date ? -1 : 1));
  const weekWeights = sortedWeights.filter((w) => inWeek(w.date));
  const before = sortedWeights.filter((w) => w.date < start).at(-1);
  const last = weekWeights.at(-1);
  const reference = before ?? weekWeights[0];

  return {
    start,
    end,
    workoutCount: workouts.length,
    volumeKg: workouts.reduce((s, w) => s + w.volumeKg, 0),
    days,
    loggedDays: logged.length,
    avgKcal: avg('kcal'),
    avgProtein: avg('protein'),
    kcalGoalDays:
      kcalGoal === undefined ? undefined : logged.filter((d) => kcalGoalMet(d.kcal, kcalGoal)).length,
    proteinGoalDays:
      proteinGoal === undefined
        ? undefined
        : logged.filter((d) => proteinGoalMet(d.protein, proteinGoal)).length,
    weightChange: last && reference ? Math.round((last.kg - reference.kg) * 10) / 10 : undefined,
  };
}

/** Sign of the difference with the previous week, for ▲/▼ display. */
export function delta(
  current: number,
  previous: number,
): { value: number; direction: 'up' | 'down' | 'same' } {
  const value = current - previous;
  return { value, direction: value > 0 ? 'up' : value < 0 ? 'down' : 'same' };
}
