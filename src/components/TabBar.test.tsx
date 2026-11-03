/** @vitest-environment jsdom */
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axeViolations, renderWithRouter } from '../test/utils';
import { TabBar } from './TabBar';

describe('TabBar', () => {
  it('lists the five sections', () => {
    renderWithRouter(<TabBar />);
    const nav = screen.getByRole('navigation', { name: 'Navigation principale' });
    const names = [...nav.querySelectorAll('a')].map((a) => a.textContent);
    expect(names).toEqual(["Aujourd'hui", 'Alimentation', 'Salle', 'Corps', 'Stats']);
  });

  it('marks the current section, including its sub-pages', () => {
    renderWithRouter(<TabBar />, { route: '/gym/templates' });
    expect(screen.getByRole('link', { name: 'Salle' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: "Aujourd'hui" }).getAttribute('aria-current')).toBeNull();
  });

  it('has no accessibility violations', async () => {
    renderWithRouter(<TabBar />);
    expect(await axeViolations()).toEqual([]);
  });
});
