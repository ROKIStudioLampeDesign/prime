/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BigNumber } from './BigNumber';

const fitOf = (text: string) => screen.getByText(text).style.getPropertyValue('--fit');

describe('BigNumber', () => {
  it('keeps the full size while the number fits', () => {
    render(<BigNumber value="714" maxRem={8.5} />);
    expect(fitOf('714')).toBe('min(8.5rem, 39.3cqw)');
  });

  it('shrinks with each extra character', () => {
    render(
      <>
        <BigNumber value={'1 586'} maxRem={8.5} />
        <BigNumber value="155,9" maxRem={3.25} />
      </>,
    );
    // Testing Library normalizes the narrow no-break space (fr-FR thousands) to a space.
    expect(fitOf('1 586')).toBe('min(8.5rem, 26.6cqw)');
    expect(fitOf('155,9')).toBe('min(3.25rem, 26.6cqw)');
  });

  it('keeps room for the unit', () => {
    render(<BigNumber value="79,4" maxRem={3.25} unit="kg" />);
    expect(fitOf('79,4')).toBe('min(3.25rem, calc((92cqw - 1.6rem) / 2.68))');
    expect(screen.getByText('kg').parentElement?.textContent).toBe('79,4 kg');
  });

  it('falls back to the maximum for an empty value', () => {
    const { container } = render(<BigNumber value="" maxRem={4} />);
    expect(container.querySelector<HTMLElement>('[style]')?.style.getPropertyValue('--fit')).toBe('4rem');
  });
});
