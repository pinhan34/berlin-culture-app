# Personalization — "Learning From You"

How the app learns each visitor's taste and tailors what they see. This is the
single source of truth for the personalization roadmap, tracking what is **done**
and what is **planned** across all three tiers.

**Status legend:** ✅ done · 🔜 planned · 🧪 optional/experimental

| Tier | Theme | Status |
| --- | --- | --- |
| **Tier 1** | Local, free, no-backend taste learning | ✅ **Done** |
| **Tier 2a** | Server-side interaction collection (Supabase) | ✅ **Done (code)** · ⏳ migration to run |
| **Tier 2b** | Aggregate features: Trending + collaborative | 🔜 Planned (needs traffic) |
| **Tier 3** | Semantic / ML recommendations (pgvector) | 🔜 Planned |

> Where we are: the local engine learns across **four dimensions** (venue,
> category, vibe, community), decays with time, takes negative signals, and
> explains itself. **Tier 2a** now also streams those signals to Supabase
> (anonymous, no PII), building the server-side data foundation. The remaining
> unlock (Tier 2b) — Trending + collaborative — is built once there's enough
> traffic for aggregates to be meaningful.

---

## Foundations — signals & storage (recap)

Tier-1 taste lives in the browser's `localStorage`; Tier-2a additionally mirrors
signals to Supabase (anonymous, no PII):

| Key | Holds |
| --- | --- |
| `bca_interactions` | Last 200 raw interactions (clicks, calendar saves) + `domain`/`venueId` |
| `bca_favourites` | Favourited event ids |
| `bca_hidden` | "Not for me" event ids |
| `bca_taste_hints` | Counts of vibe/community filters the user picked |
| `bca_anon_id` | Anonymous per-browser UUID for server-side collection (Tier 2a) |

Core pipeline: `buildTasteProfile()` → `scoreEvent()` / `explainEvent()` in
`frontend/src/lib/recommendations.ts`. Server write path:
`syncInteraction()` → `POST /api/track` → `interactions` table.

---

## ✅ Tier 1 — Local taste learning (DONE)

### Summary of what shipped
A four-dimension, time-decaying, bidirectional taste model with transparency,
all client-side and privacy-friendly.

### Checklist
- [x] **Vibe + community affinity** added to the profile (not just venue/category)
- [x] **Recency decay** on clicks/saves
- [x] **Negative signal** — "Not for me" hides an event and downranks similar ones
- [x] **Soft hints** — explicit vibe/community filter choices nudge ranking
- [x] **"Why you're seeing this"** reason chips on For-You cards
- [x] Memoized classifiers for the new scoring/sorting hot paths

### How it works (parameters)
**Dimensions & weights** (`scoreEvent`):

| Dimension | Weight | Source |
| --- | --- | --- |
| Venue affinity | ×2 | which venues you engage with |
| Community affinity | ×2 | queer / neurodivergent (`communities.ts`) |
| Vibe affinity | ×1.5 | party/live/arts/wellness/community/activist (`vibes.ts`) |
| Category affinity | ×1 | art/music/community/personal |
| `promotedBoost` | additive | monetization hook (unused today) |

**Signal weights** (`buildTasteProfile`):

| Signal | Weight | Counts toward "taste depth"? |
| --- | --- | --- |
| Click | +1 (×recency) | yes |
| Calendar save | +2 (×recency) | yes |
| Favourite | +3 | yes |
| Hide ("Not for me") | −2.5 | no (tells us what to avoid) |
| Filter hint | +0.5 each (capped 10) | no (gentle nudge) |

**Recency decay:** clicks/saves lose half their weight every ~21 days
(`RECENCY_HALFLIFE_MS`). Favourites stay full-weight (explicit intent).

### Where it surfaces
- **For you** row — top-scored events (after ≥3 real signals), now with reason chips.
- **Within-day feed re-ranking** once the user has taste.
- **"My vibe"** curated pick in Surprise Me, with a stated reason.

### Files touched
`lib/recommendations.ts`, `lib/tasteHints.ts` (new), `lib/vibes.ts`,
`lib/communities.ts`, `components/EventCard.tsx`, `components/ForYou.tsx`,
`components/EventFeed.tsx`.

### Known limits (motivating Tier 2/3)
- Per-browser only — clears with cache, doesn't sync across devices, max 200 events.
- No cross-user intelligence ("trending", "people also liked").
- Keyword-based vibe/community tags can miss nuance (semantic gap → Tier 3).

---

## ✅ Tier 2a — Server-side interaction collection (DONE — code)

**Goal:** stop being purely per-browser. Stream every signal to Supabase under an
anonymous id, building the server-side data foundation that the aggregate
features (2b) and real cross-user analytics need.

> Note on the anonymous (no-login) choice: 2a's deliverable is **server-side
> data collection + the foundation for 2b**, not personal cross-device sync.
> True "my taste follows me to a new phone" requires login (deliberately
> deferred). With anonymous ids, a new device/browser is a new id.

### Checklist
- [x] Anonymous identity (`bca_anon_id`, `crypto.randomUUID()`) — `lib/anonId.ts`
- [x] `interactions` table + indexes + RLS — `supabase/migrations/002_interactions.sql`
- [x] Write path: `POST /api/track` (service-role insert + validation) — `app/api/track/route.ts`
- [x] Client dual-write for clicks / calendar / favourite / hide — `lib/interactions.ts`, `EventFeed.tsx`
- [x] Robust delivery via `navigator.sendBeacon` (survives click navigation), `fetch(keepalive)` fallback
- [ ] **Run the migration** in the Supabase SQL Editor (only remaining step)
- [ ] Minimal privacy notice (recommended now that data is server-side)

### What shipped
- **Schema** (`002_interactions.sql`): `interactions(id, anon_id, event_id,
  venue_id, action, domain, created_at)` with `action` constrained to
  `click | calendar | favourite | hide`, plus indexes on `event_id`, `anon_id`,
  `created_at`.
- **Security:** RLS is **enabled with no client policies** — anon/authenticated
  roles can neither read nor write directly. All writes use the service role via
  the API route; aggregate reads (2b) will be service-role only. No PII is stored.
- **Resilience:** `/api/track` is best-effort and never surfaces infra errors;
  if the table/env is missing it no-ops with `ok: false`, so the app keeps working
  before the migration is applied. The local Tier-1 engine is unchanged.

### Action required
Apply `supabase/migrations/002_interactions.sql` in the Supabase dashboard.
`SUPABASE_SERVICE_ROLE_KEY` is already configured (shared with the admin route),
so no new env vars are needed. Data collection begins the moment the table exists.

---

## 🔜 Tier 2b — Aggregate features (planned, needs traffic)

**Goal:** turn the collected data into cross-user value. Deferred until there's
enough traffic for aggregates to be meaningful (empty otherwise).

### Checklist
- [ ] Aggregate read: `GET /api/trending` (most-engaged upcoming events)
- [ ] "Trending in Berlin" row in the feed
- [ ] Collaborative filtering: co-occurrence ("people who saved X also saved Y")
- [ ] Optional: `scoreEvent` aggregate-popularity term (global nudges personal)

### Trending (aggregate signal)
```sql
-- weight recent engagement; surface upcoming events only
select e.*, sum(
  case i.action when 'favourite' then 3 when 'calendar' then 2
                when 'hide' then -2 else 1 end
) as heat
from events e
join interactions i on i.event_id = e.id
where e.start_time > now()
  and i.created_at > now() - interval '14 days'
group by e.id
order by heat desc
limit 12;
```
(Promote to a materialized view + scheduled refresh if it gets hot.)

### Collaborative filtering (lightweight first)
Co-occurrence over favourites/saves: for events the user liked, find other
events most frequently liked by the same `anon_id`s. No ML needed — a couple of
SQL joins. This is the "people who liked X also liked Y" lane.

### How it folds into the existing model
The client still builds a local `TasteProfile`; 2b adds two **global** rows —
"Trending" and "Others also liked" — that complement the personal ones.
`scoreEvent` can later take an aggregate-popularity term so global signal nudges
personal ranking.

### Effort & risks
- **Effort:** ~1 day (2 API routes + 2 feed rows) on top of 2a.
- **Risks:** bot/duplicate inflation of trending (debounce + rate-limit writes);
  keep it cheap (Supabase free tier is fine at this scale).

### Acceptance criteria
- "Trending in Berlin" reflects real aggregate engagement and excludes hides.
- No raw per-user rows are readable from the client.

---

## 🔜 Tier 3 — Semantic / ML recommendations (pgvector)

**Goal:** close the "semantic gap" that keyword tags leave — understand that a
"FLINTA* noise night" and a "queer experimental concert" are similar even with
no shared keywords. This is the ceiling of "more like this".

### Checklist
- [ ] Enable `pgvector`; add `embedding vector(1536)` column on `events`
- [ ] Generate embeddings at scrape time (title + description + venue)
- [ ] Backfill embeddings for existing events
- [ ] Build a per-user **taste vector** (weighted mean of liked-event embeddings)
- [ ] Semantic "More like this" (per-event nearest neighbours)
- [ ] Semantic "For you" (events nearest the taste vector)
- [ ] Blend semantic score into `scoreEvent` (hybrid ranking)

### Approach
```sql
create extension if not exists vector;
alter table events add column embedding vector(1536);
create index on events using ivfflat (embedding vector_cosine_ops);
```
- **Embeddings:** OpenAI `text-embedding-3-small` (~$0.02 / 1M tokens — pennies at
  this catalogue size). Generate once per event at scrape time; backfill in a batch.
- 🧪 **Cost-free option:** local embeddings via `transformers.js`
  (e.g. `all-MiniLM-L6-v2`, 384-dim) run in a Node script — no API spend, slightly
  lower quality. Worth considering given the project's budget-consciousness.
- **Taste vector:** weighted average of the embeddings of events the user
  clicked/saved/favourited (reuse Tier-1 weights), minus a pull from hidden ones.
- **Query:** `order by embedding <=> :taste_vector limit N` for "For you";
  `order by embedding <=> (select embedding from events where id = :id)` for
  "More like this".

### How it folds in
Hybrid ranking: `final = scoreEvent(...) + λ · semanticSimilarity`. Keyword
vibe/community tags stay (cheap, explainable, good for filter chips); embeddings
add the nuance keywords miss. Start with semantic as a separate "More like this"
lane, then blend once tuned.

### Effort & risks
- **Effort:** ~2–3 days (extension + embedding job + backfill + 1–2 query paths).
- **Risks:** embedding cost/drift (mitigate with the local-model option and
  regeneration only on content change); index tuning (`ivfflat` lists);
  explainability drops (keep keyword reasons for the "why" chips).

### Acceptance criteria
- Every event has an embedding; new events get one at scrape time.
- "More like this" returns sensible neighbours with no shared keywords.
- Hybrid "For you" measurably beats keyword-only ranking on click-through.

---

## Cross-cutting

### Privacy
- **Tier 1:** the personal taste profile is built and stored **entirely in the
  browser** — nothing personal leaves the device for ranking.
- **Tier 2a (now live in code):** anonymous engagement signals are mirrored to
  Supabase under a random `bca_anon_id` (no PII, no account). Raw per-user rows
  are **not** client-readable (RLS with no policies); only service-role API
  routes touch them, and 2b will expose **aggregates only**.
- **Action item:** now that behavioural data is stored server-side, add a short
  privacy notice (GDPR — Berlin/Germany). Keep identifiers anonymous by default.

### Monetization alignment
`scoreEvent(event, profile, promotedBoost)` already carries the `promotedBoost`
hook, so paid/featured placement and affiliate priority can layer onto the same
ranking **without rearchitecting** — see `docs/MONETIZATION_AND_GROWTH.md`.

### Metrics to watch (decide what to build next)
- Click-through rate on **For you** vs. the chronological feed.
- **Hide** rate (high = recommendations are off; also a quality signal).
- Calendar-save and favourite rates per surface.
- Once Tier 2b lands: trending coverage and collaborative-lane CTR.

---

## Recommended sequence
1. ✅ **Tier 1** — done.
2. ✅ **Tier 2a** — done (code). Remaining: run the migration + add a privacy notice.
3. 🔜 **Tier 2b** — build once there's traffic for aggregates to be meaningful.
4. 🔜 **Tier 3** — once data shows which dimensions matter and there's enough
   signal to make embeddings worthwhile.
