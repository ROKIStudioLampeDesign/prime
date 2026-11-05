/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axeViolations } from '../test/utils';
import { BenchBadge, tierFor } from './BenchBadge';

describe('BenchBadge', () => {
  it('names the load and whether it is unlocked', async () => {
    render(
      <>
        <BenchBadge kg={80} unlocked />
        <BenchBadge kg={120} unlocked={false} goal />
      </>,
    );
    expect(screen.getByRole('img', { name: 'Badge bench 80 kg, débloqué' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Badge bench 120 kg, à débloquer' })).toBeTruthy();
    expect(await axeViolations()).toEqual([]);
  });

  it('picks a tier by load: bronze, silver, gold, the goal, then elite', () => {
    const faces = [60, 70, 80, 90, 100, 110, 120, 130, 200].map((kg) => tierFor(kg).face);
    expect(faces[0]).toBe(faces[1]);
    expect(new Set(faces).size).toBe(5);
    expect(tierFor(130).face).toBe(tierFor(200).face);
  });
});
