import { render, type RenderOptions } from '@testing-library/react';
import axe from 'axe-core';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';

/** Renders inside a router, like in the app (links and navigation hooks work). */
export function renderWithRouter(
  ui: ReactElement,
  { route = '/', ...options }: RenderOptions & { route?: string } = {},
) {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>, options);
}

/**
 * Runs axe on a rendered tree. Skipped: colour contrast (jsdom has no CSS engine; contrast is
 * checked in the browser by Lighthouse / Playwright) and "region" (a page-level rule: isolated
 * components are rendered outside the app's <main> landmark).
 */
export async function axeViolations(root: Element = document.body): Promise<string[]> {
  const results = await axe.run(root, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  });
  return results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`);
}
