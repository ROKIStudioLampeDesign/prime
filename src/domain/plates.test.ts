import { describe, expect, it } from 'vitest';
import { barbellLoad, platesFor } from './plates';

describe('platesFor', () => {
  it('loads the heaviest plates first', () => {
    expect(platesFor(40)).toEqual([25, 15]);
    expect(platesFor(50)).toEqual([25, 25]);
    expect(platesFor(41.25)).toEqual([25, 15, 1.25]);
    expect(platesFor(3.75)).toEqual([2.5, 1.25]);
  });

  it('drops what no plate can make, and handles zero or invalid weights', () => {
    expect(platesFor(0.5)).toEqual([]);
    expect(platesFor(10.6)).toEqual([10]);
    expect(platesFor(0)).toEqual([]);
    expect(platesFor(-5)).toEqual([]);
    expect(platesFor(Number.NaN)).toEqual([]);
  });
});

describe('barbellLoad', () => {
  it('shows the best lift and the plates each side still needs', () => {
    expect(barbellLoad(100, 120)).toEqual({ current: [25, 15], missing: [10] });
    expect(barbellLoad(102.5, 120)).toEqual({ current: [25, 15, 1.25], missing: [5, 2.5, 1.25] });
  });

  it('shows the bare bar below 20 kg, and nothing missing once reached', () => {
    expect(barbellLoad(0, 60)).toEqual({ current: [], missing: [20] });
    expect(barbellLoad(15, 20)).toEqual({ current: [], missing: [] });
    expect(barbellLoad(125, 120)).toEqual({ current: [25, 25, 2.5], missing: [] });
    expect(barbellLoad(120, 120).missing).toEqual([]);
  });
});
