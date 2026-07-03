# Code Roadmap — what's left to build

> The remaining **code-actionable** work, grouped A–F, with status, effort and why it
> matters. Companion to the strategy docs ([MONETIZATION](./MONETIZATION.md),
> [DISTRIBUTION](./DISTRIBUTION.md), [LAUNCH_AND_LEGAL](./LAUNCH_AND_LEGAL.md)) and the
> data-model plan ([VENUE_MODEL](./VENUE_MODEL.md)) / personalization tiers
> ([PERSONALIZATION](./PERSONALIZATION.md)).
>
> **Legend:** ✅ done · 🟡 partial · ⬜ not started · ✍️ needs your (non-code) input
>
> Recommended order: **A → C → B**, then D/E/F as capacity allows. A is the actual
> bottleneck between "deployed" and "getting traffic"; C is a cheap win that shows off the
> data pipeline; B is monetization groundwork you can build before joining any network.

---

## A. Distribution engine — the real launch bottleneck
Turns our own data into the marketing content that drives traffic. See DISTRIBUTION §18–§19.

| Item | Status | Effort | Notes |
| --- | --- | --- | --- |
| **"This weekend in Berlin" share generator** | ✅ | — | `/api/share` (next/og image) + `/share` owner tool: range/format picker, preview, download, per-channel UTM caption. |
| **Newsletter capture** | ✅ | — | `NewsletterSignup` on the homepage + `/api/subscribe` route → `subscribers` table (migration `003`, RLS-locked, service-role writes). Captures `utm_source`. Sending the digest itself is still manual/external (see below). |
| **UTM landing capture** | ✅ | — | `VisitTracker` (in layout) + `lib/attribution.ts` + `/api/track-visit` → `visits` table (migration `004`). First-touch stored on-device (no consent); per-session visit log is consent-gated. Newsletter signup now credits first-touch source. |
| **Owner "traffic by channel" view** | ✅ | — | `/stats?key=…` (token-gated by `STATS_TOKEN` env, noindex) + `lib/visitsServer.ts`. Aggregate visits by source/referrer/campaign + subscribers by source. No PII. |

## B. Monetization code (groundwork — build before joining networks)
See MONETIZATION §4, §13, §16.

| Item | Status | Effort | Notes |
| --- | --- | --- | --- |
| **#20 Phase 0 — click instrumentation by domain** | ✅ | — | `interactions` logs outbound `domain` + `venue_id`. |
| **#20 Phase 1 — affiliate link-transform layer** | ✅ | — | `lib/affiliate.ts` rewrites outbound domain → tracking link, applied to `EventCard` + `TrendingStrip` hrefs. No-op until env IDs are set; calendar/ICS feed stays clean. Flip real IDs on after joining a network. |
| **#21 Promoted events** | ⬜ | ~half day | `promoted` flag on events → positive `promotedBoost` in `scoreEvent`, plus a **"Promoted"** label + boost cap. Monetizes even RA/Telegram events. |
| **Affiliate disclosure note** | ✅ | — | Footer line shown only when `hasAffiliateConfig()` is true (an affiliate program is configured). |

## C. Personalization Tier 2b — use the data we now collect
Tier 2a (server-side anonymous `interactions`) is done. See PERSONALIZATION.

| Item | Status | Effort | Notes |
| --- | --- | --- | --- |
| **Trending strip** | ✅ | — | `lib/trendingServer.ts` (weighted, service-role aggregation) + `/api/trending` + `TrendingStrip` on the homepage. Hidden until interaction data accrues. |
| **Collaborative filtering** | ⬜ | larger | "people who liked X…"; later, once volume justifies it. |

## D. Localization
| Item | Status | Effort | Notes |
| --- | --- | --- | --- |
| **#26 German i18n** | ⬜ | ~1 day | Language toggle + string extraction (likely `next-intl`). Touches every component, hence the size. |

## E. Data model
| Item | Status | Effort | Notes |
| --- | --- | --- | --- |
| **Venue Model Phase 1 (presentation)** | ✅ | — | Parse real venue from aggregator titles, lower aggregator caps, regroup venue filter. See VENUE_MODEL. |
| **Venue Model Phase 2 (schema)** | ⬜ | ~1–2 days | Add `source` / `venue_name` / `venue_key` columns + scraper write path + backfill. Enables honest venue chips, per-real-venue capping, geo later. Spec in VENUE_MODEL. |

## F. Premium (#22)
| Item | Status | Effort | Notes |
| --- | --- | --- | --- |
| **Premium tier** | ⬜ | large | Auth + payments (Stripe) + gating. Realistically last — after there's an audience to convert. |

---

## Non-code / owner tasks (tracked here for completeness)
These are ✍️ *you*, not code (see LAUNCH_AND_LEGAL §17):
- Fill the `[placeholders]` in `/impressum` and `/privacy`.
- Buy a custom domain and set `NEXT_PUBLIC_SITE_URL`.
- Create the `@berlinculture` social accounts and start the posting cadence (fed by A).
- Optionally add privacy-friendly analytics (e.g. Plausible) to read the UTMs.
