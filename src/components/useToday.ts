import { useEffect, useState } from 'react';
import { msUntilNextLocalMidnight, todayLocalDate, type LocalDate } from '../domain/date';

/**
 * Today's local date, kept current while the app stays open: re-renders at local midnight and
 * when the app returns to the foreground (timers don't fire while the phone is locked). Use it
 * instead of calling `todayLocalDate()` during render, which freezes "today" at the last render.
 */
export function useToday(): LocalDate {
  const [today, setToday] = useState(() => todayLocalDate());
  useEffect(() => {
    let timer: number | undefined;
    const refresh = () => {
      setToday(todayLocalDate());
      window.clearTimeout(timer);
      timer = window.setTimeout(refresh, msUntilNextLocalMidnight(new Date()) + 50);
    };
    refresh();
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  return today;
}
