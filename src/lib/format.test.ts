import { describe, expect, it } from 'vitest';
import { formatClock, formatDuration, formatVolume, formatWeight } from './format';

// fr-FR uses a (narrow) no-break space as thousands separator.
const NO_BREAK_SPACES = new RegExp(`[${String.fromCharCode(0x202f, 0xa0)}]`, 'g');
const nb = (s: string) => s.replace(NO_BREAK_SPACES, ' ');

describe('gym formatting', () => {
  it('keeps two decimals for weights', () => {
    expect(formatWeight(61.25)).toBe('61,25');
    expect(formatWeight(60)).toBe('60');
  });

  it('formats volume as integer kg', () => {
    expect(nb(formatVolume(12450.4))).toBe('12 450 kg');
  });

  it('formats durations', () => {
    expect(formatDuration(30_000)).toBe('< 1 min');
    expect(formatDuration(45 * 60_000)).toBe('45 min');
    expect(formatDuration(65 * 60_000)).toBe('1 h 05');
  });

  it('formats countdowns', () => {
    expect(formatClock(65)).toBe('1:05');
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(-3)).toBe('0:00');
  });
});
