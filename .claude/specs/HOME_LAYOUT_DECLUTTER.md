# Home page: declutter and give the page one job

Follow-up to `HOME_UPCOMING_AND_FILTERS.md` (implemented). "This week" and the collapsed
Filters button fixed the top of the page, but the page as a whole is still crowded.

**Status:** Draft v1, for review in a later session. Nothing here is implemented, and the
decisions below are recommendations to confirm before a plan is written.

---

## Why

After the previous change, a visitor scrolls through, top to bottom:
1. "Updated N ago"
2. **This week** (shared, first 8 of the next 7 days)
3. **Filters** button, then active-filter chips and the hidden-events notice
4. **Surprise me**: a large animated gradient button (`SurpriseMe`, `QuickPicks`, `CalendarSubscribe`)
5. **For you** (taste-ranked, up to 6, only with enough taste signal)
6. **Just added** (up to 6, only if the "fresh" heuristic passes)
7. **Browse everything**: every remaining upcoming event, grouped by day

Problems:
- **Repetition.** One event can appear up to four times (This week, For you, Just added,
  Browse). Nothing dedupes across blocks.
- **No hierarchy.** Every block has a headline-sized heading and its own grid, and the
  Surprise button is the loudest element on the page although it is a side feature.
- **"Browse everything" has no defined edge.** It is not a 1-year list by design. It is
  "all upcoming events, earliest first, cut at 500" (`page.tsx`, query in
  `eventsServer.ts`). Today the DB holds ~526 upcoming events, so the last ~26 are
  silently missing, and the horizon moves closer as scraping adds events.
- The page has no single, stated purpose, so each block competes for attention.

## Purpose (proposed)

The audience is queer indie and neurodivergent communities in Berlin. The page should
answer, in this order:
1. What is on **soon**? (This week)
2. Anything **new or made for me**? (one compact row)
3. What else is **coming up later**? (bounded, calm, at the bottom)

Everything else (filters, Surprise me, calendar subscribe) supports those three and
must not compete with them visually.

## Goals

1. One clear hero: "This week".
2. Each event appears **once** on the page, in the highest block it qualifies for.
3. "Browse" has an explicit, documented horizon and a finite feel.
4. Secondary features are visibly secondary.
5. No loss of functionality: filters, favourites, hide, Surprise me, calendar, chips.

## Non-goals

- No database, scraper or migration change.
- No change to filter logic (`passes()`, counts) or to how "This week" is computed.
- No new personalization tiers (see `docs/PERSONALIZATION.md`). The layer rule from the
  previous spec still holds: "This week" is identical for everyone; only markers differ.
- Monetization slots (`docs/MONETIZATION.md`) stay out of scope, but the layout must not
  make a later labelled "Promoted" slot harder.

---

## Proposed structure

1. "Updated N ago" (unchanged)
2. **This week** (hero, unchanged logic)
3. **Filters** bar + chips + hidden notice (unchanged; Surprise me moves in, see D3)
4. **New & for you**: one compact row (see D2)
5. **Later**: the rest of "Browse everything", after this week and deduped (see D4, D5)

## Decisions

Each has a recommendation. Change any and the rest adapts.

| # | Question | Recommendation |
| --- | --- | --- |
| D1 | Purpose of the page | **"What's on soon" first**, as above. Everything else is secondary. |
| D2 | What happens to `ForYou` and `JustAdded`? | **Merge into one compact row** ("New & for you"), horizontally scrollable or a single short grid row, max ~6 cards. "Just added" keeps its fresh-finds meaning through a "New" badge; "For you" keeps its reason chip. If merged is too lossy, keep both but as slim strips, not full grids. |
| D3 | The Surprise me button | **Demote to a small secondary control** next to Filters (same row), not a full-width animated banner. Its reveal panel (`SurpriseMe`, `QuickPicks`, `CalendarSubscribe`) stays as is. |
| D4 | Dedupe across blocks | **Yes.** An event shown in "This week" is not repeated in "New & for you" or "Later". Tags/badges may still mark it inside "This week". Requires a shared "already shown" set built top-down. |
| D5 | What is "Browse everything" now? | Rename to **"Later"**; it starts after the "This week" window, is grouped by **week or month**, and loads in steps ("Show more") instead of one endless list. The days covered by "This week" are not repeated. |
| D6 | How far ahead does the list reach? | **Make it explicit.** Replace the implicit 500-row cut-off with a named constant and a documented horizon (candidates: 90 days, or "the rest of the season"), applied in the query. Decide together with the 500-limit issue below. |
| D7 | Behaviour when filters are active | The filtered result replaces "Later" (as today, it filters the full pool); "This week" and the "New & for you" row stay unfiltered. Clarify in the UI that the list below is filtered. |

## The 500-row limit (decide with D6)

`page.tsx` fetches the 500 earliest upcoming events. With ~526 upcoming today, the
latest ~26 never reach the page, and the cut-off date drifts closer as data grows. Options:
- **A. Time horizon in the query** (`start_time` between now and now + N days). Predictable
  and matches D6; needs a chosen N.
- **B. Raise the limit.** Simple, but only postpones the problem.
- **C. Server-side pagination for "Later".** Best for growth, largest change.

Recommendation: A now, C only if the horizon has to be long.

## Edge cases

- Not enough events for a "New & for you" row: hide the row, do not pad it.
- Cold visitor: no "for you" reasons; the row shows only fresh finds (or is hidden).
- After deduping, "Later" can be empty near the end of the horizon: show a short note.
- Event dedupe key: reuse `seriesKey` from `lib/thisWeek.ts` for recurring series, and the
  event id for exact repeats.
- Hydration: anything time- or storage-dependent renders after mount, as in the previous
  change. Overlay or fixed-height elements must not shift the layout.
- Dark mode and ~375px mobile width for every new or reshaped block.

## Acceptance criteria (draft)

1. No event appears twice anywhere on the page (except as a marker inside "This week").
2. "This week" is visually the dominant block; Surprise me is visibly secondary.
3. "Later" starts after the "This week" window, is grouped by week or month, and has a
   documented horizon in code (named constant + comment).
4. Filters, favourites, hide, calendar and Surprise me all still work.
5. `npm run build`, `npm run lint` (no new problems) and `npm test` pass in `frontend/`.
6. No hydration warning in a browser without extensions; no layout jump after mount.

## Open questions for the next session

1. Look at the live page: **if you could keep only three blocks, which three?** This
   decides D2 and D5 more than anything in the code.
2. Should "For you" and "Just added" merge (D2), or stay separate but slimmer?
3. Horizon for "Later" (D6): 90 days, longer, or paginated?
4. Should Surprise me live beside Filters, or move lower down (D3)?
5. Should the "Later" list group by week or by month (D5)?

## Risks

- `EventFeed.tsx` is large and holds most page state. Prefer new small components and a
  small pure module for cross-block dedupe (testable with `tsx`, like `lib/thisWeek.ts`)
  over growing the file.
- Dedupe changes what appears in `ForYou` / `JustAdded`; their current limits
  (`FOR_YOU_LIMIT = 6`, `JUST_ADDED_LIMIT = 6`) may need refilling after events are
  removed. Decide whether to refill or show fewer.
- The existing lint baseline has 19 problems unrelated to this work; only new ones count.
