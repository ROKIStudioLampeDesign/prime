import { roundMacro, type MacroKey } from '../domain/nutrition';

const integer = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

/** "1 234" for kcal, "12,5" for grams; rounding follows the domain rules. */
export function formatMacro(key: MacroKey, value: number): string {
  return (key === 'kcal' ? integer : oneDecimal).format(roundMacro(key, value));
}

export function formatGrams(grams: number): string {
  return oneDecimal.format(grams);
}

/** Inverse of parseDecimal for prefilling inputs: "12,5", no thousands separator. */
export function toInputValue(value: number | undefined): string {
  return value === undefined ? '' : String(value).replace('.', ',');
}

const weight = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

/** Loads keep 2 decimals (61,25 kg plates must not show as 61,3). */
export function formatWeight(kg: number): string {
  return weight.format(kg);
}

/** Load of a set for display: "62,5 kg", or "PDC" (poids du corps) for a bodyweight set. */
export function setLoadLabel(set: { weightKg: number; bodyweight?: boolean }): string {
  return set.bodyweight ? 'PDC' : `${formatWeight(set.weightKg)} kg`;
}

/** Body weight to 0.1 kg, a scale's precision: "72,4 kg". */
export function formatBodyWeight(kg: number): string {
  return `${formatWeight(Math.round(kg * 10) / 10)} kg`;
}

/** A change in body weight without its unit: "+0,4", "−1,3", "±0" (signed after rounding). */
export function formatWeightChange(kg: number): string {
  const tenths = Math.round(Math.abs(kg) * 10);
  const sign = tenths === 0 ? '±' : kg > 0 ? '+' : '−';
  return `${sign}${formatWeight(tenths / 10)}`;
}

/** A change in body weight: "+0,4 kg", "−1,3 kg", "±0 kg" (signed after rounding). */
export function formatSignedBodyWeight(kg: number): string {
  return `${formatWeightChange(kg)} kg`;
}

/** "12 450" */
export function formatInteger(n: number): string {
  return integer.format(n);
}

/** "12 450 kg" */
export function formatVolume(kg: number): string {
  return `${formatInteger(kg)} kg`;
}

/** "< 1 min", "45 min", "1 h 05". */
export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
}

/** "1:05" for a countdown. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
