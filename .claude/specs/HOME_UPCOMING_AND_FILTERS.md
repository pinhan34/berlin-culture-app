# Home page: "This week" first, filters on demand

Restructure the home feed so the first thing a visitor sees is **what is coming up
soon, with no filter applied**, and the four filter groups move behind a single
collapsed **Filters** control instead of a numbered 1-2-3-4 flow.

**Status:** Draft v2, awaiting your review. Decision 1 (personalization) is settled as
a hybrid in layers; the rest are recommendations to confirm before a plan is written.

---

## Why

The app started as an instant reminder of what is coming up at the places a queer,
neurodivergent person cares about. Over time the filters grew until they sit above
everything: today the first screen is four large numbered panels
(`EventFeed.tsx`, the `FilterSection step={1..4}` block), and the actual events only
appear after scrolling past them.

Two side effects make it worse:
- Filter choices persist in `localStorage` (`bca_community`, `bca_vibe`, `bca_venues`,
  `bca_venue_keys`, `bca_date`). A returning visitor can silently see a narrowed feed
  from an old session, with the filters (not the events) taking the top of the page.
- The numbering ("1 Find your scene", "2 What are you in the mood for?" ...) frames
  filtering as a required flow. It is optional.

## Audience and business context

The audience is a niche: **queer indie and neurodivergent (ND) communities in Berlin**.
The venues and sources in the app started as the author's own favourites, but they are
favourites of a wider group of people, and the long-term aim is to monetize the product.

What this means for this change:
- The source list *is* the editorial curation, so unfiltered already means "queer indie
  + ND Berlin". "This week" is the shared front door to it.
- Personalization is a core asset of the product (local taste signals today, AI
  recommendations planned), so it is **not dropped**. It is placed in layers, below, so
  it enhances the shared front door instead of replacing it.
- "This week" is a **single shared surface**, which is what makes it useful as:
  - a place for a clearly labelled **"Promoted" slot** later (`scoreEvent()` already
    accepts a `promotedBoost`; see `docs/MONETIZATION.md`). Not built here, but the
    layout should leave room and must never blend paid placement with organic rows.
  - the content of a **weekly newsletter / digest** ("This week in queer & ND Berlin"),
    using the existing `subscribers` table and signup component.
  - a natural share and calendar-subscribe target.
- Neither monetization feature is part of this change. They only constrain the design:
  keep "This week" a self-contained component fed by a pure function, so a digest or a
  promoted slot can reuse it without touching the filters.

## Personalization: a hybrid in layers

Should the front door be the same for everyone, or change per visitor? **Both, in
layers.** Each layer builds on the one before, and only the first two are part of this
change.

| Layer | What the visitor gets | Same for everyone? | Needs an account? | Status |
| --- | --- | --- | --- | --- |
| 0. **This week** | Chronological next-7-days list, no filters | **Yes**: same events, same order | No | **This change** |
| 1. **Markers** | Light highlights on those same rows: saved events marked, and (once there is enough taste signal) a small "your kind of thing" tag | No, but it never changes *which* events appear or their *order* | No (local taste, Tier 1) | **This change** (saved marker first, taste tag as a second step) |
| 2. **For you** | Ranked recommendations | No | No (Tier 1 today; Tier 3 embeddings later, see `docs/PERSONALIZATION.md`) | Exists, unchanged |
| 3. **Membership** | Taste that follows you across devices, a digest tailored to you, AI recommendations tied to a stable identity | No | **Yes** | **Later**, not required by anything above |

Why this split:
- **Cold start.** A first-time visitor has no signal; the first screen must work
  without one.
- **Local signals are fragile.** Taste lives in one browser's `localStorage` (plus an
  anonymous per-browser ID). Clearing data or switching device resets it, so the top of
  the page must not depend on it.
- **Monetization integrity.** `docs/MONETIZATION.md` says never to reorder the feed
  purely for commission, or to label it "Promoted". A shared, chronological list keeps a
  future paid slot clearly separate from organic rows.
- **The original problem.** Filters and personalization machinery had crowded out the
  events. Layer 0 stays plain; personalization lives in markers and `ForYou`.

Rule that keeps the layers honest: **two visitors with completely different taste see
the identical "This week" events in the identical order.** Only the markers differ.

Membership is deliberately deferred: it unlocks more (cross-device taste, tailored
digest, AI recs) but nothing in Layers 0-2 waits for it.

## Goals

1. The top of the page answers "what's on soon?" without any interaction.
2. That answer is **independent of the filters**: it is never narrowed by a saved
   community, vibe, venue or date choice.
3. Filtering stays fully available, one tap away, and it is always obvious when a
   filter is narrowing the list below.
4. No loss of existing functionality: all four filter groups, favourites, "For you",
   "Just added", Surprise me, active-filter chips.

## Non-goals

- No database, scraper or migration change. Everything needed is already in `events`.
- No accounts, membership or server-side personalization (see
  `docs/PERSONALIZATION.md`); Tier 1 stays client-side. Membership is a later layer and
  is not a prerequisite for anything here.
- No change to how filters combine or how counts are computed (`passes()` and the
  count memos in `EventFeed.tsx` stay as they are).
- Multi-day events (e.g. ART at Berlin exhibitions, whose `start_time` is the opening
  date) are a known gap and out of scope here. They are excluded by the existing
  upcoming-only query and would not appear in "This week" either.

---

## Current structure (`frontend/src/components/EventFeed.tsx`)

Top to bottom today:
1. "Updated N ago"
2. **Filter panel**: four `FilterSection`s, numbered 1-4
   - 1 Find your scene (`CommunityLanes`)
   - 2 What are you in the mood for? (`MoodTiles`)
   - 3 Find your venue (`VenueFilter`)
   - 4 When are you free? (`DateFilter`)
   - plus a "Saved (N)" button when favourites exist
3. `ActiveFilters` chips (count + clear all)
4. "N events hidden" notice
5. "Spin for a surprise" button (`SurpriseMe`, `QuickPicks`, `CalendarSubscribe`)
6. `ForYou` (taste-ranked, default view only)
7. `JustAdded`
8. "Browse everything": the full list grouped by day

Note there are **four** filter groups, not three. "When are you free?" is the fourth.

---

## Proposed structure

1. "Updated N ago" (unchanged)
2. **This week** (new): the next few days of events, chronological, no filters
3. **Filters bar** (new, replaces the panel): one collapsed control, see below
4. `ActiveFilters` chips (unchanged, always visible, including while collapsed)
5. Hidden-events notice, Surprise me, `ForYou`, `JustAdded` (unchanged, below the bar,
   because they respond to the filters today)
6. "Browse everything" (unchanged; this is the list the filters act on)

### This week
- Source pool: the same quality-filtered, URL-deduplicated pool the feed already uses
  (`qualityEvents`), minus events the visitor hid ("Not for me"). **No** community,
  vibe, venue, date or favourites filter applied.
- Window: now to the end of day 7, in Europe/Berlin time.
- Grouped by day using the existing day-heading style; today first.
- Reuses `EventCard` so favourite / hide / calendar / share all keep working.
- Sits above the filters, so a persisted filter can never hide it.

### Filters bar
- Collapsed by default: a single button, "Filters", with a badge showing how many
  filters are active (0 = no badge).
- Expanded: reveals all four groups (scene, mood, venue, when) in one panel, **without
  the number badges or the step wording**. Titles stay, numbers go.
- The "Saved (N)" toggle moves inside the panel.
- Active-filter chips stay visible outside the panel so the current narrowing is
  never hidden by the collapsed state.
- Keyboard and screen reader: real `<button>` with `aria-expanded` / `aria-controls`.

---

## Decisions

Each has a recommendation. Change any of them and the rest of the spec adapts.

| # | Question | Recommendation |
| --- | --- | --- |
| 1 | **Same for everyone, or reordered per visitor?** | **Hybrid in layers** (see "Personalization: a hybrid in layers"): the "This week" events and order are identical for everyone; personalization appears as markers on those rows and in `ForYou`. Membership comes later. *Direction agreed.* |
| 9 | What markers ship in this change? | **Saved-event marker first** (`EventCard` already supports it), then a **"your kind of thing" tag** as a second plan step, shown only once the visitor has enough taste signal (existing `hasTaste`) and never for a cold visitor. |
| 2 | Window: fixed next 7 days, or "next N events"? | **Next 7 days.** If fewer than 4 events fall in it, extend to the next 14 days so the section is never empty; label changes to "Coming up next". |
| 3 | How many to show? | **First 8 events**, then "See all N this week" expanding in place. Keeps the filters bar visible without a long scroll. |
| 4 | Recurring events (weekly MeetUp co-working etc.) can fill the section | **Show only the next occurrence** of a series (same title + venue key) in "This week"; all occurrences remain in "Browse everything". |
| 5 | Where does "When are you free?" go? | **Inside the Filters panel** as the fourth group. It narrows the Browse list; "This week" already covers the near term. |
| 6 | Filters panel default state | **Collapsed every visit** (session-only, not remembered). Chips + the badge make persisted filters obvious. |
| 7 | Where do `ForYou` / `JustAdded` go? | **Below the Filters bar, unchanged.** They respond to filters today, so they belong after the control. Keeps the change small. |
| 8 | Section name | **"This week"**, switching to "Coming up next" under Decision 2's fallback. |

---

## Edge cases

- **Nothing in the window at all:** show a short empty state and still show the bar.
- **Everything hidden by "Not for me":** same empty state, plus the existing "show all
  again" link.
- **Time zones and hydration:** "now" and "today" differ between server and client.
  "This week" must render only after mount (like the existing `mounted` guard) or use
  a value stable across both, to avoid a hydration mismatch.
- **Markers and hydration:** markers depend on `localStorage`, so they appear only after
  mount, and appearing must never change which rows are shown or their order (no layout
  reshuffle on load).
- **Cold visitor:** no taste signal means no taste tags; the list is otherwise identical.
- **Persisted filters with a collapsed bar:** badge + chips must appear on first paint
  after mount, so the visitor is never looking at a narrowed list without knowing.
- **Dark mode and mobile:** the collapsed bar and expanded panel need both themes and
  a usable touch layout (the current panel is `p-3 sm:p-4`).

## Acceptance criteria

1. On a fresh load with **no** stored filters, the first content block is "This week".
2. With a stored community or vibe filter, "This week" is unchanged and the badge and chips show the narrowing.
3. Every filter that worked before still works from inside the panel, with unchanged counts.
4. No step numbers remain anywhere in the UI.
5. Expanding and collapsing is keyboard operable and announces its state.
6. Two visitors with different stored taste see the **same** "This week" events in the
   **same** order; only markers may differ.
7. "This week" never shows a hidden event, a past event, or two occurrences of the same
   recurring series (Decision 4).
8. `npm run build`, `npm run lint` (no new errors) and `npm test` pass in `frontend/`.
9. No hydration warning in the browser console.

## Risks

- `EventFeed.tsx` is ~770 lines and holds most of the page state; extracting "This
  week" and the bar into their own components is preferable to growing it further, but
  needs care not to break `isDefaultView` / `hasActiveContentFilter`.
- The frontend tests mirror logic in standalone `.mjs` files (`frontend/scripts/`), so
  new pure logic (the window and series rules) is best kept in a small `lib/` module so
  it can be tested directly.
- "This week" reads a lot of data already on the page; no new query is planned, so no
  performance risk is expected. Confirm during the plan.

## Out of scope / possible follow-ups

- A labelled "Promoted" slot in "This week" (needs disclosure rules; check `docs/MONETIZATION.md` and `docs/LAUNCH_AND_LEGAL.md` first).
- A weekly email digest built from the same "This week" list.
- An optional "for my scenes" toggle (queer / ND first) on top of the shared calendar.
- Membership (Layer 3): cross-device taste, tailored digest, AI recommendations.
- Showing ongoing multi-day exhibitions.
- Renaming or reordering the individual filter groups.
