import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { fromLocalDate, type LocalDate } from '../../domain/date';

/** Charts use local-midnight timestamps on a numeric X axis, so gaps between dates are to scale. */
export const toTime = (date: LocalDate) => fromLocalDate(date).getTime();

export const shortDateLabel = (time: number) => format(new Date(time), 'd MMM', { locale: fr });

/** Shared axis styling: muted ticks, no axis lines, readable at 390 px. */
export const axisProps = {
  tick: { fill: 'var(--color-muted)', fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

/** Evenly spaced X ticks across [min, max] (Recharts picks awkward ones on time axes). */
export function timeTicks(min: number, max: number, count = 4): number[] {
  if (min === max) return [min];
  return Array.from({ length: count }, (_, i) => Math.round(min + ((max - min) * i) / (count - 1)));
}

const NICE_STEPS = [1, 2, 2.5, 5, 10];

/** Smallest "round" number ≥ value (1, 2, 2.5 or 5 times a power of ten). */
export function niceNumber(value: number): number {
  if (!(value > 0)) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = NICE_STEPS.find((s) => s * power >= value - 1e-9) ?? 10;
  return step * power;
}

/**
 * Round axis ticks covering [min, max] in about `count` intervals, e.g. 70–100 → 70, 80, 90, 100
 * instead of Recharts' 70, 78, 86, 94, 100. Use the first/last tick as the axis domain.
 */
export function niceTicks(min: number, max: number, count = 4): number[] {
  const span = max - min;
  const step = niceNumber(span > 0 ? span / count : Math.abs(max) / count || 1);
  const lo = Math.floor(min / step) * step;
  const hi = Math.max(Math.ceil(max / step) * step, lo + step);
  const ticks: number[] = [];
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(Math.round(t * 1000) / 1000);
  return ticks;
}
