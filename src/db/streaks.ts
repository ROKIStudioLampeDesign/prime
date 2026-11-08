import { todayLocalDate, type LocalDate } from '../domain/date';
import { attendedDates, redDates } from '../domain/gymCalendar';
import { calorieStreak, weekStreak, type CalorieStreak, type WeekStreak } from '../domain/streaks';
import { db, type PrimeDB } from './db';
import { getGoals } from './goals';
import { getWeeklyTarget, listGymDays } from './gymDays';
import { listDailyKcal } from './logEntries';

export interface Streaks {
  /** Undefined without a calorie goal. */
  calories?: CalorieStreak & { goal: number };
  week: WeekStreak;
}

/** Both streaks for the home screen. */
export async function getStreaks(
  today: LocalDate = todayLocalDate(),
  database: PrimeDB = db,
): Promise<Streaks> {
  const [goals, byDay, workouts, gymDays, target] = await Promise.all([
    getGoals(database),
    listDailyKcal(database),
    database.workouts.toArray(),
    listGymDays(database),
    getWeeklyTarget(),
  ]);
  const workoutDates = workouts.map((w) => w.date);
  const attended = attendedDates(workoutDates, gymDays);
  const red = redDates(workoutDates, gymDays);
  return {
    ...(goals.kcal !== undefined && {
      calories: { ...calorieStreak(byDay, goals.kcal, today, red), goal: goals.kcal },
    }),
    week: weekStreak(attended, today, target),
  };
}
