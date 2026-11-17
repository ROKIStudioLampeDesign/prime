/** @vitest-environment jsdom */
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axeViolations, renderWithRouter } from '../test/utils';
import { TabBar } from './TabBar';

describe('TabBar', () => {
  it('lists the five sections', () => {
    renderWithRouter(<TabBar />);
    const nav = screen.getByRole('navigation', { name: 'Navigation principale' });
    // Icons only: each link is named for screen readers, in this order.
    const links = within(nav).getAllByRole('link');
    const names = ["Aujourd'hui", 'Alimentation', 'Salle', 'Corps', 'Stats'];
    expect(links).toHaveLength(names.length);
    names.forEach((name, i) => expect(within(nav).getByRole('link', { name })).toBe(links[i]));
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
