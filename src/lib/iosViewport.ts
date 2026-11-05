/**
 * iOS home-screen apps sometimes lay out the first screen with a viewport that is short by the
 * home indicator, so the fixed tab bar sits too high above a black strip until something
 * scrolls or the page changes. A one-pixel scroll and back makes WebKit recompute the viewport.
 * Only runs in an installed iOS app (`navigator.standalone`); everywhere else it does nothing.
 */
export function isIosStandalone(nav: Navigator = navigator): boolean {
  return (nav as Navigator & { standalone?: boolean }).standalone === true;
}

/** Forces WebKit to re-measure the viewport: grow the page by 1 px, scroll 1 px, then undo both. */
export function nudgeViewport(win: Window = window): void {
  const { body } = win.document;
  const x = win.scrollX;
  const y = win.scrollY;
  const previous = body.style.minHeight;
  body.style.minHeight = 'calc(100dvh + 1px)';
  win.scrollTo(x, y + 1);
  win.requestAnimationFrame(() => {
    win.scrollTo(x, y);
    body.style.minHeight = previous;
  });
}

/**
 * Nudges the viewport after launch and whenever the app comes back to the foreground. Returns a
 * cleanup function.
 */
export function watchIosViewport(win: Window = window): () => void {
  if (!isIosStandalone(win.navigator)) return () => {};
  const timers: number[] = [];
  const nudgeSoon = () => {
    // Once the first frame is painted, then again after the launch animation settles.
    for (const delay of [50, 400]) timers.push(win.setTimeout(() => nudgeViewport(win), delay));
  };
  const onVisible = () => {
    if (win.document.visibilityState === 'visible') nudgeSoon();
  };
  nudgeSoon();
  win.addEventListener('pageshow', nudgeSoon);
  win.document.addEventListener('visibilitychange', onVisible);
  return () => {
    for (const t of timers) win.clearTimeout(t);
    win.removeEventListener('pageshow', nudgeSoon);
    win.document.removeEventListener('visibilitychange', onVisible);
  };
}
