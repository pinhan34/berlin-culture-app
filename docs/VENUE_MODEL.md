# From Sources to Venues — Telegram/aggregator rework

How we evolve the data model so the app stops conflating **where we scraped an
event** (the *source*) with **where the event actually happens** (the *venue*).
This is the source of several UX problems (misleading card labels, a few
sources dominating the feed, a confusing venue filter).

**Status:** Phase 1 ✅ (this change) · Phase 2 🔜 (planned, needs a migration)

---

## The problem

`events` has a single `venue_id` that points at the **source** we scraped, not
the real venue. For brick-and-mortar venues that's fine (source = venue). For
**aggregators** it's wrong — one id stands in for many independent events at
many real places:

| `venue_id` | Display name | What it actually is |
| --- | --- | --- |
| 7 | QUEER EVENTS Berlin | a Telegram group reposting events at *many* venues |
| 2 | ND Community / MeetUp | a bundle of MeetUp groups |
| 3 | Village Berlin | a space that *also* reposts many community events |
| 8 | ART at Berlin | an aggregator of many independent galleries |

Consequences:
1. **Misleading labels** — every Telegram event shows "QUEER EVENTS Berlin"
   instead of its real venue.
2. **Feed domination** — capping/balancing is per-source, so high-volume
   aggregators (Village, Telegram) crowd the feed.
3. **Confusing filter** — "Find your venue" mixes real venues (SO36, Festsaal)
   with source buckets (Telegram, MeetUp) tagged "(you)".
4. **No clean "where we look"** — the venue strip lists sources, not venues.

### Where is the real venue today?
Only in the **title**. The Telegram scraper extracts it as `Event name @ Venue`
when it can (`extractVenueFromText` / `fetchEventMeta` in
`src/scrapers/adapters/telegram.ts`). There is **no structured venue field** on
events, and coverage is partial (events with a link but no detectable venue have
no venue name at all).

---

## ✅ Phase 1 — presentation-only (no schema change)

Goal: fix ~80% of the *perceived* problem immediately, using data we already
have, with zero migration risk.

### 1. Show the real venue on the card
For aggregator sources, parse `Name @ Venue` out of the title at render time:
- **Card title** → the event name (without the `@ Venue` suffix).
- **Venue chip** → the parsed real venue (e.g. "Tresor", "Café Cralle").
- **Source** → demoted to a small "via QUEER EVENTS Berlin" line.
- **Fallback** → if no venue can be parsed, the chip keeps showing the source
  name (today's behaviour).

Helpers: `isAggregatorVenue()` + `parseTitleVenue()` in
`frontend/src/lib/venueCategories.ts`. The underlying `event.title` is left
unchanged, so calendar exports and vibe/keyword classification still use the
full text.

> Limitation: coverage is partial and parsing is string-based (e.g. "Café
> Cralle" vs "Cafe Cralle" are different strings). Good enough for display, not
> good enough to treat as canonical venue entities — that's Phase 2.

### 2. Tame feed domination
Lower the per-source display caps for the high-volume aggregators (Village,
Telegram, MeetUp) and keep within-day venue interleaving. This bounds how much
any single source can occupy. (`VENUE_CAP_OVERRIDES` in `EventFeed.tsx`.)

> Limitation: still a per-*source* cap. True per-*real-venue* balancing needs
> the structured venue field from Phase 2.

### 3. Regroup the "Find your venue" filter
Split the flat list into two labelled groups and drop the personal "(you)" tag
(a leftover from when this was a private tool):
- **Venues** — Sinema, SO36, Flutgraben, Festsaal, OYA, Gelegenheiten.
- **Community feeds** — Telegram, MeetUp, Village, ART at Berlin.

(`VenueFilter.tsx`.)

### Files touched (Phase 1)
`lib/venueCategories.ts`, `components/EventCard.tsx`, `components/EventFeed.tsx`,
`components/VenueFilter.tsx`.

### What Phase 1 deliberately does NOT do
- Does not create real venue entities, dedupe them, or populate the venue strip
  dynamically (parsed strings are too dirty).
- Does not change the database or the scraper.

---

## 🔜 Phase 2 — structured source + venue (schema change)

Goal: make the model *correct* and future-proof, so the strip, filter, capping,
and personalization can all operate on real venues.

### Schema
Add structured columns to `events` (keep `venue_id` as the **source**):
```sql
alter table public.events
  add column source         text,      -- e.g. 'telegram:queer-events-berlin', 'meetup'
  add column venue_name      text,      -- real venue, parsed/fetched at scrape time
  add column venue_key       text,      -- normalised key for dedup (lowercased, no accents)
  add column city            text,      -- future multi-city
  add column lat             double precision,
  add column lng             double precision;
create index on public.events (venue_key);
```
Optionally, promote frequently-seen venues into a real `venues`-like table once
`venue_key` proves stable, and link events to them.

### Scraper changes
- Write the real venue into `venue_name` (not the title), plus a normalised
  `venue_key` (lowercase, strip accents/punctuation) for dedup.
- Record the originating `source` (which Telegram group / MeetUp group / gallery)
  separately from `venue_id`.
- Backfill: a one-off script parses existing `Name @ Venue` titles into
  `venue_name` / `venue_key` and clears the suffix from the title.

### What it unlocks
- **Honest venue chips** from a real column (no string parsing at render).
- **Per-real-venue capping/diversity** → better domination control than per-source.
- **A real "Venues featured" view** (deduped via `venue_key`) and optional
  dynamic population of the strip/filter.
- **Geo features** later (map, "near me") via lat/lng.
- **Better personalization** — taste by real venue, not by aggregator bucket.

### Effort & risks
- **Effort:** ~1–2 days (migration + scraper write path + backfill + UI swap
  from parsing to column).
- **Risks:** dirty venue strings (mitigate with `venue_key` normalisation +
  a manual alias map for the top venues); backfill correctness (dry-run first);
  keep `venue_id`/source semantics clear to avoid regressions.

### Acceptance criteria
- New scraped events populate `venue_name` + `venue_key`; titles no longer carry
  the `@ Venue` suffix.
- Cards read the venue from the column, not the title.
- Capping/diversity operate on `venue_key`.
- A deduped venue list is available for the strip/filter.

---

## Decision log / open questions
- **Which ids count as aggregators?** Currently `{2 MeetUp, 3 Village, 7
  Telegram, 8 ART at Berlin}`. Revisit if a source changes character.
- **Promote venues to entities in Phase 2?** Start with columns on `events`;
  only introduce a separate venue table if `venue_key` data proves clean and
  useful enough to curate.
- **Multi-city / geo?** Out of scope now; the Phase 2 columns leave room for it.
