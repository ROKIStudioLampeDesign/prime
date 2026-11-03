import { useSyncExternalStore } from 'react';
import { msUntilNextLocalMidnight, todayLocalDate, type LocalDate } from '../domain/date';

/*
 * One shared clock for every useToday() caller: a single timer to the next local midnight, plus a
 * check when the app returns to the foreground (timers don't fire while the phone is locked).
 * All callers re-render in the same pass, so components on a screen never disagree about the day.
 */
const listeners = new Set<() => void>();
let timer: number | undefined;

function schedule() {
  window.clearTimeout(timer);
  timer = window.setTimeout(notify, msUntilNextLocalMidnight(new Date()) + 50);
}

function notify() {
  schedule();
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    schedule();
    document.addEventListener('visibilitychange', notify);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', notify);
    }
  };
}

// A string snapshot: React only re-renders when the day has actually changed.
const getSnapshot = (): LocalDate => todayLocalDate();

/**
 * Today's local date, kept current while the app stays open: re-renders at local midnight and
 * when the app returns to the foreground. Use it instead of calling `todayLocalDate()` during
 * render, which freezes "today" at the last render.
 */
export function useToday(): LocalDate {
  return useSyncExternalStore(subscribe, getSnapshot);
}
