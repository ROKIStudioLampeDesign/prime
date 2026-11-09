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

  it('adds ornaments with each rank, up to Obsidienne', () => {
    // One load per rank (divisions add pips, so they aren't compared).
    const loads = [60, 80, 100, 120, 130, 140];
    const { container } = render(
      <>
        {loads.map((kg) => (
          <BenchBadge key={kg} kg={kg} unlocked />
        ))}
      </>,
    );
    const counts = [...container.querySelectorAll('svg')].map((svg) => svg.querySelectorAll('*').length);
    counts.slice(1).forEach((count, i) => expect(count).toBeGreaterThan(counts[i] ?? 0));
    expect(screen.getByRole('img', { name: 'Badge bench 130 kg, Diamant, débloqué' })).toBeTruthy();
  });
});
