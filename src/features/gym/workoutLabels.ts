import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Workout } from '../../db/db';
import { fromLocalDate, type LocalDate } from '../../domain/date';

/** "lun. 2 nov." */
export function shortDay(date: LocalDate): string {
  return format(fromLocalDate(date), 'EEE d MMM', { locale: fr });
}

/** The two halves of a history row's date block: "lun." and "2". */
export function dayBlock(date: LocalDate): { weekday: string; day: string } {
  const d = fromLocalDate(date);
  return { weekday: format(d, 'EEE', { locale: fr }), day: format(d, 'd') };
}

/** "Lundi 2 novembre" */
export function longDay(date: LocalDate): string {
  const s = format(fromLocalDate(date), 'EEEE d MMMM', { locale: fr });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function workoutTitle(workout: Pick<Workout, 'name' | 'status' | 'date'>): string {
  if (workout.name) return workout.name;
  return workout.status === 'active' ? 'Séance en cours' : `Séance du ${shortDay(workout.date)}`;
}
