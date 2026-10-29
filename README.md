# Berlin Culture App

Collects event listings from Berlin venues, Telegram groups and MeetUp communities into one
feed, with personalized recommendations and two dedicated discovery lanes: **Queer Berlin** and
**Neurodivergent** communities.

Live at [berlin-culture-app.vercel.app](https://berlin-culture-app.vercel.app).

## How it works

```
 venue sites / RA / MeetUp / Telegram
              │
              ▼
   scraper pipeline (root, GitHub Actions cron every 6h)
              │  upserts events
              ▼
        Supabase (Postgres)
              │  reads
              ▼
   Next.js frontend (frontend/, deployed on Vercel)
```

The repo holds **two separate npm projects** that share only the Supabase database. There is no
workspace linking them, so install and run each one from its own directory.

| Path | What it is |
| --- | --- |
| `/` (root) | TypeScript + Playwright scraper pipeline. One adapter per source in `src/scrapers/adapters/`, run in sequence by `src/scrapers/runner.ts`. |
| `frontend/` | Next.js 16 (App Router), React 19 and Tailwind 4. Most domain logic (community tagging, vibes, recommendations, affiliate links, ICS export) lives in `frontend/src/lib/`. |
| `supabase/migrations/` | Numbered SQL migrations, applied by hand (see below). |
| `docs/` | Product and strategy docs: roadmap, monetization, personalization, distribution, launch/legal. |

## Getting started

Requirements: Node.js 22 and a Supabase project.

### Scraper

```bash
npm install
npx playwright install chromium
npm run scrape            # run every adapter once
npm run scrape:telegram   # run only the Telegram adapter
npm test
```

Create a `.env` file in the root:

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...     # admin key: the scraper writes to the DB
# Only needed for the Telegram adapter:
TELEGRAM_API_ID=...
TELEGRAM_API_HASH=...
TELEGRAM_SESSION=...
TELEGRAM_GROUP_IDS=...
```

### Frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:3000
npm test
npm run lint
```

Create `frontend/.env.local`:

```
# Required
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...         # read-only, RLS-safe

# Server-only routes (tracking, newsletter, /stats, admin)
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...             # never use in client code
ADMIN_PASSWORD=...                        # /admin/add-event
STATS_TOKEN=...                           # /stats?key=...

# Optional
NEXT_PUBLIC_SITE_URL=...                  # defaults to the vercel.app URL
NEXT_PUBLIC_AFF_EVENTBRITE=...            # affiliate IDs; with none set, links pass through unchanged
NEXT_PUBLIC_AWIN_AFFID=...
NEXT_PUBLIC_AWIN_MID_EVENTIM=...
NEXT_PUBLIC_AWIN_MID_GETYOURGUIDE=...
NEXT_PUBLIC_AWIN_MID_TIQETS=...
NEXT_PUBLIC_IMPACT_TM_TEMPLATE=...
```

## Deployment

- **Scraper:** `.github/workflows/scrape.yml` runs every 6 hours and can also be started by hand
  from the Actions tab. It reads the same variables as the root `.env` from repository secrets.
  If one adapter fails, the others still save their events and the run does not fail.
- **Frontend:** deployed to Vercel automatically on push.

## Database migrations

There is no migration tool. To change the schema, add the next numbered file to
`supabase/migrations/` and run it by hand in the Supabase SQL Editor, in order.

## Adding a new source

1. Add an adapter in `src/scrapers/adapters/` that implements `WebsiteAdapter` from
   `src/scrapers/interfaces.ts` and returns `NormalizedEvent[]`.
2. Give it a new, unused `venueId`. Never reuse **id 4**: it is retired and filtered out of every
   feed.
3. Register it in the `activeAdapters` list in `src/scrapers/runner.ts`. Keep Telegram last.
4. Map the new venue id to a category in `frontend/src/lib/venueCategories.ts`.

## Further reading

- [`docs/ROADMAP.md`](docs/ROADMAP.md): what's planned next and why
- [`docs/PERSONALIZATION.md`](docs/PERSONALIZATION.md): how recommendations work
- [`docs/MONETIZATION.md`](docs/MONETIZATION.md), [`docs/DISTRIBUTION.md`](docs/DISTRIBUTION.md), [`docs/LAUNCH_AND_LEGAL.md`](docs/LAUNCH_AND_LEGAL.md)
- [`CLAUDE.md`](CLAUDE.md): a detailed architecture guide, also used by AI coding agents
