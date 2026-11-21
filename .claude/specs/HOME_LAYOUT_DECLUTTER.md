# Home page: declutter and give the page one job

Follow-up to `HOME_UPCOMING_AND_FILTERS.md` (implemented). "This week" and the collapsed
Filters button fixed the top of the page, but the page as a whole is still crowded.

**Status:** Draft v3. All decisions agreed (see "Agreed order" and "Decisions"); nothing
implemented yet. Ready for an implementation plan.

---

## Why
After the previous change, a visitor scrolls through, top to bottom:
- Header: title, "Hand-picked from Berlin's best indie + queer + ND-friendly spaces…"
  (`page.tsx`)
- **Your shortcut to the Berlin worth showing up for**: four-point explainer (`HowItWorks`)
- **Where we look**: strip of every followed venue (`VenueStrip`)
- **Trending**: only once interaction data exists (`TrendingStrip`)
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
- **The same message, three times, before any event.** The header subtitle, `HowItWorks`
  ("Hand-picked… from SO36 to Sinema Transtopia") and `VenueStrip` all say "we follow
  these venues". The venues also appear in Filters and on `/venues`.
- **"Just added" means new to the database, not new to the visitor.** It shows events
  scraped in the last 48 h (`NEW_WINDOW_HOURS`), often the same ones as "This week", and
  tells a returning visitor nothing about what changed since they last came.

- **No hierarchy.** Every block has a headline-sized heading and its own grid, and the
  Surprise button is the loudest element on the page although it is a side feature.
- **"Browse everything" has no defined edge.** It is not a 1-year list by design. It is
  "all upcoming events, earliest first, cut at 500" (`page.tsx`, query in
  `eventsServer.ts`). Today the DB holds ~526 upcoming events, so the last ~26 are
  silently missing, and the horizon moves closer as scraping adds events.
- The page has no single, stated purpose, so each block competes for attention.

## Purpose

The audience is queer indie and neurodivergent communities in Berlin. Visitors should
feel safe and have fun finding their way around. The page should answer, in this order:
1. What is on **soon**? (This week)
2. Anything **new since I last came**? (New since your last visit)
3. What else is **coming up**? (on its own page, "Coming up")

Everything else (filters, Surprise me, calendar subscribe) supports those three and
must not compete with them visually.

## Goals

1. One clear hero: "This week".
2. Each event appears **once** on the home page, in the highest block it qualifies for.
3. "All upcoming" lives on its own page ("Coming up"), together with Filters and
   Surprise me. It starts from today and loads more as you scroll.
4. Secondary features are visibly secondary.
5. No loss of functionality: filters, favourites, hide, Surprise me, calendar, chips.
6. **Mark cards, don't add blocks**: personal and popular events get a chip on their card
   ("Because you like …", "🔥 Popular") instead of a block of their own.

## Non-goals

- No database, scraper or migration change.
- No change to filter logic (`passes()`, counts) or to how "This week" is computed.
- No new personalization tiers (see `docs/PERSONALIZATION.md`). The layer rule from the
  previous spec still holds: "This week" is identical for everyone; only markers differ.
- Monetization slots (`docs/MONETIZATION.md`) stay out of scope, but the layout must not
  make a later labelled "Promoted" slot harder.

---

## Agreed order:
1. Header, short, with a one-line **"How it works ›"** that expands (see D8)
2. "Updated N ago" (unchanged)
3. **This week** (hero, unchanged logic)
4. **New since your last visit**: only if there is something (see D9)
5. One link: **"See everything coming up ›"** → a separate page, **"Coming up"**
   (`/upcoming`), holding the **Filters** (bar + chips + hidden notice, unchanged logic)
   and the **All upcoming** list, which starts **from today** (see D5, D6, D7)
6. Bottom: **Where we look** (or a single link to `/venues`) and the newsletter (see D8)

Surprise me: on the separate page, beside the Filters (see D3).


## Decisions

All agreed. Change any and the rest adapts.

| # | Question | Decision |
| --- | --- | --- |
| D1 | Purpose of the page | **Agreed: "What's on soon" first**, as above. Everything else is secondary. |
| D2 | What happens to `ForYou` and `JustAdded`? | **Agreed: no "For you" block.** `ForYou` is removed as a block; instead, any card that matches the visitor's taste gets a small, eye-catching "for you" chip wherever it appears (This week, All upcoming). `JustAdded` is replaced by D9. Chip design: see D10. |
| D3 | The Surprise me button | **Agreed:** on the separate page, as a small secondary control next to Filters (same row), not a full-width animated banner. Its reveal panel (`SurpriseMe`, `QuickPicks`, `CalendarSubscribe`) stays as is. |
| D4 | Dedupe across blocks | **Agreed, home page only.** An event shown in "This week" is not repeated in "New since your last visit". Chips may still mark it inside "This week". The "Coming up" page is a separate page and starts from today, so it may show this week's events again; that is intended. |
| D5 | What is "Browse everything" now? | **Agreed:** it becomes the **"All upcoming"** list on the "Coming up" page (D6). It starts **from today**, so with a filter on, this week's matches are found too. The visitor can switch the grouping with a small **"By week / By month"** toggle; default is **by week**, and the choice is remembered on their device (localStorage). |
| D6 | How far ahead does the list reach? | **Agreed: own page.** "All upcoming" moves to the "Coming up" page (`/upcoming`), which loads more as you scroll, so no fixed cut-off has to be chosen; the exact loading method is decided in the plan. |
| D7 | Behaviour when filters are active | **Agreed (follows D6):** filters live on the "Coming up" page and filter its list only; the home page is never filtered. The UI must say clearly that the list shows filtered events from today on (wording decided later). |
| D8 | Top-of-page panels | **Agreed.** Collapse `HowItWorks` into a one-line "How it works ›" toggle under the header (closed by default). Move `VenueStrip` to the bottom, or replace it with one link ("See the places we follow ›" → `/venues`). "This week" becomes the first content block. |
| D9 | What "Just added" means | **Agreed: "New since your last visit."** Store the visitor's last-visit time on their device (localStorage, no account). Show only events with `created_at` after it, minus anything already in "This week". Heading says when: "5 new since Tuesday". Hidden when empty. First-time visitors: hidden (everything is new to them). Replaces the "fresh" half of D2. |
| D10 | The "for you" chip | **Agreed.** Personal wording: always **"Because you like …"** (e.g. "Because you like SO36", "Because you like Queer Berlin"). The venue reason must name the venue instead of today's "A venue you like" (`explainEvent` in `lib/recommendations.ts`). Look: a pink-to-purple gradient pill with ✨ and a **one-time** shine when it appears (no loop, respects `prefers-reduced-motion`). Overlaid, so it never shifts the layout. No card border accent. |
| D11 | Where Trending goes | **Agreed: no block.** `TrendingStrip` is removed as a block; instead, events that are trending (same data as today, `lib/trendingServer.ts`) get a **"🔥 Popular"** chip on their card, wherever the card appears (This week, New since your last visit, All upcoming). Same overlaid style rules as D10. If a card has both chips, decide in the plan how they sit together. |


## The 500-row limit

`page.tsx` fetches the 500 earliest upcoming events. With ~526 upcoming today, the
latest ~26 never reach the page. **Solved by D6:** the "Coming up" page loads in pages
from the server, so nothing is silently cut off. The home page only needs "This week" and
"New since your last visit".

## Edge cases

- "New since your last visit" is empty, or it is the visitor's first visit: hide it, do
  not pad it.
- Cold visitor (no taste signal yet): no "Because you like …" chips at all.
- Trending has no data yet: no "🔥 Popular" chips at all.
- A card with both chips: they must sit together without covering each other or the
  card's text (exact layout decided in the plan).
- Filters give zero results on "Coming up": show a short, friendly note, not an empty page.
- Event dedupe key: reuse `seriesKey` from `lib/thisWeek.ts` for recurring series, and the
  event id for exact repeats.
- Hydration: anything time- or storage-dependent renders after mount, as in the previous
  change. Overlay or fixed-height elements must not shift the layout.
- Dark mode and ~375px mobile width for every new or reshaped block.

## Acceptance criteria (draft)

1. The home page shows only the blocks in "Agreed order", and no event appears twice on it.
2. "This week" is visually the dominant block on the home page.
3. The "Coming up" page (`/upcoming`) has Filters, a small Surprise me beside them, and the
   All upcoming list from today on, with a "By week / By month" toggle (default by week,
   remembered) and loading more as you scroll.
4. "Because you like …" and "🔥 Popular" chips appear on matching cards, without layout
   shift.
5. Filters, favourites, hide, calendar and Surprise me all still work.
6. `npm run build`, `npm run lint` (no new problems) and `npm test` pass in `frontend/`.
7. No hydration warning in a browser without extensions; no layout jump after mount.

## Open questions (tick when agreed)

- [x] Which blocks to keep? → answered by the agreed order (D8, D9).
- [x] What happens to "For you"? → no block; "Because you like…" chip (D2, D10).
- [x] How far ahead does the "All upcoming" list reach? → own page, loads more as you scroll (D6, D7).
- [x] Where does Surprise me go: beside Filters, or lower down? → Will be besides the Filters(D3) 
- [x] Group the "All upcoming" list by week or by month? → both, with a toggle; default by week (D5).
- [x] Where does Trending go once it has data? → no block; "🔥 Popular" chip on cards (D11).
- [x] Does "Coming up" include this week's events? → yes, it starts from today (D5, D7).
- [x] Name of the new page? → "Coming up", at `/upcoming` (easy to change later).


## Risks

- `EventFeed.tsx` is large and holds most page state. Prefer new small components and a
  small pure module for cross-block dedupe (testable with `tsx`, like `lib/thisWeek.ts`)
  over growing the file.
- Filter state lives in `EventFeed.tsx` today; it has to move to the "Coming up" page
  without breaking anything the home page still needs.
- Existing links into filters (e.g. community-lane links) must point to `/upcoming` after
  the move.
- The existing lint baseline has 19 problems unrelated to this work; only new ones count.
