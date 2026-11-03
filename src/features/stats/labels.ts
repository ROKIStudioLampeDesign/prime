import type { PersonalRecord } from '../../domain/strength';
import { formatBodyWeight, formatSignedBodyWeight, formatWeight } from '../../lib/format';

/** The set behind a record: "72,5 kg × 6" (or a note for single-rep 1RMs). */
export function recordDetail(record: PersonalRecord): string {
  const set = `${formatWeight(record.weightKg)} kg × ${record.reps}`;
  return record.kind === 'e1rm' && record.reps === 1 ? 'série de 1 rép.' : set;
}

/** "72,4 kg" with 0.1 precision. */
export const kg = formatBodyWeight;

/** "+0,4 kg", "−1,2 kg", "±0 kg". */
export const signedKg = formatSignedBodyWeight;
