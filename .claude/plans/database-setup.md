# Phase 2 — Structured source + venue — Implementation Plan

Spec: `.claude/specs/VENUE_MODEL.md`, section "🔜 Phase 2" (content identical to the
now-deleted `docs/VENUE_MODEL.md`).

## Findings from codebase audit (informs the plan)

- Only **two** adapters actually embed a real venue in the title via `Name @ Venue`:
  `src/scrapers/adapters/telegram.ts` (`extractVenueFromText` / `fetchEventMeta`) and
  `src/scrapers/adapters/artAtBerlin.ts` (`` `${artistExhibition} @ ${gallery}` ``).
  `meetup.ts` and `villageBerlin.ts` are also flagged as "aggregators" in
  `venueCategories.ts` but do **not** embed a venue in the title today — for those,
  `parseTitleVenue()` already returns `venue: null` and falls back to the source name.
- No migration file (`supabase/migrations/001`–`005`) touches `source`, `venue_name`,
  `venue_key`, `city`, `lat`, or `lng`.
- `frontend/src/lib/types.ts` `Event` has no fields for these columns yet.
- `EventFeed.tsx` buckets/caps by raw `venue_id` (`interleaveByVenue`, `cappedEvents`,
  `VENUE_CAP_OVERRIDES`) — this is the "per-source cap" the spec wants replaced with
  per-real-venue.
- No `.env` exists in this sandbox — there are no Supabase credentials available to me
  here (see Open Question 1).

## Steps

1. **Migration file** — `supabase/migrations/006_venue_model_phase2.sql`, exactly the
   schema from the spec (`source`, `venue_name`, `venue_key`, `city`, `lat`, `lng` +
   index on `venue_key`). **Generated only — not applied.** I'll tell you when it's
   ready to run by hand.

2. **Scraper contract** — extend `NormalizedEvent` in `src/scrapers/interfaces.ts` with
   optional `source?`, `venue_name?`, `venue_key?`, `city?`, `lat?`, `lng?`. Optional so
   every existing adapter keeps compiling untouched until step 3 updates it.

3. **`venue_key` normalizer** — new small helper (`src/scrapers/venueKey.ts`):
   lowercase → Unicode NFD strip accents → strip punctuation → collapse whitespace.
   Shared by every adapter and the backfill script (one algorithm, not reimplemented
   twice).

4. **Adapter write-path changes**
   - `telegram.ts`: stop building `` `${title} @ ${venue}` ``; instead set
     `venue_name`/`venue_key` directly, `title` stays clean, `source:
     'telegram:<group>'`.
   - `artAtBerlin.ts`: same swap for `` `${artistExhibition} @ ${gallery}` ``.
   - Remaining adapters (`sinemaTranstopia`, `so36`, `festsaalKreuzberg`, `flutgraben`,
     `meetup`, `villageBerlin`, `residentAdvisor`, `neurodivergent`): stamp a static (or,
     for `meetup`/`residentAdvisor`, per-group/per-club) `source` string, and where the
     adapter already knows its own brick-and-mortar venue name, populate `venue_name`/
     `venue_key` too so per-venue capping (step 8) is uniform across all sources, not
     just the two that get backfilled.
   - `runner.ts` needs no change — it upserts whatever keys are on each `NormalizedEvent`.

5. **Backfill script** — `src/scrapers/backfillVenueNames.ts`, run the same way as the
   other ad-hoc scripts (`node --loader ts-node/esm`). Scans existing rows (restricted to
   `isAggregatorVenue` ids to avoid false positives), parses `Name @ Venue` with the same
   logic as today's `parseTitleVenue`, and for each match plans: `venue_name`, `venue_key`
   (via step 3's normalizer), and a `title` with the suffix stripped. **Defaults to
   dry-run** (prints a table of `id | old title → new title | venue_name | venue_key`,
   no writes). Only writes when passed `--apply`, and only touches rows where
   `venue_name IS NULL` (idempotent / safe to re-run).

6. **Frontend types** — add the same optional fields to `Event` in
   `frontend/src/lib/types.ts`.

7. **`EventFeed.tsx` capping/diversity** — switch `interleaveByVenue` and `cappedEvents`
   to bucket on `event.venue_key ?? \`id:${event.venue_id}\`` instead of raw `venue_id`,
   so once `venue_key` is populated, real venues inside an aggregator get diversified
   individually rather than the whole aggregator being one bucket. Falls back to today's
   exact behavior for any row without a `venue_key` (brick-and-mortar, or aggregator rows
   not yet backfilled) — see Open Question 2 for the cap-value design this implies.

8. **`EventCard.tsx` / `venueCategories.ts` — deferred, not done in this pass.** Per your
   constraint, I will not touch `venueCategories.ts`'s Phase 1 parsing logic
   (`parseTitleVenue`, `isAggregatorVenue`) until the column exists in the live DB *and*
   is populated. Since the migration won't be applied during this session, this step is
   out of scope for now. Once you've applied the migration and run the backfill for
   real, come back and I'll wire `EventCard` to prefer `event.venue_name` (falling back
   to `parseTitleVenue` only for any row still unbackfilled) and can then discuss
   whether to shrink/remove the title-parsing path.

9. **Deduped venue list** — add a data-layer query (`frontend/src/lib/eventsServer.ts`)
   that returns distinct `(venue_key, venue_name, count)` for the strip/filter to
   consume later. I will *not* rewire `VenueFilter.tsx`/`VenueStrip` to use it in this
   pass — that UI change depends on step 8 being live first, so it lands together with
   that follow-up.

## Verification against acceptance criteria (after steps 1–7 are done)

| Criterion | Status after this pass |
| --- | --- |
| New scraped events populate `venue_name`+`venue_key`; titles no longer carry `@ Venue` | ✅ for `telegram`/`artAtBerlin` once migration is applied |
| Cards read venue from column, not title | ❌ deliberately deferred — needs the live column (step 8) |
| Capping/diversity operate on `venue_key` | ✅ (step 7), degrades to old behavior pre-backfill |
| Deduped venue list available | ✅ query exists (step 9), not yet wired into UI |

## Open questions before I start writing code

1. **No Supabase credentials in this sandbox.** There's no `.env` here, so I have no way
   to connect and run a *real* dry-run against production data — I can only write the
   backfill script and show you its logic/sample output against synthetic titles. Do you
   want to:
   - (a) add a `.env` with read access to this session so I can run a real dry-run, or
   - (b) have me hand you the finished script and you run `--dry-run` yourself locally?
2. **Cap semantics change.**

    **What is already implemented (Phase 1):**

    - `VENUE_CAP_OVERRIDES` is a lookup table in `frontend/src/components/EventFeed.tsx`
       that assigns a smaller default-view limit to high-volume source buckets. For
       example, venue id `7` (Telegram) and id `3` (Village Berlin) are each limited to
       `12` events, while id `8` (ART at Berlin) is limited to `18` and id `1` (Sinema
       Transtopia) to `15`.
    - `cappedEvents` applies that limit while it builds the default homepage pool. The
       fallback is `VENUE_DISPLAY_CAP` (`30`) for venue ids without an override.
    - The current counter and bucket key are raw `event.venue_id` values. Therefore all
       events arriving through one aggregator source share one counter, even when their
       titles mention different real-world venues. This is why the current behavior is a
       *per-source* cap.
    - The cap only controls the default view. When a user applies a community, vibe,
       venue, or favourites filter, `EventFeed.tsx` uses the uncapped `qualityEvents` pool
       so the filter can reveal the full matching feed. The same raw `venue_id` is also
       used by `interleaveByVenue()` to spread sources through each day's list.

    **Possible Phase 2 change:**

    - Change both `cappedEvents` and `interleaveByVenue()` to use
       `event.venue_key ?? \`id:${event.venue_id}\``. A populated `venue_key` represents
       the real venue named by an aggregator event; the fallback preserves today's
       behavior for rows that have not been migrated or populated yet.
    - The cap value itself can remain the same initially (`12`, `15`, `18`, or `30`),
       but its scope changes. It becomes a cap per real venue rather than per source.
       For example, five Telegram events at venue A and five at venue B consume five
       events from each venue's counter, rather than five events from Telegram's single
       counter. An aggregator can therefore contribute more total events when those
       events are distributed across multiple real venues. That is the intended
       "true per-real-venue balancing" behavior, but it is a deliberate increase in
       default-feed coverage.
    - This does not change filtered views, which remain uncapped, and it does not change
       the source identifier shown to users. It only changes the grouping key used for
       default-feed limiting and within-day ordering.

    **Files involved:**

    - Direct behavior change: `frontend/src/components/EventFeed.tsx` — use
       `venue_key` for the cap counter and interleaving buckets.
    - Supporting data contract: `frontend/src/lib/types.ts` — expose optional
       `venue_key` on `Event`.
    - Database and scraper population needed before the new grouping is useful:
       `supabase/migrations/006_venue_model_phase2.sql`,
       `src/scrapers/interfaces.ts`, `src/scrapers/venueKey.ts`, the adapter files listed
       in step 4, and `src/scrapers/backfillVenueNames.ts`.
    - `src/scrapers/runner.ts` does not need a cap-specific change; it already upserts
       the fields present on each normalized event.

    The decision to confirm is therefore not whether the numeric overrides are removed.
    It is whether those existing numbers should apply once per real `venue_key` instead
    of once per source `venue_id`. The plan assumes yes, because that is the Phase 2
    acceptance criterion, while retaining the current numeric values as the initial
    defaults.
3. **`source` string granularity** for non-Telegram adapters isn't specified in the spec
   (only `'telegram:queer-events-berlin'` and `'meetup'` are given as examples). I'm
   planning one static string per adapter (e.g. `'so36'`, `'village-berlin'`,
   `'art-at-berlin'`), and a per-group string for `meetup` (e.g.
   `'meetup:berlin-neurodivergent-community'`) and per-club for `residentAdvisor`. Flag
   if you want different granularity.
