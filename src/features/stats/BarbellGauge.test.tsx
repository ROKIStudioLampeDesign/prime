/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BarbellGauge, loadingLabel, PlateFaces } from './BarbellGauge';

describe('loadingLabel', () => {
  it('lists the plates of each side, or the bare bar', () => {
    expect(loadingLabel(120)).toBe('120 kg : 2 × 20 kg et 1 × 10 kg de chaque côté');
    expect(loadingLabel(100)).toBe('100 kg : 2 × 20 kg de chaque côté');
    expect(loadingLabel(102.5)).toBe('102,5 kg : 2 × 20 kg et 1 × 1,25 kg de chaque côté');
    expect(loadingLabel(112.5)).toBe('112,5 kg : 2 × 20 kg, 1 × 5 kg et 1 × 1,25 kg de chaque côté');
    expect(loadingLabel(0)).toBe('20 kg : barre seule');
  });
});

describe('BarbellGauge and PlateFaces', () => {
  it('describes the bar and shows each plate face with its count', () => {
    render(
      <>
        <BarbellGauge totalKg={120} />
        <PlateFaces totalKg={120} />
      </>,
    );
    expect(screen.getByRole('img', { name: /2 × 20 kg et 1 × 10 kg/ })).toBeTruthy();
    const plates = screen.getByRole('list', { name: 'Disques de chaque côté' });
    expect(plates.textContent).toContain('2 × 20');
    expect(plates.textContent).toContain('1 × 10');
  });

  it('says "barre seule" without plates', () => {
    render(<PlateFaces totalKg={20} />);
    expect(screen.getByText('Barre seule')).toBeTruthy();
  });
});
