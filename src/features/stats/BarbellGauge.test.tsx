/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BarbellGauge } from './BarbellGauge';

describe('BarbellGauge', () => {
  it('describes the loaded bar and the plates still missing per side', () => {
    render(<BarbellGauge bestKg={100} goalKg={120} />);
    expect(
      screen.getByRole('img', {
        name: 'Barre chargée à 100 kg ; il manque 10 kg de chaque côté pour 120 kg',
      }),
    ).toBeTruthy();
  });

  it('says when the goal is reached, and shows the bare bar before any lift', () => {
    const { unmount } = render(<BarbellGauge bestKg={125} goalKg={120} />);
    expect(screen.getByRole('img', { name: /objectif de 120 kg atteint/ })).toBeTruthy();
    unmount();
    render(<BarbellGauge bestKg={0} goalKg={60} />);
    expect(screen.getByRole('img', { name: /chargée à 20 kg ; il manque 20 kg/ })).toBeTruthy();
  });
});
