import 'fake-indexeddb/auto';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest runs without globals, so Testing Library can't register its own cleanup.
afterEach(() => {
  cleanup();
});

// jsdom lacks CSS.escape, which user-event uses to walk radio groups by name (React's useId names
// contain characters that need escaping). Minimal polyfill: escape every non-identifier character.
if (typeof window !== 'undefined' && typeof CSS === 'undefined') {
  Object.defineProperty(window, 'CSS', {
    value: { escape: (value: string) => value.replace(/[^\w-]/g, (c) => '\\' + c) },
  });
}
