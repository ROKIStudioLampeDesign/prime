/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LIFT_IDS, TRACKED_LIFTS } from '../domain/lifts';
import { axeViolations } from '../test/utils';
import { LiftBadge } from './LiftBadge';

describe('LiftBadge', () => {
  it('names the load, its rank and whether it is unlocked', async () => {
    render(
      <>
        <LiftBadge lift="bench" kg={80} unlocked />
        <LiftBadge lift="squat" kg={165} unlocked={false} />
      </>,
    );
    expect(screen.getByRole('img', { name: 'Badge bench 80 kg, Argent I, débloqué' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Badge squat 165 kg, Rubis, à débloquer' })).toBeTruthy();
    expect(await axeViolations()).toEqual([]);
  });

  it('engraves a different pictogram for each lift at the same rank', () => {
    const { container } = render(
      <>
        {LIFT_IDS.map((id) => (
          <LiftBadge key={id} lift={id} kg={TRACKED_LIFTS[id].fromKg} unlocked />
        ))}
      </>,
    );
    const markup = [...container.querySelectorAll('svg')].map((svg) =>
      svg.innerHTML.replace(/id="[^"]*"|url\(#[^)]*\)/g, ''),
    );
    expect(new Set(markup).size).toBe(LIFT_IDS.length);
  });

  it('adds ornaments with each rank, up to Obsidienne', () => {
    // One load per rank (divisions add pips, so they aren't compared).
    const loads = [60, 80, 100, 120, 130, 140];
    const { container } = render(
      <>
        {loads.map((kg) => (
          <LiftBadge key={kg} lift="bench" kg={kg} unlocked />
        ))}
      </>,
    );
    const counts = [...container.querySelectorAll('svg')].map((svg) => svg.querySelectorAll('*').length);
    counts.slice(1).forEach((count, i) => expect(count).toBeGreaterThan(counts[i] ?? 0));
    expect(screen.getByRole('img', { name: 'Badge bench 130 kg, Diamant, débloqué' })).toBeTruthy();
  });
});
