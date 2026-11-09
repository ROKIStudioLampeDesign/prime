import { describe, expect, it } from 'vitest';
import { barLoading, plateCounts, platesFor } from './plates';

describe('platesFor', () => {
  it('loads the heaviest plates first, never a 25 kg or 15 kg plate', () => {
    expect(platesFor(15)).toEqual([10, 5]);
    expect(platesFor(35)).toEqual([20, 10, 5]);
    expect(platesFor(40)).toEqual([20, 20]);
    expect(platesFor(50)).toEqual([20, 20, 10]);
    expect(platesFor(41.25)).toEqual([20, 20, 1.25]);
    expect(platesFor(3.75)).toEqual([2.5, 1.25]);
    expect(platesFor(25)).toEqual([20, 5]);
  });

  it('drops what no plate can make, and handles zero or invalid weights', () => {
    expect(platesFor(0.5)).toEqual([]);
    expect(platesFor(10.6)).toEqual([10]);
    expect(platesFor(0)).toEqual([]);
    expect(platesFor(-5)).toEqual([]);
    expect(platesFor(Number.NaN)).toEqual([]);
  });
});

describe('barLoading', () => {
  it('gives the plates per side for a total on a 20 kg bar', () => {
    expect(barLoading(100)).toEqual([20, 20]);
    expect(barLoading(120)).toEqual([20, 20, 10]);
    expect(barLoading(102.5)).toEqual([20, 20, 1.25]);
  });

  it('shows the bare bar at or below 20 kg', () => {
    expect(barLoading(20)).toEqual([]);
    expect(barLoading(0)).toEqual([]);
  });
});

describe('plateCounts', () => {
  it('groups plates by weight, heaviest first', () => {
    expect(plateCounts([20, 20, 10, 1.25])).toEqual([
      { kg: 20, count: 2 },
      { kg: 10, count: 1 },
      { kg: 1.25, count: 1 },
    ]);
    expect(plateCounts([])).toEqual([]);
  });
});
