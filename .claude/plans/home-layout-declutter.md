# Build plan: Home page declutter + new "Coming up" page

Spec: `.claude/specs/HOME_LAYOUT_DECLUTTER.md` (Draft v3, all decisions D1–D11 agreed).

## Context
The home page is crowded: events repeat in up to four blocks, the same "we follow these
venues" message appears three times, and `.limit(500)` in `frontend/src/app/page.tsx`
silently drops the latest ~26 events. The agreed fix: a short home page (This week + New
since your last visit), and a separate **"Coming up"** page (`/upcoming`) with Filters,
a small Surprise me, and the full list. Personal and popular events get chips on their
cards instead of blocks of their own.

**Loading decision (agreed in chat):** filters and taste chips run on the visitor's device
and need *all* upcoming events. So the server fetches every upcoming event (in chunks of
1000, no cap), and "Coming up" *shows* ~30 cards at a time, adding more as you scroll.

## How we work
- Build in **7 small steps**. After each step: run checks, show the diff summary, and
  **stop for your review** before the next step. One commit per step, only when you say so.
- Before writing any Next.js code: read the matching guide in
  `frontend/node_modules/next/dist/docs/` (pages, `revalidate`, metadata, loading.tsx),
  as `frontend/AGENTS.md` requires.
- First action after approval: save a copy of this plan as
  `.claude/plans/home-layout-declutter.md` (next to the existing plans), so it's in the repo.

---

## Step 1: Fetch all upcoming events (removes the 500 cap)
- `frontend/src/lib/eventsServer.ts`: add `fetchAllUpcomingEvents()` and `fetchVenues()`.
  Loop with `.range(from, from + 999)` until a batch returns fewer than 1000 rows. Reuse
  the file's `RETIRED_VENUE_IDS` and row mapping (`venue: row.venue ?? undefined`).
- `frontend/src/app/page.tsx`: replace the inline query in `getData()` (lines 51–86,
  including `.limit(500)`) with those two calls. Drop the duplicate `RETIRED_VENUE_IDS`.
- **Visible change:** none, except the missing ~26 events now appear.

## Step 2: Move shared feed logic out of `EventFeed.tsx` (no visible change)
⚠️ This moves many lines (a larger diff), but only moves them; it doesn't change them.
Both pages need the same logic, so it has to live in one shared place.
- New `frontend/src/lib/feed.ts`: pure helpers moved from `EventFeed.tsx`:
  `getDateWindow`, `dateRangeLabel`, `venueBucketKey`, `interleaveByVenue`,
  `isQualityEvent`, the venue caps (`VENUE_DISPLAY_CAP`, `VENUE_CAP_OVERRIDES`), `timeAgo`.
- New `frontend/src/lib/useEventPool.ts` hook: quality pool + capped pool, favourites,
  hidden, interactions/hints after mount, taste `profile`, `hasTaste`, `mounted`,
  `lastUpdated`, and the favourite/hide handlers.
- `EventFeed.tsx` uses both; the page looks exactly the same.

## Step 3: New "Coming up" page (`/upcoming`)
- `frontend/src/app/upcoming/page.tsx` (server, `revalidate = 60`, metadata title
  "Coming up"): fetch all events, venues, and `getTrendingScores()` (server-only, service
  key never reaches the client) → pass `popularIds: number[]` to the client.
- `frontend/src/app/upcoming/loading.tsx`: copy the pattern from `app/venues/loading.tsx`.
- New `frontend/src/components/UpcomingFeed.tsx`: the filter UI moved from `EventFeed`
  (FiltersPanel, `passes()`, counts, ActiveFilters, hidden notice). Logic unchanged.
  - **Surprise me:** small secondary button in the same row as Filters (add an optional
    `aside` slot to `FiltersPanel.tsx`). Its reveal panel (`SurpriseMe`, `QuickPicks`,
    `CalendarSubscribe`) stays as is.
  - **List from today**, with a short line saying what's shown, e.g. "Showing 80 queer
    events from today on" (wording to agree).
  - **"By week / By month" toggle**, default by week, remembered (`useLocalStorage`, key
    `bca_group_by`). Week groups start Monday on the Berlin calendar (reuse
    `berlinDateKey`/`addDaysToKey` from `lib/thisWeek.ts`); day sub-headings inside.
  - **Show in steps:** first 30 cards, then +30 when a sentinel scrolls into view
    (IntersectionObserver), plus a visible "Show more" button as a fallback.
  - Zero results → friendly note (reuse today's empty-state wording).
- Home is not changed yet, so both pages work side by side for this step.

## Step 4: Slim the home page
- `page.tsx` order: header (title + short subtitle + "Subscribe to all events") →
  `HowItWorks` as a one-line "How it works ›" toggle, **closed by default** (flip the
  default in `HowItWorks.tsx`; existing `bca_howto_collapsed` key kept) → `HomeFeed` →
  `VenueStrip` and `NewsletterSignup` at the bottom. Remove `TrendingStrip` from the page.
  `ClickStats` (hidden debug panel, `?stats=1`) stays.
- New `frontend/src/components/HomeFeed.tsx`: "Updated N ago", `ThisWeek`, then a clear
  link **"See everything coming up ›"** → `/upcoming`. No filters on home.
- `ThisWeek.tsx`: its fallback heading "Coming up next" → **"Next up"**, so it doesn't
  clash with the new page name.
- `layout.tsx`: add a "Coming up" nav link next to the existing `/venues` link.
  `sitemap.ts`: add `/upcoming`.
- Delete `EventFeed.tsx`, `ForYou.tsx`, `JustAdded.tsx`, `TrendingStrip.tsx` (no longer used).

## Step 5: "New since your last visit"
- New `frontend/src/lib/lastVisit.ts`: two localStorage keys, `bca_visit_last` and
  `bca_visit_prev`. On load: if the last visit was more than 30 min ago, `prev = last`;
  then `last = now`. So reloading the page doesn't wipe the list. First visit → no `prev`
  → block hidden. All reads/writes in try/catch.
- New pure `frontend/src/lib/newSince.ts`: `getNewSince(events, sinceMs, excludeIds)` →
  upcoming events with `created_at > sinceMs`, minus This week's ids (dedupe by id and
  `seriesKey`), soonest first, max 6. Plus `sinceLabel(sinceMs, now)`: "since Tuesday"
  (within 6 days) or "since 12 Nov".
- Test: `frontend/scripts/newSince.test.ts` (same style as `thisWeek.test.ts`), added to
  `npm test` in `frontend/package.json`.
- New `frontend/src/components/NewSinceLastVisit.tsx`: heading "5 new since Tuesday", a
  compact grid of cards. Rendered after mount only; hidden when empty.

## Step 6: The chips ("Because you like …" and "🔥 Popular")
- `lib/recommendations.ts` `explainEvent`: the venue reason returns the venue's name
  (`getVenueDisplayName`) instead of "A venue you like". For aggregator sources
  (`isAggregatorVenue`, e.g. Telegram) skip the venue reason, since "Because you like
  Telegram" means nothing. The chip adds the words "Because you like".
- New `frontend/src/components/CardChips.tsx`: one overlaid row (absolute, top-left, same
  trick as today's chip in `ThisWeek.tsx`, so no layout shift), with Popular first, then
  the taste chip. The text is shortened with "…" so the chips never cover the card.
  - Look: pink-to-purple gradient pill with ✨; one-time shine on appear.
  - CSS keyframe in `frontend/src/app/globals.css`, switched off under
    `prefers-reduced-motion`.
- Wire it into `ThisWeek`, `NewSinceLastVisit` and the `UpcomingFeed` list. `popularIds`
  is passed down from both pages (the home page also calls `getTrendingScores()`). No data
  → no chips.

## Step 7: Tidy up
- Spec status → "Implemented"; tick the acceptance criteria.
- `CLAUDE.md`: update only where it names removed components or the home page blocks.

---

## Verification (after every step, in `frontend/`)
- `npm test`, `npm run lint` (no new problems beyond the 19 known), `npm run build`.
- `npm run dev`, then check by hand in a browser (light + dark mode, ~375px width):
  - Step 1: the event count is higher than before; the last events are present.
  - Step 3: `/upcoming`: tap "Queer"; the count is right and the list starts today;
    week/month toggle works and is remembered; scrolling adds more; Surprise me opens.
  - Step 4: home shows only the agreed blocks; nothing repeats; the link works.
  - Step 5: first visit → no block. Set `bca_visit_prev` in DevTools to an older time →
    the block appears with the right "since …" label.
  - Step 6: click 3+ events at one venue → "Because you like <venue>" appears. Shine
    plays once. With "reduce motion" on, there's no shine.
  - No hydration warning in the console; no layout jump after load.
