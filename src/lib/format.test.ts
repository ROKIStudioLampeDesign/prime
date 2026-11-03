import { describe, expect, it } from 'vitest';
import {
  formatBodyWeight,
  formatClock,
  formatDuration,
  formatInteger,
  formatSignedBodyWeight,
  formatVolume,
  formatWeight,
  formatWeightChange,
} from './format';

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
    expect(nb(formatInteger(12450.6))).toBe('12 451');
    expect(formatInteger(0)).toBe('0');
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

describe('body weight formatting', () => {
  it('rounds to 0.1 kg', () => {
    expect(formatBodyWeight(72.44)).toBe('72,4 kg');
    expect(formatBodyWeight(80)).toBe('80 kg');
  });

  it('signs the rounded value, so tiny changes read as no change', () => {
    expect(formatSignedBodyWeight(0.44)).toBe('+0,4 kg');
    expect(formatSignedBodyWeight(-1.25)).toBe('−1,3 kg');
    expect(formatSignedBodyWeight(0.04)).toBe('±0 kg');
    expect(formatSignedBodyWeight(-0.04)).toBe('±0 kg');
    expect(formatSignedBodyWeight(0)).toBe('±0 kg');
    expect(formatWeightChange(-1.25)).toBe('−1,3');
    expect(formatWeightChange(0.04)).toBe('±0');
  });
});
