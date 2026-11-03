/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DataSection } from './DataSection';

describe('DataSection', () => {
  it('does not flag the last backup as overdue while it is still loading', () => {
    render(<DataSection />);
    const value = screen.getByText('Dernière sauvegarde').nextElementSibling;
    expect(value?.textContent).toBe('…');
    expect(value?.className).not.toContain('text-danger');
  });

  it('flags a backup that was never made once loaded', async () => {
    render(<DataSection />);
    const value = await screen.findByText('Jamais');
    expect(value.className).toContain('text-danger');
  });
});
