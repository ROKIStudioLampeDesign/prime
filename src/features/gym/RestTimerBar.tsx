import { useEffect, useRef } from 'react';
import { CloseIcon } from '../../components/icons';
import { useNow } from '../../components/useNow';
import { setRestEndsAt } from '../../db/workouts';
import { restRemaining } from '../../domain/workout';
import { formatClock } from '../../lib/format';

/** How long the "rest over" state stays visible before the bar hides itself. */
const DONE_VISIBLE_MS = 60_000;
/** Only vibrate if the end was just reached (not when reopening the app long after). */
const VIBRATE_WINDOW_MS = 5_000;

/**
 * Rest countdown. The remaining time is always derived from the stored end timestamp, so it is
 * correct after the phone was locked or the page reloaded; the interval only triggers re-renders.
 */
export function RestTimerBar({ workoutId, endsAt }: { workoutId: number; endsAt: number }) {
  const now = useNow(250);
  const remaining = restRemaining(endsAt, now);
  const vibratedFor = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (remaining > 0 || vibratedFor.current === endsAt) return;
    vibratedFor.current = endsAt;
    if (Date.now() - endsAt < VIBRATE_WINDOW_MS && 'vibrate' in navigator) navigator.vibrate([200, 100, 200]);
  }, [remaining, endsAt]);

  if (now - endsAt > DONE_VISIBLE_MS) return null;
  const done = remaining === 0;
  const shift = (seconds: number) =>
    void setRestEndsAt(workoutId, Math.max(Date.now(), endsAt + seconds * 1000));

  return (
    <div
      role="timer"
      aria-live={done ? 'assertive' : 'off'}
      className="fixed inset-x-0 bottom-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom)+0.5rem)] z-20 px-safe"
    >
      <div
        className={`mx-auto flex max-w-lg items-center gap-1 rounded-2xl py-1.5 pr-1.5 pl-4 float-shadow ${
          done ? 'bg-accent-fill text-accent-fg' : 'bg-surface-2'
        }`}
      >
        <div className="flex-1">
          <p className={`text-xs ${done ? '' : 'text-muted'}`}>{done ? 'Repos terminé' : 'Repos'}</p>
          <p className="text-3xl leading-tight numeral">{formatClock(remaining)}</p>
        </div>
        {!done && (
          <>
            <TimerButton label="Retirer 15 secondes" onClick={() => shift(-15)}>
              −15
            </TimerButton>
            <TimerButton label="Ajouter 15 secondes" onClick={() => shift(15)}>
              +15
            </TimerButton>
          </>
        )}
        <button
          type="button"
          aria-label={done ? 'Fermer' : 'Passer le repos'}
          onClick={() => void setRestEndsAt(workoutId, undefined)}
          className="flex size-11 items-center justify-center rounded-xl active:bg-black/10"
        >
          <CloseIcon className="size-5" />
        </button>
      </div>
    </div>
  );
}

function TimerButton({ label, onClick, children }: { label: string; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-11 min-w-12 items-center justify-center rounded-xl bg-surface px-2 text-sm font-semibold tabular-nums active:opacity-70"
    >
      {children}
    </button>
  );
}
