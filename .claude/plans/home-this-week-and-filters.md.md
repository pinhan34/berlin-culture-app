# Plan: "This week" first, filters on demand

Spec: `.claude/specs/HOME_UPCOMING_AND_FILTERS.md` (Draft v2, Decision 1 = hybrid in layers).
Frontend only (`frontend/`). No DB, scraper or migration change.

## Context

The home page opens with four large numbered filter panels; the actual events come
after scrolling, and persisted filters (`bca_community`, `bca_vibe`, `bca_date`, ...)
can silently narrow the feed. Goal: the first block is a shared, unfiltered "This week"
list, and the four filter groups collapse behind one "Filters" button. Personalization
stays in layers: identical events/order for everyone, taste shown only as markers.

## Decisions taken while planning (confirmed with the user)

- **Pool = `cappedEvents`** (existing per-venue caps), not the uncapped `qualityEvents`
  the spec first said. Reason: a chronological 8-event cut would otherwise be dominated
  by one high-volume source. The caps keep the earliest events per venue bucket, so
  near-term events survive. Update the spec accordingly (Decision 10).
- **Tests import the real code** via `tsx` (new frontend devDependency) instead of
  mirroring logic into `.mjs`. So `lib/thisWeek.ts` must not use the `@/` alias.
- **Europe/Berlin time** for "today" and the 7-day window (the existing
  `getDateWindow` uses browser-local time; only `lib/shareContent.ts` / `ics.ts` use
  Berlin). Only the new code is Berlin-based; `getDateWindow` is left untouched.

## Facts the design relies on (from exploration)

- `app/page.tsx` is an async server component, `revalidate = 60`, passes upcoming events
  (`start_time >= now`, sorted asc, limit 500, venue 4 excluded) to `EventFeed`
  (`'use client'`). The event list itself renders on the server.
- `EventFeed.tsx`: `mounted` set in an effect (gates only "Updated" line, `ActiveFilters`,
  hidden notice); `cappedEvents` (line ~235), `hiddenSet`, `favouriteSet`, `newIds`,
  `isFreshData`, `hasTaste` (`TASTE_THRESHOLD = 3`), `profile`, `activeChips`
  (line ~493, before the JSX return), handlers `handleFavouriteToggle` / `handleHide`.
- `EventCard` already has the saved heart (`isFavourited`, `onFavouriteToggle`) and
  `onHide`; no reason/tag prop. `ForYou.tsx` shows reason chips in a wrapper `<div>`
  above each card and returns `null` when empty. `JustAdded.tsx` is the simple template.
- `explainEvent(e, profile)` (`lib/recommendations.ts`) returns up to 2 short reasons.
- `FilterSection` (bottom of `EventFeed.tsx`) is the only place that renders the step
  number; step wording appears nowhere else in `src`.
- `DateFilter` uses a hidden date input + `showPicker()`; safe inside a collapsed panel
  because it can only be clicked when visible. `MoodTiles` replays entry animations on
  remount, so keep panel children mounted and toggle visibility instead of unmounting.
- `useLocalStorage` returns the initial value on the first render and the stored value
  one render after mount, so anything depending on it must render after mount.
- Frontend tests are standalone Node scripts (`scripts/*.test.mjs`, no framework); no TS
  runner exists yet.
- `frontend/AGENTS.md`: check `node_modules/next/dist/docs/` before Next-specific code.
  The new components use only React state/props (no Next APIs), so this should not apply;
  confirm nothing changes in `page.tsx`.

## Implementation steps (each ends in a verifiable state)

### 1. Pure logic + tests: `frontend/src/lib/thisWeek.ts` (new)
No `@/` imports; `import type { Event } from './types'` only.
- `berlinDateKey(d)` -> `YYYY-MM-DD` via `Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' })`.
- `addDaysToKey(key, n)` -> date arithmetic on the key (UTC math on the parsed parts, so DST
  cannot shift it).
- `berlinDayLabel(d)` for day headings (same look as `formatDateHeading`, but Berlin).
- `seriesKey(e)` = normalized title (lowercase, strip everything except letters/digits,
  collapse spaces) + `venue_key ?? "id:"+venue_id`. Handles titles like
  `" 💼🧠 Neurodivergent Co-working & Networking "`.
- `getThisWeek(events, { now, hiddenIds, days = 7, fallbackDays = 14, minCount = 4 })`
  returns `{ events, mode: 'week' | 'next', totalCount }`:
  1. drop hidden, drop `start_time < now`;
  2. keep events whose Berlin date key is within `today .. today + days - 1`;
  3. keep only the earliest occurrence per `seriesKey`;
  4. if fewer than `minCount`, redo with `fallbackDays` and `mode: 'next'`;
  5. sort by `start_time`, tie-break `id` (deterministic: same input = same output).
- `frontend/scripts/thisWeek.test.ts` using `node:test` + `assert/strict`, importing
  `../src/lib/thisWeek`. Cases: window boundaries; Berlin midnight edge (event at
  23:30Z vs 00:30 Berlin); DST change (2026-03-29, 2026-10-25); hidden excluded; past
  excluded; series collapsed to earliest; emoji/whitespace title variants collapse;
  fallback to 14 days and `mode: 'next'`; empty input; determinism (shuffled input,
  same output); identical result regardless of any taste input (layer-0 rule).
- `frontend/package.json`: add devDependency `tsx`; `test` script becomes
  `node scripts/classifiers.test.mjs && node scripts/venueModel.test.mjs && tsx scripts/thisWeek.test.ts`.
  Regenerate `frontend/package-lock.json` (`npm install -D tsx` inside `frontend/`).

### 2. `ThisWeek` component + wiring (still above the old numbered panel)
- New `frontend/src/components/ThisWeek.tsx` (`'use client'`), modelled on `ForYou.tsx`
  (header block with icon/`h2`/subtitle, same grid classes). Props: `events`, `mode`,
  `totalCount`, `isFavourited`, `onFavouriteToggle`, `onHide`, `isNew`, `reasonOf?`.
  - Title "This week" or "Coming up next" when `mode === 'next'`.
  - Group by `berlinDayLabel`; show the first 8, then a "See all N" button that expands in
    place (local `useState`).
  - Reuses `EventCard` unchanged.
  - Empty state (nothing in window, or everything hidden) with the existing "show all
    again" affordance handled in `EventFeed`.
- `EventFeed.tsx`: after the "Updated" line, add
  `const thisWeek = useMemo(() => mounted ? getThisWeek(cappedEvents, { now: new Date(), hiddenIds: hiddenSet }) : null, [...])`
  and render `<ThisWeek>` (a fixed-height skeleton from `Skeletons.tsx` until `mounted`,
  so there is no hydration mismatch and little layout shift). Filters (`passes`,
  `selectedCommunity`, `dateRange`, `showFavourites`) are not used here by design.
- Verify: `npm run build`, dev server, list appears first and ignores stored filters.

### 3. Markers (layer 1)
- Saved marker: nothing to build; pass `isFavourited={favouriteSet.has(id)}`.
- "Your kind of thing" tag: pass `reasonOf = hasTaste ? (e) => explainEvent(e, profile)[0] : undefined`;
  `ThisWeek` renders it as a small chip above/below the card, copying the `ForYou.tsx`
  wrapper pattern (no `EventCard` change). Never used for filtering or ordering.
- Cold visitor (`hasTaste` false): no tags, list unchanged.

### 4. Filters bar (`FiltersPanel`)
- New `frontend/src/components/FiltersPanel.tsx`: a button "Filters" with a badge showing
  `activeCount` (hidden at 0), `aria-expanded` / `aria-controls`, session-only `useState`
  (collapsed every visit). Children are always mounted; visibility toggled with the
  `hidden` attribute (keeps state, avoids replaying `MoodTiles` animations).
- `EventFeed.tsx`: replace the outer numbered panel `<div>` with
  `<FiltersPanel activeCount={mounted ? activeChips.length : 0}>`; keep the four
  `FilterSection`s and the "Saved (N)" button inside; `ActiveFilters` chips stay outside,
  visible while collapsed. Order: Updated -> This week -> Filters bar -> chips -> hidden
  notice -> Surprise me -> ForYou -> JustAdded -> Browse everything.
- Drop the numbering: remove the `step` prop and the numbered badge span from
  `FilterSection` and its four call sites; titles/emoji/accent stay.

### 5. Polish
- Dark mode and mobile check for the bar, the expanded panel and the new section.
- Keyboard: tab/enter/space on the Filters button; focus stays put on toggle.
- No layout jump when markers appear after mount.

### 6. Docs
- Update `.claude/specs/HOME_UPCOMING_AND_FILTERS.md`: status, Decision 10 (capped pool),
  tests via `tsx`; copy this plan into `.claude/plans/`.
- Note in `CLAUDE.md` that frontend `npm test` now also runs `tsx scripts/thisWeek.test.ts`.

## Files

New: `frontend/src/lib/thisWeek.ts`, `frontend/scripts/thisWeek.test.ts`,
`frontend/src/components/ThisWeek.tsx`, `frontend/src/components/FiltersPanel.tsx`.
Modified: `frontend/src/components/EventFeed.tsx` (wire-up, panel swap, `FilterSection`),
`frontend/package.json` + `package-lock.json`, spec, `CLAUDE.md`.
Reused as-is: `EventCard`, `ForYou` pattern, `explainEvent`, `hasTaste`, `cappedEvents`,
`hiddenSet`, `activeChips`, `ActiveFilters`, `Skeletons`.

## Verification

Baseline first: run `npm run lint` in `frontend/` before editing and record the existing
problems (4 known, e.g. `EventFeed.tsx` set-state-in-effect at ~282, `eventsServer.ts`
`any` at ~36), so only new ones count.

1. `cd frontend && npm test` (existing 12 + 15 checks and the new `thisWeek` cases pass).
2. `npm run lint` shows no new problems; `npx tsc --noEmit` clean; `npm run build` passes.
3. `npm run dev`, then in the browser:
   - Empty localStorage: first block is "This week"; Filters collapsed, no badge.
   - Set `bca_community` and `bca_date` in localStorage, reload: "This week" unchanged;
     badge shows the count; chips visible; Browse list narrowed.
   - Two different `bca_interactions` payloads: identical events and order; only tags differ.
   - Expand/collapse by mouse and keyboard; all four groups still filter with correct counts;
     "Saved" toggle works; MoodTiles do not re-animate on toggle.
   - Hide an event: it leaves "This week"; a recurring series appears once.
   - Console shows no hydration warning; dark mode; mobile width (~375px).
4. Acceptance criteria 1-9 in the spec.

## Risks / notes

- ISR (`revalidate = 60`) can serve a slightly stale page; `now` is taken on the client
  after mount, so "This week" is correct regardless.
- Capped pool can still drop a near-term event if one venue exceeds its cap in the week;
  accepted (matches the rest of the default feed).
- `EventFeed.tsx` is ~770 lines and holds page state; keep additions in the new
  components and the small pure module, do not refactor unrelated parts.
- Adding `tsx` changes `frontend/package-lock.json`; Vercel installs from it, so commit
  both together.
