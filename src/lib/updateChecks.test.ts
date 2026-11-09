import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startUpdateChecks } from './updateChecks';

describe('startUpdateChecks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('checks for updates periodically and stops when asked', () => {
    const update = vi.fn(() => Promise.resolve());
    const stop = startUpdateChecks({ update }, 1000, () => true);
    vi.advanceTimersByTime(3500);
    expect(update).toHaveBeenCalledTimes(3);
    stop();
    vi.advanceTimersByTime(5000);
    expect(update).toHaveBeenCalledTimes(3);
  });

  it('skips checks while offline', () => {
    const update = vi.fn(() => Promise.resolve());
    let online = false;
    startUpdateChecks({ update }, 1000, () => online);
    vi.advanceTimersByTime(2500);
    expect(update).not.toHaveBeenCalled();
    online = true;
    vi.advanceTimersByTime(1000);
    expect(update).toHaveBeenCalledOnce();
  });

  it('handles a failed check instead of leaving an unhandled rejection', () => {
    const failed = Promise.reject(new TypeError('Failed to fetch'));
    // `.catch(fn)` and `.then(_, fn)` both go through `then` with a rejection handler.
    const then = vi.spyOn(failed, 'then');
    const stop = startUpdateChecks({ update: () => failed }, 1000, () => true);
    vi.advanceTimersByTime(1000);
    stop();
    expect(then).toHaveBeenCalledWith(undefined, expect.any(Function));
  });

  it('also checks each time the app comes back to the foreground, until stopped', () => {
    const update = vi.fn(() => Promise.resolve());
    let resume: () => void = () => undefined;
    const unsubscribe = vi.fn();
    const stop = startUpdateChecks(
      { update },
      60_000,
      () => true,
      (onVisible) => {
        resume = onVisible;
        return unsubscribe;
      },
    );
    resume();
    resume();
    expect(update).toHaveBeenCalledTimes(2);
    stop();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
