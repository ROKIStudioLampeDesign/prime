import type { LocalDate } from './date';

/** Above this many reps the Epley estimate becomes unreliable, so such sets are ignored for 1RM. */
export const MAX_REPS_FOR_1RM = 12;

/**
 * Estimated one-rep max (Epley): weight × (1 + reps / 30). A single rep is the weight itself.
 * Undefined for sets that can't give a meaningful estimate (no load, 0 reps, more than 12 reps).
 */
export function epley1RM(weightKg: number, reps: number): number | undefined {
  if (!(weightKg > 0) || !Number.isInteger(reps) || reps < 1 || reps > MAX_REPS_FOR_1RM) return undefined;
  return reps === 1 ? weightKg : weightKg * (1 + reps / 30);
}

/** A completed set with the workout it belongs to. */
export interface HistorySet {
  workoutId: number;
  date: LocalDate;
  /** Workout start (epoch ms): orders sessions on the same day. */
  startedAt: number;
  weightKg: number;
  reps: number;
}

export type ProgressMetric = 'maxWeight' | 'e1rm';

export interface SessionPoint {
  workoutId: number;
  date: LocalDate;
  startedAt: number;
  value: number;
}

/**
 * One point per session: the heaviest weight, or the best estimated 1RM. Sessions without a
 * usable set (only bodyweight sets, or only > 12 reps for 1RM) are left out.
 */
export function sessionProgression(sets: readonly HistorySet[], metric: ProgressMetric): SessionPoint[] {
  const best = new Map<number, SessionPoint>();
  for (const s of sets) {
    const value =
      metric === 'maxWeight' ? (s.weightKg > 0 ? s.weightKg : undefined) : epley1RM(s.weightKg, s.reps);
    if (value === undefined) continue;
    const prev = best.get(s.workoutId);
    if (!prev || value > prev.value) {
      best.set(s.workoutId, { workoutId: s.workoutId, date: s.date, startedAt: s.startedAt, value });
    }
  }
  return [...best.values()].sort((a, b) => a.startedAt - b.startedAt);
}

export type RecordKind = 'weight' | 'e1rm' | 'volume';

export const RECORD_KINDS: readonly RecordKind[] = ['weight', 'e1rm', 'volume'];

/** French labels (shared by the workout badges and the Stats screens, like EQUIPMENT_LABELS). */
export const RECORD_LABELS: Readonly<Record<RecordKind, string>> = {
  weight: 'Charge max',
  e1rm: '1RM estimé',
  volume: 'Volume (série)',
};

export interface PersonalRecord {
  kind: RecordKind;
  value: number;
  weightKg: number;
  reps: number;
  date: LocalDate;
  workoutId: number;
  startedAt: number;
}

export type PersonalRecords = Partial<Record<RecordKind, PersonalRecord>>;

/** Value of a set for each record kind (undefined when the set can't hold that record). */
export function recordValue(kind: RecordKind, set: { weightKg: number; reps: number }): number | undefined {
  if (!(set.weightKg > 0) || !(set.reps > 0)) return undefined;
  switch (kind) {
    case 'weight':
      return set.weightKg;
    case 'e1rm':
      return epley1RM(set.weightKg, set.reps);
    case 'volume':
      return set.weightKg * set.reps;
  }
}

/** Best set for each kind. On ties, the earliest set keeps the record (it was achieved first). */
export function personalRecords(sets: readonly HistorySet[]): PersonalRecords {
  const chronological = [...sets].sort((a, b) => a.startedAt - b.startedAt);
  const records: PersonalRecords = {};
  for (const s of chronological) {
    for (const kind of RECORD_KINDS) {
      const value = recordValue(kind, s);
      if (value === undefined) continue;
      const current = records[kind];
      if (!current || value > current.value) {
        records[kind] = {
          kind,
          value,
          weightKg: s.weightKg,
          reps: s.reps,
          date: s.date,
          workoutId: s.workoutId,
          startedAt: s.startedAt,
        };
      }
    }
  }
  return records;
}

/**
 * Record kinds a set beats, compared with records established BEFORE the current workout. A kind
 * with no previous record is not reported: the very first session isn't a "PR" worth a badge.
 */
export function recordsBeaten(
  set: { weightKg: number; reps: number },
  previous: PersonalRecords,
): RecordKind[] {
  return RECORD_KINDS.filter((kind) => {
    const value = recordValue(kind, set);
    const record = previous[kind];
    return value !== undefined && record !== undefined && value > record.value + 1e-9;
  });
}

/** Date of the most recent record among the kinds (for sorting the records list). */
export function latestRecordDate(records: PersonalRecords): LocalDate | undefined {
  let latest: LocalDate | undefined;
  for (const kind of RECORD_KINDS) {
    const d = records[kind]?.date;
    if (d !== undefined && (latest === undefined || d > latest)) latest = d;
  }
  return latest;
}
