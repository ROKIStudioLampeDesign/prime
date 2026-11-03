# Prime

Mobile-first, offline-first PWA for gym and nutrition tracking. Single user, used mainly on an iPhone
(Safari, added to the home screen). No backend, no accounts: all data lives in IndexedDB on the device.

Sections: **Aujourd'hui** (daily summary), **Alimentation** (meals, macros), **Salle** (workouts, sets),
**Corps** (bodyweight, measurements), **Stats** (trends), **Réglages** (settings, via the gear icon).

## Stack

- Vite + React 19 + TypeScript (strict, `noUncheckedIndexedAccess`)
- Tailwind CSS v4 (CSS-first config in `src/index.css`, no `tailwind.config.js`)
- Dexie.js (IndexedDB) + `dexie-react-hooks` (`useLiveQuery`) for **all** data
- vite-plugin-pwa (Workbox `generateSW`, auto-update); icons generated from `public/favicon.svg` by
  `@vite-pwa/assets-generator` at build time (`pwa-assets.config.ts`)
- React Router 7 (`react-router`, data router in `src/app/router.tsx`)
- Recharts (charts), date-fns (dates, `fr` locale for display)
- Vitest (+ `fake-indexeddb` for DB tests, Testing Library + jsdom + axe-core for component tests),
  Playwright for end-to-end tests (`e2e/`), ESLint (typescript-eslint strict) + Prettier

## Commands

```sh
npm run dev        # dev server (service worker disabled in dev)
npm run build      # typecheck + production build (generates SW and icons)
npm run preview    # serve the production build; use this to test PWA/offline
npm test           # vitest run (unit, DB and component tests)
npm run test:e2e   # Playwright against the production build, 390 px (uses installed Edge)
npm run test:watch
npm run typecheck  # tsc -b
npm run lint       # eslint + prettier --check
npm run format     # prettier --write
```

To test on the iPhone: `npm run build && npm run preview -- --host`, then open the LAN URL in Safari.
Service workers need HTTPS except on localhost, so full offline/install testing on the phone requires an
HTTPS deployment (any static host) or a tunnel.

## Architecture

```
src/
  app/          router and app layout (shell + tab bar)
  components/   shared, feature-agnostic UI (Screen, BottomSheet, Button, TextField, BlobImage, Progress…)
  db/           Dexie database, schema/migrations, data-access functions (foods, logEntries, goals)
  domain/       pure business logic: nutrition, search, number parsing, dates (later 1RM, weekly stats)
  lib/          browser helpers that are not UI and not pure (image resize, display formatting)
  features/<feature>/   one folder per section: today, nutrition, gym, body, stats, settings
```

Rules:

- **`src/domain` is pure.** No React, Dexie, DOM or `db`/`features`/`components` imports (enforced by
  ESLint `no-restricted-imports`). Every function is deterministic (pass `now` in, never read the clock
  implicitly in core logic) and fully unit-tested in a colocated `*.test.ts`.
- **`src/db` owns data access.** Features don't build ad-hoc Dexie queries scattered across components;
  put reusable queries/mutations in `src/db/<entity>.ts`. Reactive reads in components use `useLiveQuery`.
- **Features** compose domain + db + components. A feature may import from `domain`, `db`, `components`,
  but not from another feature; anything shared moves to `components` or `domain`.
- **Schema changes:** never edit an existing `this.version(n)` in `src/db/db.ts`. Add `version(n + 1)`
  with the full store list and an `.upgrade()` when existing data must be transformed. Add a test that
  opens the old version, writes data, then opens the new one and checks the migration.
- **Dates:** calendar days are stored as local-date strings `"YYYY-MM-DD"` (`LocalDate` in
  `src/domain/date.ts`), never as `Date` or ISO-UTC strings. Use `toLocalDate` / `fromLocalDate`;
  never `new Date("YYYY-MM-DD")` (parses as UTC) or `toISOString().slice(0, 10)`. Use epoch-ms
  timestamps (`createdAt`, `updatedAt`, set start/end) where the instant matters.
- **Units:** metric only. kg (bodyweight, loads), g (food), kcal (energy), cm (measurements). Store the
  unit in the field name when ambiguous (`weightKg`, `quantityG`).
- **Offline:** the app must fully work without network. The only network use is the optional
  Open Food Facts lookup (`src/lib/openFoodFacts.ts`: 8 s timeout, offline/notFound/timeout/error
  statuses, never throws). Its result only **prefills** the product form for review; the product is
  stored locally once saved. A barcode that already exists opens that product instead. If you add a
  network origin, also add it to the CSP in `public/_headers`.
- **Heavy, rarely used code is lazy:** the barcode scanner (zxing) and Stats (Recharts) are loaded
  on demand. Vendor libraries are split into `vendor-*` chunks (`vite.config.ts`) to stay cached
  across deploys.
- **Backups** (`src/db/backup.ts`): one JSON file with every table, Blobs as base64, the envelope
  version and the Dexie `schemaVersion`. Device settings (`storagePersisted`, `lastExportAt`,
  `firstLaunchAt`, reminder snooze) are never exported or overwritten. When a schema version
  changes stored data, add a transform to `BACKUP_MIGRATIONS` (`src/domain/backup.ts`) so older
  backups stay importable, and keep the round-trip test passing.
- **Updates:** the service worker uses `registerType: 'prompt'` + `clientsClaim`: first install is
  offline-ready immediately, later updates wait for "Mettre à jour" (`UpdatePrompt`) so a workout is
  never reloaded mid-session. Route errors (including stale lazy chunks after a deploy) render
  `RouteError`; anything else hits the root `ErrorBoundary`.
- **Storage persistence:** `navigator.storage.persist()` is requested on launch (`src/db/persist.ts`);
  the result is stored in `settings.storagePersisted` and shown in Réglages.
- **History is immutable:** a log entry snapshots everything it needs (food name, brand, per-100 g
  values, computed macros). Editing an entry's grams recomputes from the entry's own `per100g`, never
  from the current food. Editing or deleting a food must never change past entries.
- **Meals (recipes) never store macros.** They are derived from the ingredients' current products
  (`summarizeMeal` / `summarizeWithFoods`). An ingredient whose product was deleted is shown as
  "Produit supprimé" and excluded from totals; code must never assume `foodsById.get(...)` succeeds.
  Meal log entries (`kind: 'meal'`) snapshot the dish's per-100 g values and `portionGrams`, so
  portions → grams = portions × portionGrams and history survives meal/product edits.
- **Muscles:** `src/domain/muscles.ts` is the single source of truth (ids, French labels, body-map
  views, groups). Never hard-code muscle lists or labels elsewhere.
- **Exercise library:** built-in exercises come from `src/db/exerciseSeed.ts`, inserted by `seedId`
  on populate and on upgrade. Never change an existing `seedId`; to add exercises, append to the seed
  and add a schema version whose upgrade calls `seedExercises`. Built-ins are read-only; custom
  exercises can't be deleted while a workout or template uses them.
- **Workouts:** at most one `status: 'active'` workout. Every set edit is written to Dexie
  immediately (the database _is_ the draft), so a reload never loses a session. Finishing drops
  unvalidated sets. Durations and the rest timer are computed from stored timestamps
  (`startedAt`, `restEndsAt`), never by counting interval ticks (timers stop while the phone is locked).
- **Body map:** geometry lives in `src/features/body/bodyGeometry.ts` (200 × 400 canvas, left half
  only, mirrored at render). Each view must draw exactly `musclesForView(view)` (tested). Fills come
  from props, never inline in the path data. Hit areas are ranked by `approxArea` so thin muscles stay
  tappable; after editing shapes, re-render both views and re-run a hit test on every muscle.
- **Stats & charts:** Stats screens are lazy routes (`lazy` in `router.tsx`) so Recharts stays out of
  the main bundle; keep any new Recharts usage behind a lazy route. Charts use a numeric time X axis
  (`toTime`) so gaps are to scale, `niceTicks` for Y ticks, theme colours via `var(--color-…)`,
  `isAnimationActive={false}`, and a `ChartEmpty` placeholder ("Pas encore de données") of the same
  height. Records only count finished workouts; live PR badges compare against records from
  _before_ the current workout (`getRecordsBefore`). Body weight: one entry per day (upsert).
- **Live data in inputs:** don't bind a text input directly to `useLiveQuery` data (keystrokes are
  lost during the async round-trip). Use `NumericInput` (local draft while focused) or local state
  saved on blur. Key edit forms by the loaded record's id, not the URL id: `useLiveQuery` briefly
  returns the previous result when its dependencies change.
- **Macros are stored unrounded**; round only for display (`roundMacro`: kcal integer, others 0.1 g)
  so daily sums stay accurate.
- **Photos** are resized to max 800 px and re-encoded as JPEG ~0.7 (`src/lib/image.ts`) before being
  stored as Blobs. Display them with `<BlobImage>`, which reserves its box (no layout shift) and
  manages object URLs.
- **Demo data** (`src/db/demo.ts`) is dev-only: import it dynamically behind `import.meta.env.DEV`
  so it is stripped from production builds. Never seed real users' databases.

## UI conventions

- **Language:** UI text in French (informal "tu"). Code, comments, identifiers, commits in English.
- **Mobile first:** design for 390px wide; content max width `max-w-lg`. No horizontal scrolling.
- **Touch targets ≥ 44px** (`min-h-11`, `size-11`). Primary actions within thumb reach (bottom half).
- **Safe areas:** use the `pt-safe`, `pb-safe`, `px-safe` utilities; the viewport uses `viewport-fit=cover`.
- **Theme ("Grand format"):** black page, full-width colour bands, square shapes, huge type. Dark by
  default, light when the system asks. Use only the semantic colour tokens defined in `src/index.css`
  (`bg-bg`, `bg-surface`, `bg-surface-2`, `text-fg`, `text-muted`, `border-line`, `text-accent` for
  links and focus, `bg-accent-fill text-accent-fg` for primary actions, `bg-indicator` for the active
  tab, `text-danger`), never raw palette colours like `bg-zinc-900`. Each domain has a band colour:
  Alimentation `bg-nutrition` (yellow), Salle `bg-gym` (cobalt, text `text-on-gym`), poids, Corps and
  secondary figures `bg-paper`. Text on yellow and paper is `text-ink` (secondary `text-ink/72`,
  warnings `text-danger-ink`, buttons `bg-ink text-on-ink`); strokes and chart lines use the
  `*-strong` variants. Bands run edge to edge with `bleed` (`edge` for a grid of cells that pad
  themselves). No radius except the round header buttons (`headerButton`) and the spinner; lists are
  rows on the page separated by `border-line`, inputs are underlined. Type is Archivo (variable,
  self-hosted): titles use `headline`, big figures `numeral` or `<BigNumber>` (shrinks to fit its
  `@container`). Labels are sentence case, never all caps.
- Every screen is wrapped in `<Screen title=…>`, which provides the sticky header and the gear/back button.
- Every data view handles three states: loading (`useLiveQuery` returns `undefined` → `<Loading />`),
  empty (`<EmptyState />` with a hint on what to do), and data.
- Numbers: format for display with `src/lib/format.ts` (`fr-FR`, decimal comma). Inputs use
  `inputMode="decimal"` and parse with `parseDecimal` (accepts `,` and `.`).
- Inputs use 16 px text (`text-base`), otherwise iOS Safari zooms in on focus.
- Quick edits happen in a `<BottomSheet>` (it lifts itself above the iOS keyboard); destructive
  actions on durable data ask for confirmation with `<ConfirmSheet>`.
- Screen state worth keeping on back/reload (e.g. the diary day) lives in the URL search params.

## Code conventions

- Named exports only; components in `PascalCase.tsx`, other modules in `camelCase.ts`.
- No `any`, no non-null assertions (`!`); narrow instead.
- Keep components small; move logic that can be pure into `src/domain`.
- Tests: colocated `*.test.ts`; component tests are `*.test.tsx` with a `/** @vitest-environment jsdom */`
  docblock, query by role/label (`src/test/utils.tsx`: `renderWithRouter`, `axeViolations`). User
  flows go in `e2e/` (the fixture fails a test on any console error). Domain logic needs tests for edge cases (empty input, zero, boundaries,
  DST/month/year boundaries for dates).
- Prettier formats everything (Tailwind classes are auto-sorted); don't hand-format.

## Definition of done

A change is done only when all of these hold:

- [ ] `npm run typecheck` passes
- [ ] `npm test` passes, and new domain logic has unit tests (new shared components: component tests)
- [ ] `npm run test:e2e` passes when a user flow changed
- [ ] `npm run lint` passes (ESLint + Prettier)
- [ ] `npm run build` succeeds
- [ ] Usable at 390px: no horizontal scroll, touch targets ≥ 44px, nothing hidden behind the notch,
      home indicator or tab bar, in both dark and light themes
- [ ] Works offline (check with `npm run preview`, then stop the server and reload)
- [ ] Loading and empty states handled for every data view
- [ ] Any schema change is a new Dexie version with a migration and a test
- [ ] UI text is in French; code and comments in English
