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

/** "12 450 kg" */
export function formatVolume(kg: number): string {
  return `${integer.format(kg)} kg`;
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
