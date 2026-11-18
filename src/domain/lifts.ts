import type { LocalDate } from './date';

/** The lifts Stats › Records can follow, in the order of its picker. */
export const LIFT_IDS = ['bench', 'squat', 'deadlift', 'power-clean', 'snatch'] as const;
export type LiftId = (typeof LIFT_IDS)[number];

export interface TrackedLift {
  id: LiftId;
  /** Built-in exercise followed (see EXERCISE_SEED). */
  seedId: string;
  /** Short name, in the picker and on the band ("au squat" in sentences). */
  label: string;
  /** First milestone (Bronze I) and the gap between two milestones. */
  fromKg: number;
  stepKg: number;
}

/**
 * Each lift climbs the same eight ranks (Bronze I → Diamant) on its own scale: Diamant is a strong
 * amateur single (bench 130, squat 180, deadlift 200, power clean 110, snatch 75 kg).
 */
export const TRACKED_LIFTS: Readonly<Record<LiftId, TrackedLift>> = {
  bench: { id: 'bench', seedId: 'bench-press', label: 'Bench', fromKg: 60, stepKg: 10 },
  squat: { id: 'squat', seedId: 'back-squat', label: 'Squat', fromKg: 75, stepKg: 15 },
  deadlift: { id: 'deadlift', seedId: 'deadlift', label: 'Deadlift', fromKg: 60, stepKg: 20 },
  'power-clean': { id: 'power-clean', seedId: 'power-clean', label: 'Power clean', fromKg: 40, stepKg: 10 },
  snatch: { id: 'snatch', seedId: 'snatch', label: 'Snatch', fromKg: 40, stepKg: 5 },
};

export const DEFAULT_LIFT: LiftId = 'bench';

export function isLiftId(value: unknown): value is LiftId {
  return typeof value === 'string' && (LIFT_IDS as readonly string[]).includes(value);
}

/** Lift named in the URL, or the bench when the value is missing or unknown. */
export function parseLiftParam(value: string | null): LiftId {
  return isLiftId(value) ? value : DEFAULT_LIFT;
}

export const LIFT_RANKS = ['Bronze', 'Argent', 'Or', 'Rubis', 'Diamant', 'Radiant'] as const;
export type LiftRankName = (typeof LIFT_RANKS)[number];

export interface LiftRank {
  name: LiftRankName;
  /** 0 (Bronze) to 5 (Radiant): each tier adds ornaments to the badge. */
  tier: number;
  /** 1 or 2 within Bronze, Argent and Or; 0 for Rubis and Diamant; 1–3 for Radiant. */
  division: number;
}

/** Milestone index of a load on a lift's scale: 0 = Bronze I, 7 = Diamant, 8+ = Radiant. */
function milestoneIndex(lift: TrackedLift, kg: number): number {
  return Math.max(0, Math.floor((kg - lift.fromKg) / lift.stepKg + 1e-9));
}

/** Ranks by milestone index: Bronze I, II, Argent I, II, Or I, II, Rubis, Diamant, then Radiant I–III. */
export function liftRank(lift: TrackedLift, kg: number): LiftRank {
  const k = milestoneIndex(lift, kg);
  if (k >= 8) return { name: 'Radiant', tier: 5, division: Math.min(3, k - 7) };
  if (k === 7) return { name: 'Diamant', tier: 4, division: 0 };
  if (k === 6) return { name: 'Rubis', tier: 3, division: 0 };
  const tier = Math.floor(k / 2);
  return { name: LIFT_RANKS[tier] ?? 'Bronze', tier, division: (k % 2) + 1 };
}

const ROMAN = ['', 'I', 'II', 'III'];

/** "Or II", "Rubis", "Radiant I". */
export function liftRankLabel(lift: TrackedLift, kg: number): string {
  const { name, division } = liftRank(lift, kg);
  return division > 0 ? `${name} ${ROMAN[division] ?? ''}` : name;
}

export interface LiftBadge {
  kg: number;
  unlocked: boolean;
}

/** Badges shown at least up to Radiant I, then two milestones past the best lift. */
const SHOWN_UNTIL_INDEX = 8;

/** A lift's milestones from Bronze I, unlocked by the heaviest load actually lifted. */
export function liftBadges(lift: TrackedLift, bestKg: number): LiftBadge[] {
  const reached = bestKg >= lift.fromKg ? milestoneIndex(lift, bestKg) : -1;
  const last = Math.max(SHOWN_UNTIL_INDEX, reached + 2);
  return Array.from({ length: last + 1 }, (_, k) => {
    const kg = lift.fromKg + k * lift.stepKg;
    return { kg, unlocked: bestKg >= kg };
  });
}

/** Milestones crossed between two best loads (bench 78 → 92 kg: [80, 90]). */
export function liftBadgesCrossed(lift: TrackedLift, beforeKg: number, afterKg: number): number[] {
  return liftBadges(lift, afterKg)
    .filter((b) => b.unlocked && b.kg > beforeKg)
    .map((b) => b.kg);
}

/** Day each milestone was first reached (a set of ≥ 1 rep at or above it), oldest sets first. */
export function liftBadgeDates(
  history: readonly { weightKg: number; reps: number; date: LocalDate; startedAt: number }[],
  milestones: readonly number[],
): Map<number, LocalDate> {
  const sets = [...history].filter((s) => s.reps > 0).sort((a, b) => a.startedAt - b.startedAt);
  const out = new Map<number, LocalDate>();
  for (const kg of milestones) {
    const first = sets.find((s) => s.weightKg >= kg);
    if (first) out.set(kg, first.date);
  }
  return out;
}

/** Smallest plate step on a barbell: loads are rounded to it. */
const LOAD_STEP_KG = 2.5;
const roundLoad = (kg: number) => Math.round(kg / LOAD_STEP_KG) * LOAD_STEP_KG;

/** Warm-up ramp before a heavy single: % of the target × reps. */
const WARMUP: readonly (readonly [number, number])[] = [
  [0.5, 5],
  [0.7, 3],
  [0.85, 1],
  [0.92, 1],
];

/**
 * Sets of a PR attempt: the empty bar × 10, a ramp to ~92 % of the target, then one single
 * at the target. Loads are rounded to 2.5 kg; ramp steps that would repeat a load are skipped.
 */
export function prAttemptPlan(targetKg: number, barKg = 20): { weightKg: number; reps: number }[] {
  const sets = [{ weightKg: barKg, reps: 10 }];
  for (const [ratio, reps] of WARMUP) {
    const weightKg = roundLoad(targetKg * ratio);
    const last = sets[sets.length - 1];
    if (weightKg > (last?.weightKg ?? 0) && weightKg < targetKg) sets.push({ weightKg, reps });
  }
  sets.push({ weightKg: roundLoad(targetKg), reps: 1 });
  return sets;
}

/** Default PR target: the best lift + 2.5 kg (rounded), or the empty bar with no history. */
export function defaultPrTarget(bestKg: number, barKg = 20): number {
  return bestKg > 0 ? roundLoad(bestKg + LOAD_STEP_KG) : barKg;
}

/**
 * The attempt's sets still to do when the lift was already trained this session up to `warmKg`:
 * warm-up sets at or under that load are skipped; the single at the target is always kept.
 */
export function prAttemptSetsAfter(
  plan: readonly { weightKg: number; reps: number }[],
  warmKg: number,
): { weightKg: number; reps: number }[] {
  return plan.filter((s, i) => i === plan.length - 1 || s.weightKg > warmKg);
}
