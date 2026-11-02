import { describe, expect, it } from 'vitest';
import { parseDecimal } from './number';

describe('parseDecimal', () => {
  it('parses integers and decimals with a dot or a comma', () => {
    expect(parseDecimal('12')).toBe(12);
    expect(parseDecimal('12,5')).toBe(12.5);
    expect(parseDecimal('12.5')).toBe(12.5);
    expect(parseDecimal(',5')).toBe(0.5);
    expect(parseDecimal('3,')).toBe(3);
    expect(parseDecimal(' 1 200 ')).toBe(1200);
    expect(parseDecimal('-4')).toBe(-4);
  });

  it('returns undefined for empty input', () => {
    expect(parseDecimal('')).toBeUndefined();
    expect(parseDecimal('   ')).toBeUndefined();
  });

  it('returns NaN for invalid input', () => {
    expect(parseDecimal('abc')).toBeNaN();
    expect(parseDecimal('1,2,3')).toBeNaN();
    expect(parseDecimal('12g')).toBeNaN();
    expect(parseDecimal('.')).toBeNaN();
  });
});
