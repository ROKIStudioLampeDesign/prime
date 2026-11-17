import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { accentSlot, accentTapBoost, nextAccentChange } from '../domain/accentRotation';
import { accentBoost, accentForSlot, boostAccent, showAccent, startNextAccentWaveAt } from '../lib/accent';
import { haptic } from '../lib/haptics';
import { useAccentSchedule } from './useAccentSchedule';

/**
 * Keeps the app in the colour of the current slot. The first colour is applied before paint;
 * changes seen while the app is on screen (the slot ending, taps on the letter, "Changer
 * maintenant") arrive as a wave. A change that happened while the app was in the background is
 * applied as soon as it comes back, without a wave.
 */
export function AccentRotation() {
  const { current } = useAccentSchedule();
  const shown = useRef<string | undefined>(undefined);
  useLayoutEffect(() => {
    if (shown.current === current.id) return;
    showAccent(current, shown.current !== undefined);
    shown.current = current.id;
  }, [current]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== 'visible') return;
      // The rendered schedule still holds the colour from before the app went away: apply the
      // current one now, so the next render finds it already shown.
      const accent = accentForSlot(accentSlot(Date.now() + accentBoost()));
      if (shown.current === accent.id) return;
      showAccent(accent, false);
      shown.current = accent.id;
    }
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onVisible);
    };
  }, []);

  return null;
}

/**
 * Share of the font size between the top of the line box and the baseline, and height of a
 * capital, for Archivo set with a line height of 1: the water rises from one to the other.
 */
const BASELINE_EM = 0.84;
const CAPITAL_EM = 0.76;
/** How long a ripple stays mounted: its animation (`glass-ripple`) is over by then. */
const ECHO_MS = 1100;

/**
 * The first letter of the home title, filling up like water with the colour that comes next:
 * empty when the slot starts, full when the app is about to change. The water is a second
 * copy of the letter, masked by a moving wave (`water-fill`).
 *
 * Tapping it skips a seventh of a slot: the water jumps up and a disc of glass swells from
 * behind the letter. The tap that fills the letter changes the colour, from the letter.
 */
export function AccentLetter({ letter }: { letter: string }) {
  const { next, progress } = useAccentSchedule();
  const [echoes, setEchoes] = useState<number[]>([]);
  const lastEcho = useRef(0);
  const level = BASELINE_EM - progress * CAPITAL_EM;

  function advance(event: MouseEvent<HTMLButtonElement>) {
    const now = Date.now() + accentBoost();
    const step = accentTapBoost(now);
    const changes = step >= nextAccentChange(now) - now;
    if (changes) {
      // The colour change grows from the letter instead of the bottom of the screen.
      const box = event.currentTarget.getBoundingClientRect();
      startNextAccentWaveAt(box.left + box.width / 2, box.top + box.height / 2);
    }
    boostAccent(step);
    // Android only: a tick, longer when the colour changes.
    haptic(changes ? [30, 60, 50] : 20);
    lastEcho.current += 1;
    const id = lastEcho.current;
    setEchoes((ids) => [...ids, id]);
    window.setTimeout(() => setEchoes((ids) => ids.filter((other) => other !== id)), ECHO_MS);
  }

  return (
    <button
      type="button"
      onClick={advance}
      aria-label="Avancer vers la prochaine couleur"
      // The pseudo-element widens the touch target to 44 px around the letter.
      className="relative isolate inline-block select-none after:absolute after:-inset-2"
    >
      {letter}
      <span
        className="absolute inset-0 water-fill"
        style={{ color: next.color, '--level': `${level.toFixed(3)}em` } as CSSProperties}
        // Drawn by CSS (`content: attr(data-letter)`), so the title's text stays "Aujourd'hui".
        data-letter={letter}
        aria-hidden="true"
      />
      {echoes.map((id) => (
        <span
          key={id}
          className="glass-ripple"
          style={{ '--echo': next.color } as CSSProperties}
          aria-hidden="true"
        />
      ))}
    </button>
  );
}
