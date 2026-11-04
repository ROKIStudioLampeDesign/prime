import { useEffect, useRef, type MouseEvent, type PointerEvent } from 'react';

/** How long a finger must stay down before the long press fires. */
export const LONG_PRESS_MS = 500;
/** Moving further than this (scrolling) cancels the press. */
const MOVE_TOLERANCE_PX = 10;

/**
 * Long-press handlers to spread on a tappable element (typically a link). A long press calls
 * `onLongPress` and swallows the click that follows, so the link doesn't also navigate. A
 * right-click / context menu triggers it too (desktop, and iOS when the callout would open).
 */
export function useLongPress(onLongPress: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const start = useRef<{ x: number; y: number } | undefined>(undefined);
  const fired = useRef(false);
  const callback = useRef(onLongPress);

  useEffect(() => {
    callback.current = onLongPress;
  });

  useEffect(() => () => clearTimeout(timer.current), []);

  function cancel() {
    clearTimeout(timer.current);
    timer.current = undefined;
    start.current = undefined;
  }

  function fire() {
    cancel();
    fired.current = true;
    navigator.vibrate?.(10);
    callback.current();
  }

  return {
    onPointerDown(event: PointerEvent) {
      // Reset on every press: after a long press the release usually lands on the sheet that
      // opened, so no click comes back here to clear the flag.
      fired.current = false;
      if (event.button !== 0) return;
      start.current = { x: event.clientX, y: event.clientY };
      clearTimeout(timer.current);
      timer.current = setTimeout(fire, LONG_PRESS_MS);
    },
    onPointerMove(event: PointerEvent) {
      if (!start.current) return;
      const dx = event.clientX - start.current.x;
      const dy = event.clientY - start.current.y;
      if (Math.hypot(dx, dy) > MOVE_TOLERANCE_PX) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onContextMenu(event: MouseEvent) {
      event.preventDefault();
      if (!fired.current) fire();
    },
    onClick(event: MouseEvent) {
      if (fired.current) {
        event.preventDefault();
        fired.current = false;
      }
    },
  };
}
