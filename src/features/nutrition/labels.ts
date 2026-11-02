import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { addDays, fromLocalDate, type LocalDate } from '../../domain/date';
import type { MacroKey, MealSlot } from '../../domain/nutrition';

export const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snack: 'Collation',
};

/** Fits four chips on a 390 px row. */
export const SLOT_SHORT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Petit-déj.',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snack: 'Collation',
};

export const MACRO_LABELS: Record<MacroKey, string> = {
  kcal: 'Calories',
  protein: 'Protéines',
  carbs: 'Glucides',
  sugars: 'Sucres',
  fat: 'Lipides',
  fiber: 'Fibres',
};

export const MACRO_UNITS: Record<MacroKey, string> = {
  kcal: 'kcal',
  protein: 'g',
  carbs: 'g',
  sugars: 'g',
  fat: 'g',
  fiber: 'g',
};

export function formatDayLabel(date: LocalDate, today: LocalDate): string {
  if (date === today) return "Aujourd'hui";
  if (date === addDays(today, -1)) return 'Hier';
  if (date === addDays(today, 1)) return 'Demain';
  const sameYear = date.slice(0, 4) === today.slice(0, 4);
  const label = format(fromLocalDate(date), sameYear ? 'EEEE d MMMM' : 'd MMMM yyyy', { locale: fr });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
