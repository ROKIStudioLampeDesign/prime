import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Workout } from '../../db/db';
import { fromLocalDate, type LocalDate } from '../../domain/date';

/** "lun. 2 nov." */
export function shortDay(date: LocalDate): string {
  return format(fromLocalDate(date), 'EEE d MMM', { locale: fr });
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
