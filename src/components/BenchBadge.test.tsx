/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axeViolations } from '../test/utils';
import { BenchBadge } from './BenchBadge';

describe('BenchBadge', () => {
  it('names the load, its rank and whether it is unlocked', async () => {
    render(
      <>
        <BenchBadge kg={80} unlocked />
        <BenchBadge kg={120} unlocked={false} />
      </>,
    );
    expect(screen.getByRole('img', { name: 'Badge bench 80 kg, Argent I, débloqué' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Badge bench 120 kg, Rubis, à débloquer' })).toBeTruthy();
    expect(await axeViolations()).toEqual([]);
  });

  it('adds ornaments with the rank: no wings in Bronze, wings from Or, a crown from Rubis', () => {
    const { container } = render(
      <>
        <BenchBadge kg={60} unlocked />
        <BenchBadge kg={100} unlocked />
        <BenchBadge kg={110} unlocked />
        <BenchBadge kg={120} unlocked />
      </>,
    );
    const counts = [...container.querySelectorAll('svg')].map((svg) => svg.querySelectorAll('path').length);
    const [bronze, orI, orII, rubis] = counts;
    expect(orI).toBeGreaterThan(bronze ?? 0);
    expect(orII).toBeGreaterThan(orI ?? 0);
    expect(rubis).toBeGreaterThan(orII ?? 0);
  });
});
