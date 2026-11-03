/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useToday } from './useToday';

describe('useToday', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the local date and rolls over at midnight while the app stays open', () => {
    vi.setSystemTime(new Date(2026, 10, 2, 23, 59, 50));
    const { result } = renderHook(() => useToday());
    expect(result.current).toBe('2026-11-02');
    act(() => {
      vi.advanceTimersByTime(15_000);
    });
    expect(result.current).toBe('2026-11-03');
    // …and keeps doing so the next night.
    act(() => {
      vi.advanceTimersByTime(24 * 3_600_000);
    });
    expect(result.current).toBe('2026-11-04');
  });

  it('catches up when the app comes back to the foreground (timers sleep while locked)', () => {
    vi.setSystemTime(new Date(2026, 10, 2, 22, 0, 0));
    const { result } = renderHook(() => useToday());
    // The phone was locked: the clock moved on but no timer fired.
    vi.setSystemTime(new Date(2026, 10, 3, 7, 30, 0));
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current).toBe('2026-11-03');
  });
});
