# Personalization — "Learning From You"

How the app learns each visitor's taste and tailors what they see. This is a
privacy-friendly, **no-backend** system today (everything lives in the
browser's `localStorage`), with a clear upgrade path to durable, cross-device,
and ML-powered recommendations.

> TL;DR: the **plumbing is ~80% built**, but the **intelligence is still
> shallow** — it only learns *which venue* and *which of 4 broad categories*
> you engage with. The roadmap below makes it genuinely smart, mostly with code
> we already have.

---

## 1. What we already have (Layer 1 — local, free)

### 1.1 Signals we capture
Source: `frontend/src/lib/interactions.ts` + the `bca_favourites` key.

| Signal | Action | Strength | Stored as |
| --- | --- | --- | --- |
| Opening / clicking an event | `click` | weak positive (1) | `bca_interactions` |
| Saving to calendar | `calendar` | medium positive (2) | `bca_interactions` |
| Favouriting (heart) | — | strong positive (3) | `bca_favourites` |

- History is capped at the **last 200 interactions** per browser.
- Each interaction also records the outbound `domain` and `venueId` — but that
  metadata currently feeds the **monetization click-stats panel**
  (`ClickStats.tsx`), not the taste model.

### 1.2 The taste model
Source: `frontend/src/lib/recommendations.ts`.

- `buildTasteProfile()` aggregates signals into:
  - **`venueScores`** — affinity per venue.
  - **`categoryScores`** — affinity across **4 buckets only**: `art`, `music`,
    `community`, `personal`.
  - **`totalSignals`** — how much we know about the user.
- `scoreEvent()` ranks any event:
  `score = venueScore × 2 + categoryScore + promotedBoost`
  (`promotedBoost` is a forward hook for paid/featured placement — unused today).

### 1.3 Where personalization actually shows up
- **"For you" row** (`ForYou.tsx`) — top-scored events, shown only after
  **≥ 3 signals** (`TASTE_THRESHOLD`).
- **Within-day re-ranking** of the main feed once the user has taste; otherwise
  the feed interleaves by venue so no single source dominates (`EventFeed.tsx`).
- **"My vibe"** curated pick in **Surprise Me** (`SurpriseMe.tsx`) — picks the
  highest-scoring unseen event and explains *why* it was chosen.
- **`promotedBoost`** monetization hook, ready but not yet wired.

### 1.4 What this buys us
- Zero infrastructure cost, instant, and **privacy-friendly** (data never
  leaves the device).
- A working personalization loop: tap/save → profile updates → feed adapts.

---

## 2. The honest gaps (what it does NOT do yet)

| Capability | Status | Note |
| --- | --- | --- |
| Learns your **vibe** (party / live / arts / wellness / activist) | Missing | Already classified in `vibes.ts`, **not fed into the profile** |
| Learns your **community** (queer / neurodivergent) | Missing | Already classified in `communities.ts`, not learned |
| Learns **time-of-day / weekday** habits | Missing | `start_time` is available but unused for taste |
| **Negative** signals ("not for me" / hide) | Missing | Only positive signals exist |
| **Recency decay** (recent taps matter more) | Missing | A tap from 3 months ago counts the same as today |
| Uses **explicit filters** as soft taste | Missing | Filter choices are momentary, not remembered |
| **Cross-device / durable** storage | Missing | `localStorage` = this browser only, max 200 events |
| **Collaborative** filtering ("liked X → also liked Y") | Missing | Needs a backend |
| **Semantic** matching (embeddings / pgvector) | Missing | Originally planned "Step 3" |
| **Transparency** ("why am I seeing this?") | Partial | Only on the new My-vibe card |

---

## 3. Roadmap — what we'll implement next

Ordered by cost vs. impact.

### Tier 1 — free, local, high impact (hours each, no backend)
1. **Feed vibe + community into the profile.** Add `vibeScores` and
   `communityScores` to `buildTasteProfile`/`scoreEvent`, reusing the
   classifiers we already wrote. *Biggest bang for the buck* — instantly makes
   For You, the feed re-rank, and My Vibe much more "you".
2. **Recency decay.** Weight each signal by age so taste tracks the user's
   current mood instead of their all-time history.
3. **A "Not for me" / hide action.** The first negative signal; improves quality
   quickly and reduces repetition.
4. **Remember explicit filters as soft taste.** Repeatedly filtering "Live
   music" should gently lift live events even after the filter is cleared.
5. **"Why you're seeing this" chips** on For-You cards. Transparency builds
   trust and nudges more engagement.

### Tier 2 — needs Supabase (the real unlock)
6. **Persist interactions to a table** (anonymous id, later auth):
   - Durable beyond 200 events and beyond a cache clear.
   - **Cross-device** (same taste on phone + laptop).
   - **Aggregatable across all users** → enables a genuine
     "Trending in Berlin" signal and basic collaborative filtering
     (co-occurrence: people who saved X also saved Y).

### Tier 3 — ML / semantic
7. **`pgvector` embeddings** of event text (title/description) + a per-user
   taste vector → semantic "more like this" recommendations and a learned
   re-ranking layer. This is the ceiling of the concept.

---

## 4. Recommended next step

Start with **Tier 1 #1 (vibe + community affinity)**: it reuses existing
classifiers, needs no infrastructure, and immediately deepens every
personalized surface. Follow with **recency decay (#2)** and a
**negative signal (#3)**.

Tier 2 (#6) is the moment personalization stops being per-browser and becomes a
real, defensible product asset — worth doing once the local signals prove which
dimensions matter most.

---

## 5. Privacy & monetization notes
- Today nothing about a user leaves their browser — a strong, honest privacy
  stance worth surfacing in the UI.
- The same `scoreEvent` pipeline already carries a `promotedBoost` argument, so
  paid/featured placement can be layered on **without rearchitecting** the
  ranking (see `docs/MONETIZATION_AND_GROWTH.md`).
- When we move to Tier 2, we should add a clear, minimal consent/notice and keep
  identifiers anonymous by default.
