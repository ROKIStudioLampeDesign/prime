import { describe, expect, it } from 'vitest';
import { fitWithin } from './image';

describe('fitWithin', () => {
  it('keeps small images unchanged', () => {
    expect(fitWithin(640, 480, 800)).toEqual({ width: 640, height: 480 });
    expect(fitWithin(800, 800, 800)).toEqual({ width: 800, height: 800 });
  });

  it('scales the longest side down to max', () => {
    expect(fitWithin(4032, 3024, 800)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(3024, 4032, 800)).toEqual({ width: 600, height: 800 });
  });

  it('never returns a zero dimension', () => {
    expect(fitWithin(10000, 1, 800)).toEqual({ width: 800, height: 1 });
  });
});
