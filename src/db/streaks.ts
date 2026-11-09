import { todayLocalDate, type LocalDate } from '../domain/date';
import { attendedDates } from '../domain/gymCalendar';
import { calorieStreak, weekStreak, type CalorieStreak, type WeekStreak } from '../domain/streaks';
import { db, type PrimeDB } from './db';
import { getGoals } from './goals';
import { getWeeklyTarget, listGymDays } from './gymDays';
import { listDailyKcal } from './logEntries';
import { listUnloggedDays } from './nutritionDays';

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
  const [goals, byDay, workouts, gymDays, target, unlogged] = await Promise.all([
    getGoals(database),
    listDailyKcal(database),
    database.workouts.toArray(),
    listGymDays(database),
    getWeeklyTarget(),
    listUnloggedDays(database),
  ]);
  const attended = attendedDates(
    workouts.map((w) => w.date),
    gymDays,
  );
  return {
    ...(goals.kcal !== undefined && {
      calories: { ...calorieStreak(byDay, goals.kcal, today, unlogged), goal: goals.kcal },
    }),
    week: weekStreak(attended, today, target),
  };
}
