import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { accentSlot, nextAccentChange } from '../domain/accentRotation';
import { accentForSlot, showAccent } from '../lib/accent';
import { useAccentSchedule, useAccentSkips } from './useAccentSchedule';

/**
 * Keeps the app in the colour of the current half hour. The first colour is applied before paint;
 * later changes (the half hour ending while the app is open, coming back to the app, "Changer
 * maintenant") arrive as a wave.
 */
export function AccentRotation() {
  const skips = useAccentSkips();
  const [slot, setSlot] = useState(() => accentSlot(Date.now()));

  useEffect(() => {
    let timer = 0;
    const schedule = () => {
      window.clearTimeout(timer);
      // Timers stop while the phone is locked: the slot is always read from the clock.
      timer = window.setTimeout(tick, nextAccentChange(Date.now()) - Date.now() + 50);
    };
    const tick = () => {
      setSlot(accentSlot(Date.now()));
      schedule();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    schedule();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const accent = accentForSlot(slot + skips);
  const shown = useRef<string | undefined>(undefined);
  useLayoutEffect(() => {
    if (shown.current === accent.id) return;
    showAccent(accent, shown.current !== undefined);
    shown.current = accent.id;
  }, [accent]);

  return null;
}

/**
 * Share of the font size between the top of the line box and the baseline, and height of a
 * capital, for Archivo set with a line height of 1: the water rises from one to the other.
 */
const BASELINE_EM = 0.84;
const CAPITAL_EM = 0.76;

/**
 * The first letter of a screen title, filling up like water with the colour that comes next:
 * empty when the half hour starts, full when the app is about to change. The water is a second
 * copy of the letter, masked by a moving wave (`water-fill`).
 */
export function AccentLetter({ letter }: { letter: string }) {
  const { next, progress } = useAccentSchedule();
  const level = BASELINE_EM - progress * CAPITAL_EM;
  return (
    <span className="relative inline-block">
      {letter}
      <span
        className="absolute inset-0 water-fill"
        style={{ color: next.color, '--level': `${level.toFixed(3)}em` } as CSSProperties}
        // Drawn by CSS (`content: attr(data-letter)`), so the title's text stays "Aujourd'hui".
        data-letter={letter}
        aria-hidden="true"
      />
    </span>
  );
}
