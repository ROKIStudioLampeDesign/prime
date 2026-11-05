/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isIosStandalone, nudgeViewport, watchIosViewport } from './iosViewport';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, 'standalone');
});

describe('iosViewport', () => {
  it('only treats an installed iOS app as standalone', () => {
    expect(isIosStandalone()).toBe(false);
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
    expect(isIosStandalone()).toBe(true);
  });

  it('nudges by one pixel and restores the scroll and the body height', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    nudgeViewport();
    expect(scrollTo).toHaveBeenNthCalledWith(1, 0, 1);
    expect(scrollTo).toHaveBeenNthCalledWith(2, 0, 0);
    expect(document.body.style.minHeight).toBe('');
  });

  it('does nothing outside an installed iOS app', () => {
    vi.useFakeTimers();
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const stop = watchIosViewport();
    vi.advanceTimersByTime(1000);
    expect(scrollTo).not.toHaveBeenCalled();
    stop();
  });

  it('nudges after launch and when the app comes back, until stopped', () => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    const stop = watchIosViewport();
    vi.advanceTimersByTime(500);
    expect(scrollTo).toHaveBeenCalledTimes(4); // two nudges, each down and back
    window.dispatchEvent(new Event('pageshow'));
    vi.advanceTimersByTime(500);
    expect(scrollTo).toHaveBeenCalledTimes(8);
    stop();
    window.dispatchEvent(new Event('pageshow'));
    vi.advanceTimersByTime(500);
    expect(scrollTo).toHaveBeenCalledTimes(8);
  });
});
