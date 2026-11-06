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

/** A set of the current workout, as far as live record badges are concerned. */
export interface SessionSet {
  id: number;
  weightKg: number;
  reps: number;
  completed: boolean;
  setNumber: number;
  /** Epoch ms; orders the sets as they were validated. */
  completedAt?: number;
}

/**
 * Which completed sets of the current workout hold an all-time record, by set id. For each kind,
 * only the single best set of the session gets it, and only if it beats the record from before the
 * workout (`previous`): two sets that both beat last week's best don't both get a badge. On ties,
 * the set validated first keeps the record. No previous record for a kind: no badge.
 */
export function sessionRecordHolders(
  sets: readonly SessionSet[],
  previous: PersonalRecords,
): Map<number, RecordKind[]> {
  const done = sets
    .filter((s) => s.completed)
    .sort((a, b) => (a.completedAt ?? Infinity) - (b.completedAt ?? Infinity) || a.setNumber - b.setNumber);
  const holders = new Map<number, RecordKind[]>();
  for (const kind of RECORD_KINDS) {
    const record = previous[kind];
    if (!record) continue;
    let best = record.value;
    let holder: number | undefined;
    for (const s of done) {
      const value = recordValue(kind, s);
      if (value !== undefined && value > best + 1e-9) {
        best = value;
        holder = s.id;
      }
    }
    if (holder !== undefined) holders.set(holder, [...(holders.get(holder) ?? []), kind]);
  }
  return holders;
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

export interface LiftGoalProgress {
  goalKg: number;
  /** Heaviest load actually lifted (any reps ≥ 1), 0 when none yet. */
  bestKg: number;
  /** 0 to 1, how far the best load is towards the goal. */
  ratio: number;
  /** Kilograms still missing, 0 once reached. */
  remainingKg: number;
  reached: boolean;
}

/**
 * Progress towards a one-rep goal (e.g. bench 120 kg × 1). It counts real lifts only, the
 * heaviest load moved for at least one rep, never the estimated 1RM. Undefined without a goal.
 */
export function liftGoalProgress(
  records: PersonalRecords,
  goalKg: number | undefined,
): LiftGoalProgress | undefined {
  if (goalKg === undefined || !(goalKg > 0)) return undefined;
  const bestKg = records.weight?.weightKg ?? 0;
  const reached = bestKg >= goalKg;
  return {
    goalKg,
    bestKg,
    ratio: Math.min(1, bestKg / goalKg),
    remainingKg: reached ? 0 : goalKg - bestKg,
    reached,
  };
}
