import { describe, expect, it } from 'vitest';
import { niceNumber, niceTicks, timeTicks } from './chartUtils';

describe('chart ticks', () => {
  it('rounds up to nice numbers', () => {
    expect(niceNumber(7.5)).toBe(10);
    expect(niceNumber(1265)).toBe(2000);
    expect(niceNumber(88)).toBe(100);
    expect(niceNumber(2)).toBe(2);
    expect(niceNumber(0)).toBe(1);
  });

  it('produces round, evenly spaced ticks covering the range', () => {
    expect(niceTicks(70, 100)).toEqual([70, 80, 90, 100]);
    expect(niceTicks(0, 2530, 3)).toEqual([0, 1000, 2000, 3000]);
    expect(niceTicks(0, 176, 3)).toEqual([0, 100, 200]);
    expect(niceTicks(77, 85)).toEqual([76, 78, 80, 82, 84, 86]);
  });

  it('handles a flat range', () => {
    const ticks = niceTicks(80, 80);
    expect(ticks[0]).toBeLessThanOrEqual(80);
    expect(ticks.at(-1)).toBeGreaterThan(80);
  });

  it('spreads time ticks evenly', () => {
    expect(timeTicks(0, 300, 4)).toEqual([0, 100, 200, 300]);
    expect(timeTicks(5, 5)).toEqual([5]);
  });
});
