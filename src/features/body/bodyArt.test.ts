import { describe, expect, it } from 'vitest';
import { MUSCLE_IDS, musclesForView, type BodyView } from '../../domain/muscles';
import { approxArea, BODY_ART } from './bodyArt';

const numbers = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

describe('body art', () => {
  it.each<BodyView>(['front', 'back'])('the %s view draws exactly the muscles of that view', (view) => {
    const drawn = new Set(BODY_ART[view].parts.flatMap((p) => (p.k === 'muscle' && p.m ? [p.m] : [])));
    expect([...drawn].sort()).toEqual(musclesForView(view).sort());
  });

  it('uses only known muscle ids, and every muscle shape names one', () => {
    for (const view of ['front', 'back'] as const) {
      for (const part of BODY_ART[view].parts) {
        if (part.k === 'muscle') expect(MUSCLE_IDS, `${view} ${part.d.slice(0, 20)}`).toContain(part.m);
        else expect(part.m).toBeUndefined();
      }
    }
  });

  it('keeps every shape inside its view box, with finite coordinates', () => {
    for (const view of ['front', 'back'] as const) {
      const [x, y, w, h] = BODY_ART[view].viewBox.split(' ').map(Number);
      for (const part of BODY_ART[view].parts) {
        const values = numbers(part.d);
        expect(values.every(Number.isFinite)).toBe(true);
        for (let i = 0; i + 1 < values.length; i += 2) {
          expect(values[i]).toBeGreaterThanOrEqual((x ?? 0) - 1);
          expect(values[i]).toBeLessThanOrEqual((x ?? 0) + (w ?? 0) + 1);
          expect(values[i + 1]).toBeGreaterThanOrEqual((y ?? 0) - 1);
          expect(values[i + 1]).toBeLessThanOrEqual((y ?? 0) + (h ?? 0) + 1);
        }
      }
    }
  });

  it('splits each deltoid into its heads with clip paths, separated by seams', () => {
    const heads = (view: BodyView) => BODY_ART[view].parts.filter((p) => p.clip).map((p) => p.m);
    expect(new Set(heads('front'))).toEqual(new Set(['chest', 'shoulders_front', 'shoulders_side']));
    expect(new Set(heads('back'))).toEqual(new Set(['shoulders_rear', 'shoulders_side']));
    expect(BODY_ART.front.seams.length).toBeGreaterThan(0);
    expect(BODY_ART.back.seams.length).toBeGreaterThan(0);
  });

  it('measures shape areas for hit ranking', () => {
    expect(approxArea('M0 0 L10 0 L10 10 L0 10 Z')).toBe(100);
  });
});
