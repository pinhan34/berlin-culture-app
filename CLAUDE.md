# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Berlin Culture App — aggregates event listings from Berlin venues, Telegram groups, and MeetUp
communities into a Supabase database, then serves them through a Next.js frontend with
personalized recommendations. Two first-class discovery lanes: **Queer Berlin** and
**Neurodivergent** communities.

The repo has two independent npm projects that share only a Supabase database:

- **root** (`/`) — TypeScript scraper pipeline (Playwright-based adapters + a Supabase-writing
  orchestrator). Runs on a GitHub Actions cron, not in the web app's request path.
- **`frontend/`** — Next.js 16 (App Router) + React 19 + Tailwind 4 site that reads from the
  same Supabase tables.

Always `cd` into the right project before running its scripts — there's no root workspace linking
them.

## ⚠️ Critical rules — read before any code change

- **Never mix Supabase keys**: root scraper uses `SUPABASE_SERVICE_ROLE_KEY` (admin, write
  access). Frontend uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` (read-only, RLS-safe). Never use the
  service role key in frontend code.
- **Migrations are applied MANUALLY**: generate the SQL file in `supabase/migrations/`, then
  stop and tell the user to apply it against Supabase. Never attempt to run migrations
  automatically.
- **Phase 2 of the venue model is NOT implemented**: do not add `venue_name`, `venue_key`,
  `source`, `city`, `lat`, `lng` columns to `events`, and do not change the scraper write path
  to populate them, unless explicitly asked to start Phase 2. Read `docs/VENUE_MODEL.md` first.
- **Retired venue id 4** must stay filtered out of every feed query — see `RETIRED_VENUE_IDS`
  in `frontend/src/lib/eventsServer.ts`. Never reuse id 4 for a new source.
- **ICS/calendar feeds** must always use the original event URL, never `affiliateUrl()` — see
  `frontend/src/lib/affiliate.ts`.

## Commands

### Scraper (root)
```
npm run scrape              # run the full orchestrator (src/scrapers/runner.ts) — all adapters, sequential
npm run scrape:telegram     # run only the Telegram adapter (src/scrapers/testAdapters.ts telegram)
npm test                    # node --loader ts-node/esm src/scrapers/venueKey.test.ts
npm run format              # prettier --write .
npm run format:check        # prettier --check .
```
No build script is defined at root. Ad-hoc adapter scripts
(`testRA.mjs`, `testVenueExtract.mjs`, `testTitleClean.mjs`, etc. in `src/scrapers/`) are run
directly with `node` for one-off debugging of a single adapter.

Requires a `.env` with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (admin key — the orchestrator
writes to the DB), and Telegram credentials (`TELEGRAM_API_ID`, `TELEGRAM_API_HASH`,
`TELEGRAM_SESSION`, `TELEGRAM_GROUP_IDS`) if touching that adapter. Production runs via
`.github/workflows/scrape.yml`, cron every 6 hours.

### Frontend (`frontend/`)
```
npm run dev      # next dev
npm run build    # next build
npm run start    # next start
npm run lint     # eslint
npm test         # node scripts/classifiers.test.mjs && node scripts/venueModel.test.mjs
npm run format         # prettier --write .
npm run format:check   # prettier --check .
```
Requires `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (read-only, RLS-safe) for
normal pages, plus service-role and other keys for specific server routes (see below).

### Frontend-specific rule (from `frontend/AGENTS.md`)
This project pins a Next.js version whose APIs/conventions may differ from training data —
before writing Next.js code, check `node_modules/next/dist/docs/` for the current API rather
than assuming familiar behavior.

## Architecture

### Scraper pipeline (root `src/scrapers/`)
- `interfaces.ts` defines the contract every source must satisfy: a `WebsiteAdapter` with
  `scrape(): Promise<NormalizedEvent[]>`, and the `NormalizedEvent` shape that maps directly to
  the `events` table columns.
- `adapters/*.ts` — one adapter per source (Playwright-driven site scraping, MeetUp API,
  Telegram via GramJS, etc). Each owns a fixed `venueId`.
- `runner.ts` is the orchestrator: registers active adapters in an array, runs them
  **sequentially** (not parallel, to avoid resource choking), and upserts each adapter's events
  into Supabase with `onConflict: 'venue_id,title,start_time', ignoreDuplicates: false` — a
  conflict is treated as an UPDATE (merges in freshly scraped fields like `description`) rather
  than a skip, so previously-seen events get backfilled without losing their `id`/`created_at`.
  Per-adapter try/catch plus global `uncaughtException`/`unhandledRejection` handlers exit 0 so
  one broken adapter (e.g. a GramJS session error) never fails the whole GitHub Actions run —
  adapters that already wrote to Supabase keep their data regardless.
- Telegram runs **last** in the adapter list specifically because it's the most likely to throw
  an uncaught exception.
- Some source venue ids are "aggregators" standing in for many real-world venues (Telegram,
  MeetUp, Village Berlin, ART at Berlin) rather than one brick-and-mortar place — see
  `docs/VENUE_MODEL.md`. One venue id (4, neurodivergent-berlin.com) is retired; it must stay
  filtered out of every feed query on the frontend (see `RETIRED_VENUE_IDS` in
  `frontend/src/lib/eventsServer.ts`) rather than being reused for a new source.

### Frontend data & personalization layer (`frontend/src/lib/`)
This is where most of the domain logic lives, not in components:
- `types.ts` — canonical `Event`/`Venue` shapes matching the DB schema.
- `eventsServer.ts` / `trendingServer.ts` / `visitsServer.ts` — server-side Supabase queries
  (anon key, read-only, RLS-safe) shared by pages and API routes.
- `venueCategories.ts` — maps each venue id to a broad category (`art`/`music`/`community`/
  `personal`), a display-name override, and (Phase 1 of the venue-model rework) parses the real
  venue back out of aggregator titles formatted as `"Event name @ Venue"` via
  `parseTitleVenue()`. The underlying `event.title` is left untouched so calendar export and
  classification still see the full text.
- `communities.ts` — tags each event into zero/one/both of the `queer` / `neurodivergent`
  community lanes, via **either** a whole venue being dedicated to that community (e.g. venue id
  7 = the queer Telegram feed) **or** a keyword regex match against title/venue/description. The
  venue-id rule exists because aggregator event titles often don't contain any community
  keyword.
- `vibes.ts` — similar keyword-based tagging for content "vibe" categories.
- `recommendations.ts` — builds a per-visitor `TasteProfile` from local signals (clicks,
  calendar saves, favourites, hides, explicit filter usage), each recency-decayed
  (`RECENCY_HALFLIFE_MS`, ~3 weeks), across four dimensions (venue, category, vibe, community).
  `scoreEvent()` combines them into a ranking score and accepts a `promotedBoost` — a forward
  hook for paid placement without needing to rearchitect scoring later. No backend account
  required; this is entirely client/local-signal based ("Tier 1" personalization — see
  `docs/PERSONALIZATION.md`).
- `affiliate.ts` — rewrites outbound ticket URLs into affiliate tracking links at click time, for
  supported platforms only (Eventbrite; Eventim/GetYourGuide/Tiqets via Awin; Ticketmaster via
  Impact). Every other domain (RA, DICE, Telegram, unknown) passes through unchanged. All IDs
  come from `NEXT_PUBLIC_*` env vars — with none set, every function is a no-op. **The
  calendar/ICS feed (`ics.ts`) must always use the original URL, never `affiliateUrl()`**, so
  affiliate links never leak into a user's calendar.

### API routes (`frontend/src/app/api/`)
Thin — most logic is imported from `lib/`. Notable ones: `subscribe` (newsletter → `subscribers`
table), `track` / `track-visit` (interaction + UTM attribution logging), `trending` (serves
`trendingServer.ts` aggregation), `share` (next/og dynamic share-card image generation),
`admin/add-event` (manual event entry, paired with `/admin/add-event` page).

### Database (`supabase/migrations/`)
Plain numbered SQL migration files (`001_align_schema.sql` → `005_event_description.sql`), no
migration tool/CLI wired up — apply them manually against the Supabase project in order. Key
tables: `events`, `venues`, `interactions`, `subscribers`, `visits`.

### Docs (`docs/`)
Product/strategy docs, not API references — read before large feature work in that area:
`ROADMAP.md` (status of planned work, what's next and why), `VENUE_MODEL.md` (source-vs-venue
data model, Phase 1 done / Phase 2 planned), `MONETIZATION.md` / `MONETIZATION_AND_GROWTH.md`,
`PERSONALIZATION.md` (tiering plan), `DISTRIBUTION.md`, `LAUNCH_AND_LEGAL.md`.