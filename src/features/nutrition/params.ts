import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { isLocalDate, todayLocalDate, type LocalDate } from '../../domain/date';
import { MEAL_SLOTS, type MealSlot } from '../../domain/nutrition';

export function parseDateParam(raw: string | null): LocalDate | undefined {
  return raw && isLocalDate(raw) ? raw : undefined;
}

export function parseSlotParam(raw: string | null): MealSlot | undefined {
  return MEAL_SLOTS.find((slot) => slot === raw);
}

export function diaryPath(date: LocalDate): string {
  return date === todayLocalDate() ? '/nutrition' : `/nutrition?date=${date}`;
}

export function addEntryPath(date: LocalDate, slot?: MealSlot): string {
  return `/nutrition/add?date=${date}${slot ? `&slot=${slot}` : ''}`;
}

/** The diary day, kept in the URL (`?date=`) so back navigation and reloads keep it. Defaults to today. */
export function useDiaryDate(): [LocalDate, (date: LocalDate) => void] {
  const [params, setParams] = useSearchParams();
  const date = parseDateParam(params.get('date')) ?? todayLocalDate();
  const setDate = useCallback(
    (next: LocalDate) => setParams(next === todayLocalDate() ? {} : { date: next }, { replace: true }),
    [setParams],
  );
  return [date, setDate];
}
