import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { accentTapBoost, nextAccentChange } from '../domain/accentRotation';
import { accentBoost, boostAccent, showAccent } from '../lib/accent';
import { haptic } from '../lib/haptics';
import { useAccentSchedule } from './useAccentSchedule';

/**
 * Keeps the app in the colour of the current half hour. The first colour is applied before paint;
 * later changes (the half hour ending while the app is open, coming back to the app, taps on the
 * letter, "Changer maintenant") arrive as a wave.
 */
export function AccentRotation() {
  const { current } = useAccentSchedule();
  const shown = useRef<string | undefined>(undefined);
  useLayoutEffect(() => {
    if (shown.current === current.id) return;
    showAccent(current, shown.current !== undefined);
    shown.current = current.id;
  }, [current]);

  return null;
}

/**
 * Share of the font size between the top of the line box and the baseline, and height of a
 * capital, for Archivo set with a line height of 1: the water rises from one to the other.
 */
const BASELINE_EM = 0.84;
const CAPITAL_EM = 0.76;
/** How long an echo stays mounted: its two rings (`letter-echo`) are over by then. */
const ECHO_MS = 800;

/**
 * The first letter of the home title, filling up like water with the colour that comes next:
 * empty when the half hour starts, full when the app is about to change. The water is a second
 * copy of the letter, masked by a moving wave (`water-fill`).
 *
 * Tapping it skips a seventh of a half hour: the phone ticks, the water jumps up and two outlines
 * of the letter ripple away. The tap that fills the letter changes the colour.
 */
export function AccentLetter({ letter }: { letter: string }) {
  const { next, progress } = useAccentSchedule();
  const [echoes, setEchoes] = useState<number[]>([]);
  const lastEcho = useRef(0);
  const level = BASELINE_EM - progress * CAPITAL_EM;

  function advance() {
    const now = Date.now() + accentBoost();
    const step = accentTapBoost(now);
    const changes = step >= nextAccentChange(now) - now;
    boostAccent(step);
    // A longer double pulse when the colour changes.
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
      className="relative inline-block select-none after:absolute after:-inset-2"
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
          className="letter-echo absolute inset-0"
          style={{ '--echo': next.color } as CSSProperties}
          data-letter={letter}
          aria-hidden="true"
        />
      ))}
    </button>
  );
}
