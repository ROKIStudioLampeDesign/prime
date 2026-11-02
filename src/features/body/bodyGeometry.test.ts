import { describe, expect, it } from 'vitest';
import { musclesForView, type BodyView } from '../../domain/muscles';
import { approxArea, MUSCLE_SHAPES, SILHOUETTE_HALF } from './bodyGeometry';

const numbers = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

describe('body geometry', () => {
  it.each<BodyView>(['front', 'back'])('the %s view draws exactly the muscles of that view', (view) => {
    const drawn = new Set(MUSCLE_SHAPES[view].map((s) => s.muscle));
    expect([...drawn].sort()).toEqual(musclesForView(view).sort());
  });

  it('keeps every coordinate on the 200 × 400 canvas, left half for mirrored shapes', () => {
    for (const view of ['front', 'back'] as const) {
      for (const shape of MUSCLE_SHAPES[view]) {
        const values = numbers(shape.d);
        expect(values.length % 2, shape.muscle).toBe(0);
        for (let i = 0; i < values.length; i += 2) {
          const x = values[i] ?? NaN;
          const y = values[i + 1] ?? NaN;
          expect(x, `${view} ${shape.muscle}`).toBeGreaterThanOrEqual(0);
          expect(x, `${view} ${shape.muscle}`).toBeLessThanOrEqual(shape.mirror ? 100 : 200);
          expect(y, `${view} ${shape.muscle}`).toBeGreaterThanOrEqual(0);
          expect(y, `${view} ${shape.muscle}`).toBeLessThanOrEqual(400);
        }
      }
    }
    expect(Math.max(...numbers(SILHOUETTE_HALF).filter((_, i) => i % 2 === 0))).toBeLessThanOrEqual(100);
  });

  it('ranks thin muscles as smaller than their neighbours (they must win taps on overlaps)', () => {
    const area = (view: BodyView, muscle: string) =>
      Math.max(...MUSCLE_SHAPES[view].filter((s) => s.muscle === muscle).map((s) => approxArea(s.d)));
    expect(area('front', 'shoulders_side')).toBeLessThan(area('front', 'shoulders_front'));
    expect(area('back', 'shoulders_side')).toBeLessThan(area('back', 'shoulders_rear'));
    expect(area('front', 'traps')).toBeLessThan(area('front', 'chest'));
    expect(approxArea('M0 0 L10 0 L10 10 L0 10 Z')).toBe(100);
  });
});
