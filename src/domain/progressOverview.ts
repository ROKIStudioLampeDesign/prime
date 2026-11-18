import { addDays, type LocalDate } from './date';
import { bestSoFar, sessionProgression, type HistorySet } from './strength';
import { weekStart } from './week';

/** A session that beat every earlier one on its heaviest load. */
export interface RecentRecord {
  exerciseId: number;
  date: LocalDate;
  startedAt: number;
  weightKg: number;
  /** The best load before this session. */
  previousKg: number;
}

/**
 * New load records set since `since` (inclusive), all exercises, newest first. An exercise's very
 * first session is not a record: there was nothing to beat.
 */
export function recentRecords(
  history: ReadonlyMap<number, readonly HistorySet[]>,
  since: LocalDate,
): RecentRecord[] {
  const out: RecentRecord[] = [];
  for (const [exerciseId, sets] of history) {
    const points = bestSoFar(sessionProgression(sets, 'maxWeight'));
    points.forEach((p, i) => {
      const previous = points[i - 1];
      if (!p.isNewBest || !previous || p.date < since) return;
      out.push({
        exerciseId,
        date: p.date,
        startedAt: p.startedAt,
        weightKg: p.value,
        previousKg: previous.value,
      });
    });
  }
  return out.sort((a, b) => (a.date === b.date ? b.startedAt - a.startedAt : a.date < b.date ? 1 : -1));
}

export interface WeekVolume {
  /** Monday of the week. */
  weekOf: LocalDate;
  /** Sum of load × reps of the week's sets (bodyweight sets count 0). */
  volumeKg: number;
}

/** Training volume of the last `weeks` weeks, the current one included, oldest first. */
export function weeklyVolumes(
  history: ReadonlyMap<number, readonly HistorySet[]>,
  today: LocalDate,
  weeks: number,
): WeekVolume[] {
  const current = weekStart(today);
  const out: WeekVolume[] = Array.from({ length: Math.max(0, weeks) }, (_, i) => ({
    weekOf: addDays(current, -7 * (weeks - 1 - i)),
    volumeKg: 0,
  }));
  const index = new Map(out.map((w, i) => [w.weekOf, i]));
  for (const sets of history.values()) {
    for (const s of sets) {
      const i = index.get(weekStart(s.date));
      const week = i === undefined ? undefined : out[i];
      if (week) week.volumeKg += Math.max(0, s.weightKg) * Math.max(0, s.reps);
    }
  }
  return out;
}
