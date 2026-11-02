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
