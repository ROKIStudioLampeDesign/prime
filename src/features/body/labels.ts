import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { fromLocalDate, type LocalDate } from '../../domain/date';

/** "aujourd’hui", "hier", "il y a 5 jours", or "jamais". */
export function agoLabel(days: number | undefined): string {
  if (days === undefined) return 'jamais';
  if (days === 0) return 'aujourd’hui';
  if (days === 1) return 'hier';
  return `il y a ${days} jours`;
}

/** Compact form for lists: "auj.", "1 j", "12 j", "—". */
export function shortAgo(days: number | undefined): string {
  if (days === undefined) return 'Jamais';
  if (days === 0) return 'Auj.';
  return `${days} j`;
}

/** "Lundi 2 novembre 2026" */
export function longDate(date: LocalDate): string {
  const s = format(fromLocalDate(date), 'EEEE d MMMM yyyy', { locale: fr });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function shortDate(date: LocalDate): string {
  return format(fromLocalDate(date), 'd MMM', { locale: fr });
}
