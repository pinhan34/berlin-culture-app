# Monetization & Growth Strategy — Berlin Culture App

> Strategy reference combining two areas: **affiliate ticketing monetization** and
> **distribution/marketing (incl. AI agents)**. All program facts verified June 2026.
> This is a planning document — code is **not** implemented yet unless marked ✅.

---

## Table of contents

1. [Affiliate ticketing — how it works](#1-affiliate-ticketing--how-it-works)
2. [Coverage reality for this app](#2-coverage-reality-for-this-app)
3. [The programs in detail](#3-the-programs-in-detail-verified-2026)
4. [Technical implementation](#4-technical-implementation--step-by-step)
5. [Innovative monetization strategies](#5-innovative-monetization-strategies)
6. [Revenue math (realistic)](#6-revenue-math-realistic)
7. [Risks & pitfalls](#7-risks--pitfalls)
8. [Marketing & distribution](#8-marketing--distribution)
9. [AI agents & ChatGPT](#9-ai-agents--chatgpt)
10. [Phase assessment & current status](#10-phase-assessment--current-status)
11. [Recommended budget-aware sequence](#11-recommended-budget-aware-sequence)

---

## 1. Affiliate ticketing — how it works

The mechanic is simple; the money flow is the key thing:

1. User taps an event → app sends them to the ticketing site via a **tracking link** (our ID embedded).
2. The ticketing site drops a **cookie** identifying us as the referrer.
3. If the user buys **within the cookie window** (typically 30 days), the sale is **attributed to us**.
4. The platform pays a **commission** — a **% of the ticket/fee** or a **flat amount per action** — usually monthly.

**Two ways to access programs:**
- **Affiliate networks** (Awin, Impact, FlexOffers, Travelpayouts) — join once, then apply to brands. The norm in Europe.
- **Direct programs** — rare for ticketing.

**Sub-IDs / clickref:** networks let us attach a custom tag per click (e.g. an anonymized event ID), so we can later see *which events and app surfaces drive sales*. Essential for optimization.

---

## 2. Coverage reality for this app

> The most important section. **Our coolest content is the hardest to monetize.**

| Destination | Typical event type | Affiliate? | How |
|---|---|---|---|
| **Resident Advisor (ra.co)** | Underground/techno/club | ❌ No public program | Only via promoter "ticket-rep links" (§5) |
| **DICE (dice.fm)** | Indie gigs, club nights | ❌ No self-service | Partnership only |
| **Telegram / venue-direct / null** | Queer & community grassroots | ❌ No | Not monetizable |
| **Eventbrite** | Workshops, community, some parties | ✅ Yes | FlexOffers / Impact / Skimlinks |
| **Eventim (CTS Eventim)** | Big concerts, mainstream | ✅ Yes | Awin |
| **Ticketmaster** | Big concerts, tours | ✅ Yes | Impact |
| **GetYourGuide / Tiqets** | Tours, attractions (adjacent) | ✅ Yes (best %) | Awin / Travelpayouts |

**Takeaway:** the underground/queer scene that makes the app special (RA, DICE, Telegram) is **largely not affiliate-monetizable**. This is exactly why the *innovative* layer in §5 matters.

---

## 3. The programs in detail (verified 2026)

- **Eventbrite** — via [FlexOffers](https://www.flexoffers.com/affiliate-programs/eventbrite-affiliate-program/) (flat **$8** first paid-event publish), [Impact](https://avidaffiliate.com/programs/eventbrite-com/) (**1–5%**), or up to **~10–25% of the service fee**. 30-day cookie. Commission is on the *service fee*, not full ticket — amounts are modest.
- **Eventim (CTS Eventim)** — Germany's giant, via **[Awin](https://ui.awin.com/merchant-profile-terms/11388)** (merchant ID 11388). Monthly payout, deeplink generator provided. **Strict rules:** valid **Impressum** required, **no paid search**, **no banner marketing**, **no price-comparison** display.
- **Ticketmaster** — [Global Affiliate Program via Impact](https://developer.ticketmaster.com/partners/distribution-partners/affiliate-sign-up/), covers **Germany** + Ticketweb/Universe/etc. One application = all markets.
- **GetYourGuide** — **7–8%**, 30-day cookie, AOV ~€140 → **~€9.80/booking** ([Awin](https://ui.awin.com/merchant-profile/18925)/Travelpayouts). Tours & experiences.
- **Tiqets** — **6–8%**, attractions/museums, 30-day cookie (popular venues capped at 3%).
- **Networks to join:** **Awin** (essential — dominant in Germany; hosts Eventim + GetYourGuide + Tiqets), **Impact** (Ticketmaster + Eventbrite), optionally **Travelpayouts** (easy approval, low payout threshold).

---

## 4. Technical implementation — step by step

### Phase 0 — Instrument first (measure before monetizing)
Before joining anything, measure outbound clicks **by destination domain**.
- We already track clicks by event (`trackInteraction(event.id, 'click')` in `EventCard.tsx`).
- **Missing:** the destination **domain**. Extend tracking to record the host, plus a small local summary view.
- After ~2 weeks we'll know the traffic split (e.g. "60% RA, 15% Eventbrite, 10% Eventim…") → tells us which programs are worth the paperwork.

### Phase 1 — A link-transform layer
A config mapping destination domain → affiliate transform:

```
ra.co              → (none — pass through unchanged)
eventbrite.*       → append ?aff=YOURID
eventim.de         → wrap in Awin deeplink (advertiser 11388 + clickref=eventId)
ticketmaster.*     → wrap in Impact tracking link
getyourguide/tiqets→ Awin deeplink
```

- Applied at click time in `EventCard` (the outbound `href`).
- The webcal **calendar feed stays clean** (no affiliate links in users' calendars).

### Phase 2 — Attribution
Pass an anonymized `clickref`/`subid` (e.g. event ID + coarse source) so networks report which events convert. No personal data.

### Phase 3 — Compliance (non-negotiable, EU/Germany)
- **Impressum** (legally required; also required for Awin/Eventim approval).
- **Affiliate disclosure** ("we may earn a small commission, which keeps the app free").
- **Cookie/consent** mechanism (GDPR).
- **Privacy policy** update.

### Existing groundwork in code
- `scoreEvent(event, profile, promotedBoost)` in `recommendations.ts` already has a `promotedBoost` hook for paid/featured placement (#21).

---

## 5. Innovative monetization strategies

Because vanilla affiliate misses the core content, the differentiated plays matter more:

- **A. "Make a night of it" experiences layer (GetYourGuide/Tiqets).** Best margins (7–8%), no competition with the event's own ticketing. Surface *complementary* experiences (food tours, museum skip-the-line) for tourists/planners — without touching underground links.
- **B. Promoter "ticket-rep links" — monetize the underground affiliate can't.** RA has no public affiliate program, but RA Pro gives promoters **unique trackable rep links** ([source](https://support.ra.co/article/17-promo-codes)). Partner directly with promoters/collectives: feature their event, they give a rep link, we earn per sale and their fans get a discount. No big platform does this for the Berlin underground — our edge.
- **C. Direct venue revenue-share via promo codes.** Venue gives a unique discount code; we get a kickback per redemption. Works on *any* platform, even Telegram. Pure relationship play.
- **D. Smart ticket routing.** When an event exists on multiple platforms, prefer the monetizable link — only if it's genuinely equal/better for the user.
- **E. Transparency as the moat.** No price markup ever; clear "how we make money" note; never reorder the feed purely for commission (or label "Promoted" — ties to `promotedBoost`). Trust is the product.

---

## 6. Revenue math (realistic)

Example: 5,000 monthly visitors → 30% tap an event = 1,500 outbound clicks. If ~20% land on monetizable platforms = 300 clicks. At ~3% purchase conversion = ~9 sales/month. At ~€3 avg commission = **~€27/month** from vanilla affiliate.

**Conclusion:** vanilla affiliate is a passive *baseline*, not the main event. The **experiences layer** (§5A, ~€9.80/booking) and **direct partnerships** (§5B/C) are where it scales. Treat affiliate as the *foundation*, partnerships as the *growth*.

---

## 7. Risks & pitfalls

- **Low coverage** — most underground links aren't monetizable. Set expectations.
- **Attribution loss** — ad-blockers, Safari ITP, app handoffs kill cookies; real conversions under-counted.
- **Eventim's strict terms** — no banners, no paid search; respect or get dropped.
- **Looking commercial** — fastest way to lose the niche audience. Restraint wins.
- **GDPR/consent** — handle before any tracking goes live.

---

## 8. Marketing & distribution

### How discovery/event apps normally grow
**Content engine → community → partnerships → paid amplification → owned audience (email).**
Our unfair advantage: **the app *is* a content factory** — daily ranked, vibe-tagged, fresh "what's on in Berlin." Most startups must invent content; we generate it.

### Instagram (primary channel)
**Organic (free, first):**
- **"This weekend in Berlin" Reel** — 15–30s vertical, 3–5 events, trending audio, posted every Thursday. Highest-ROI format for event accounts.
- **Carousels** — "7 queer parties this week", "Neurodivergent-friendly events" → maps to **community lanes** & **vibe tags**, auto-generatable from our data.
- **Daily Stories** — "Just added" events (we have this feature), polls, countdowns.
- **Link-in-bio** → app (affiliate links live underneath).
- **Repost/collab** — tag venues/promoters; they reshare to their audiences (free reach; seeds promoter partnerships).

**Paid (later, small budget):**
- The "innovative apps you see advertised" = **Reels/Stories ads via Meta Ads Manager**, usually **Advantage+**.
- **Hook in first 1.5s**, one clear value prop, **geo-target Berlin** + interests, **retargeting** + **lookalikes**.
- Objective: **Traffic/Engagement** first; **App Installs** only if native.
- Start **€5–10/day**, kill losers fast, scale winners. Don't pay before retention exists.

### Facebook
- **Facebook Events** — Berliners still RSVP here (older/expat audience).
- **Facebook Groups** — hidden goldmine: expat, queer, neurodivergent, student groups. Genuine participation, not spam.
- **Same ad manager** as IG; **Meta Business Suite** for cross-posting.

### Other mediums
| Channel | Why it fits | Cost |
|---|---|---|
| **TikTok** | Reuse Reels; best Gen-Z event discovery | Low |
| **Telegram** | We scrape it — be a publisher too ("Berlin Tonight") | Low |
| **WhatsApp Channels** | Broadcast nightly picks; huge in EU | Low |
| **Reddit** (r/berlin) | Real discovery + fuels AI citations (§9) | Low |
| **Email newsletter** | Most durable, algorithm-proof; Premium funnel | Medium |
| **QR posters/stickers** | Berlin's culture is physical; cafés, venues, Spätis | Low–med |
| **Micro-influencers** | Berlin nightlife creators; pay in access | Variable |
| **Local press/blogs** | iHeartBerlin, Exberliner, tip Berlin | Free (pitch) |
| **ASO / SEO** | Rank for "things to do in Berlin this weekend" | Medium |

> **Owned > rented:** algorithms change overnight. **Email + Telegram/WhatsApp are ours forever.** Capture emails early.

---

## 9. AI agents & ChatGPT

Two distinct, real (2026) opportunities:

### 9.1 Get recommended/cited by AI answer engines (GEO) — high leverage, low cost
When someone asks ChatGPT/Perplexity/Google AI Overviews *"what's on in Berlin this weekend?"*, we want **our app cited**. This is **Generative Engine Optimization (GEO)** — the new SEO — and it rewards **freshness + structured data**, our core strength.

How (per [2026 GEO guidance](https://clairon.ai/blog/generative-engine-optimization-guide)):
- **Allow AI crawlers** in `robots.txt`: `OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, `ClaudeBot`, `Googlebot`.
- **Structure for extraction:** question-style headings + 40–60 word answer blocks; add **FAQ / Event JSON-LD schema** (we already have structured event data).
- **Freshness:** scraper refreshes every 6h — lean in.
- **Reddit footprint:** ~47% of Perplexity citations come from Reddit.
- **Measure:** ask ChatGPT/Perplexity the target questions; see if we're named.

> Probably the **cheapest + most innovative** growth lever available now; few local-events apps do it well.

### 9.2 Build an app inside ChatGPT (Apps SDK / MCP) — a differentiator
OpenAI's **[Apps SDK](https://developers.openai.com/apps-sdk)** (built on **MCP**) lets apps run **inside ChatGPT**. A user asks "what's on in Berlin tonight?" → *our app* answers with a rendered widget.

Requirements (verified):
- An **MCP server** on a **public HTTPS endpoint** exposing tools like `get_berlin_events` (we have the data + API).
- A **Content Security Policy**, **org/identity verification** in the OpenAI dashboard, submission with screenshots/privacy policy/demo account.
- One app version in review at a time; review-gated, self-serve.

Because MCP also powers Claude and other agents, **one MCP server = presence across multiple AI assistants** — a novel channel reusing existing infrastructure.

---

## 10. Phase assessment & current status

| Phase | What | Effort | Revenue potential | Commits us? | Status |
|---|---|---|---|---|---|
| **0** | Log outbound clicks **by domain** | ~1 hr | €0 (measurement) | No | **Not started** (event-level hook exists) |
| **1** | Join Awin+Impact; Eventbrite `aff` + Eventim wrapping | ~½ day + applications | Low–modest baseline | Yes (network terms, Impressum) | Not started |
| **2** | Experiences layer (GetYourGuide/Tiqets cards) | ~1–2 days | **Best margin** (7–8%) | Yes (Awin) | Not started |
| **3** | Promoter rep-links + venue promo codes | Ongoing | Highest ceiling, scene-native | Partnerships | Not started |

**Related already-shipped features (retention foundation):**
- ✅ Personalized calendar subscription feeds (#17)
- ✅ Vibe/sentiment tagging (#13)
- ✅ Dedicated community lanes — Queer / Neurodivergent (#24)
- ✅ Freshness (NEW badge, Just-added, Updated-X-ago), Surprise Me, For-you re-ranking, How-it-works
- ✅ `promotedBoost` hook in `recommendations.ts` (groundwork for promoted events #21)

**Still pending (build backlog):** #26 German i18n, #20 affiliate ticket links (phases above), #21 promoted events, #22 Premium tier.

---

## 11. Recommended budget-aware sequence

Front-load everything **free**; spend money only after retention is proven.

1. **Phase 0 — instrument outbound clicks by domain** (free, ~1 hr). Measure.
2. **GEO quick win** — AI-crawler `robots.txt` + Event JSON-LD schema (free, ~1 hr). Plays to freshness.
3. **Organic content engine** — auto-generate "this weekend" posts from our own data (free).
4. **Capture emails / newsletter** (free, owned audience → Premium funnel).
5. **Phase 1 affiliate** — Eventbrite + Eventim *once Phase 0 data justifies it*.
6. **Phase 2 experiences layer** — best margin, least intrusive.
7. **Small paid Meta test** — only after retention is proven.
8. **Phase 3 partnerships + AI app (MCP)** — differentiated long game.

> **The flywheel:** distribution → traffic → (a) affiliate commissions, (b) email list → Premium subscriptions, (c) audience → promoted listings & venue partnerships. Marketing and monetization are the same loop.

---

## 12. What "affiliate program" means (plain-language)

An **affiliate program** is a **referral deal**: a company gives us a special tracking link, and if someone clicks it and buys, the company pays us a small **commission** (a finder's fee). The buyer pays the same price — our cut comes from the company, not them. (Like a promoter who earns per friend they bring through the door, but automated.)

**Why some platforms offer one and others don't:**
- **Eventim, Ticketmaster, Eventbrite** are commercial ticketing companies that *want* outside sites sending buyers, so they run public, self-serve affiliate programs.
- **Resident Advisor (RA) and DICE** do **not** offer a public affiliate program. RA's ticketing serves the scene and its promoters, not outside referrers (it only has *promoter* tools — rep links, promo codes). DICE is partnership-only. So there is **no "sign up and earn" path** on the platforms where most of our best events live.

---

## 13. The `promotedBoost` monetization hook

The feed ranks events by a score (`scoreEvent` in `recommendations.ts`):

```ts
export function scoreEvent(event, profile, promotedBoost = 0): number {
  const venueScore = profile.venueScores.get(event.venue_id) ?? 0;
  const categoryScore = profile.categoryScores[getVenueCategory(event.venue_id)] ?? 0;
  return venueScore * 2 + categoryScore + promotedBoost;
}
```

Today every event is scored with `promotedBoost = 0`, so ranking is purely taste-based and nothing is promoted. The parameter is a **deliberate placeholder** for **promoted events (#21)**:

- A venue/promoter **pays** to be featured higher.
- We pass a **positive `promotedBoost`** (e.g. `+5`) to lift them.
- **Works even when the destination has no affiliate program** — we charge for *placement/visibility*, not a ticket sale. This sidesteps the "RA/DICE have no affiliate" problem entirely.

**Still needed to ship it:** (1) a DB flag for which events are paid, (2) a **"Promoted" label** in the UI for honesty, (3) a **cap** on the boost so paid events can't bury genuinely relevant ones (trust = the product).

---

## 14. The niche-content disadvantage & how to overcome it

**The problem in one sentence:** our underground/queer/grassroots events link to RA, DICE, Telegram, or nowhere — none of which pay per-ticket commissions. So **vanilla affiliate cannot monetize our best content.**

**The strategic reframe:** for niche content, don't monetize the **transaction** (the ticket). Monetize the **audience** and the **placement**.

| Strategy | What it is | Monetizes | Realism | Catch |
|---|---|---|---|---|
| **Premium subscription (#22)** | Charge power users for perks (personal calendar feeds, alerts, no limits) | The **audience** | ⭐⭐⭐⭐ High | Needs a loyal user base first |
| **Promoted events (#21)** | Venues pay for higher placement (`promotedBoost`) | The **placement** | ⭐⭐⭐ Medium | Needs enough traffic to sell |
| **Experiences layer (GetYourGuide/Tiqets)** | Complementary tours/attractions cards | Tourists/planners | ⭐⭐⭐⭐ High (easy) | Adjacent, not the underground itself |
| **Promoter rep-links (RA Pro)** | Partner with a promoter → trackable link/code | The underground! | ⭐⭐ Medium | Requires relationships, doesn't auto-scale |
| **Venue promo codes / rev-share** | Venue gives a discount code, we get a kickback | Even Telegram/NULL events | ⭐⭐⭐ Medium | Manual, per-venue |
| **Donations / "support us"** | Tip jar | Goodwill | ⭐⭐ Low-effort | Small amounts |

**Honest conclusion:** affiliate commissions will only ever be a small side-income for this app because of its niche. The realistic money comes from **Premium subscriptions + promoted placement + a few direct partnerships** (with the **experiences layer** as an easy complementary side-stream — see §15) — monetizing the engaged community and the curation, not the ticket links. That is a **stronger, more defensible business** than affiliate anyway.

---

## 15. How we choose: realism vs strategic fit

The realism star-rating in §14 only measures **"how likely/easy is this to work."** It is **not** the only axis. The second axis is **strategic fit** — how much an option leverages what makes this app special (a curated underground/queer/community feed) and how defensible/on-brand it is. Decisions blend **realism + revenue ceiling + strategic fit**, weighting strategic fit heavily because defensibility comes from the niche identity.

| Option | Realism (ease) | Revenue ceiling | Strategic fit (on-brand / defensible) |
|---|---|---|---|
| **Premium (#22)** | ⭐⭐⭐⭐ High | High | ⭐⭐⭐⭐ Very high — monetizes the loyal community |
| **Promoted events (#21)** | ⭐⭐⭐ Medium | Medium–high | ⭐⭐⭐⭐ High — sells our curation/placement |
| **Experiences (GYG/Tiqets)** | ⭐⭐⭐⭐ High | Medium | ⭐⭐ Low–medium — **adjacent**, tourist-y, risks feeling off-brand |
| **Promoter rep-links** | ⭐⭐ Medium-low | Variable | ⭐⭐⭐⭐ Very high — literally the underground |
| **Venue promo codes** | ⭐⭐⭐ Medium | Low–medium | ⭐⭐⭐ High |

**Is the experiences layer excluded? No.** It is the *easiest* to set up but serves a **different audience** (tourists/planners) than the core (locals, the scene). So it is framed as a **complementary side-stream**, not a core pillar. If a meaningful share of users turn out to be tourists/expats (plausible in Berlin), its strategic fit rises and it becomes more central.

**What "a handful of direct venue/promoter partnerships" means:** a small number (~3–10), **manually arranged**, with specific venues/promoters — not an automated system covering hundreds. They are relationship deals, each set up by hand, each using one mechanism: a **promo code**, an **RA Pro rep-link**, or a **paid "featured" slot**. They do not auto-scale (that is the ⭐⭐ realism), but a handful of the *right* partners is high-value and is the **only realistic way to earn from underground events that have no affiliate program**. "Handful" = start small and manual, with the most important partners.

**Summary of the portfolio:**
- **Core earners (high fit):** Premium → promoted events → a few promoter/venue partnerships.
- **Easy complementary earner (lower fit, different audience):** the experiences layer.
- **Passive baseline (tiny):** affiliate on the minority of mainstream links.

---

## 16. Roadmap: direct venue/promoter partnerships, powered by our scraping

> Key insight: **the scraper is already a curated partnership pipeline.** The adapter list in
> `src/scrapers/runner.ts` (SO36, Festsaal Kreuzberg, OYA Bar, Gelegenheiten, Flutgraben,
> Sinema Transtopia, Village Berlin, Telegram groups…) *is* our shortlist of targets — each
> already carries a `venueId`, and several carry RA club IDs and `website_url`. We don't need
> to find partners; we already track them.

### Step 1 — Rank targets from data we already have
Build a simple **partnership scorecard** per venue using existing signals:
- **Event volume** — count of events per `venue_id` in Supabase (who fills our feed).
- **Freshness** — how often new rows appear (`created_at`) per venue.
- **Demand** — clicks per venue, available once **Phase 0** (outbound-click instrumentation) is live.

Score ≈ `clicks × event_volume`. The top ~10 are the partnership shortlist. *No new scraping needed for this step — it's a query over existing data.*

### Step 2 — Enrich targets with contact info (reuse the scraper)
For each shortlisted venue, get an outreach channel by reusing `fetchEventMeta`-style fetching:
- Pull the venue's `website_url` / RA club page / Telegram group → extract **email, Instagram, booking contact**.
- We already know RA club IDs (e.g. SO36 `15179`, Festsaal `132060`, OYA `249089`, Gelegenheiten `88368`) → their RA pages link to the promoter.
- Output: a small CRM table — *venue, contact, channel, why they fit, current event volume, clicks sent.*

### Step 3 — Outreach with a data-backed pitch (the killer move)
The scraper + Phase 0 clicks give a **credible, concrete pitch** almost no one else can make:
> "Your events already appear in our Berlin culture app. Last month we sent **X clicks** to your tickets — for free. Want to turn that into tracked sales?"

Lead with value, then offer **one** simple mechanism:
- **Promo code** — they give a discount code, we earn a kickback per redemption.
- **RA Pro rep-link** — they generate a trackable rep link, we earn per sale ([RA Pro promos](https://support.ra.co/article/17-promo-codes)).
- **Featured slot** — they pay a flat fee to be promoted (uses `promotedBoost`).

Start with **3–5 most-aligned** venues (e.g. SO36, Festsaal Kreuzberg, OYA Bar, plus a queer/ND-aligned promoter).

### Step 4 — Wire the deal into the product
Each mechanism maps to a small, concrete code change:
- **Promo code:** store a per-venue code; show it on that venue's event cards ("Use **XYZ** for 10% off"). *Works even for Telegram / `event_url = null` events* — the only path to monetize those.
- **RA rep-link:** store a per-venue rep link; rewrite that venue's RA `event_url`s to the rep link (this is exactly the Phase 1 link-transform layer, §4).
- **Featured:** pass a positive `promotedBoost` for that venue's events in `scoreEvent`, plus a **"Promoted"** label and a boost cap (§13).

### Step 5 — Prove value & retain the partner
Monthly, report back: clicks sent (our tracking) + sales/redemptions (their promo/rep dashboard). Concrete numbers → renew and expand the deal. This is what turns a one-off into recurring revenue.

### Step 6 — Scale carefully
Add a few partners per quarter. Keep it a **handful** (manual, high-touch) until volume justifies a self-serve partner portal — at which point it graduates into the **promoted events (#21)** product.

**Why this is the realistic path for the underground:** it doesn't depend on RA/DICE offering an affiliate program. It rides on relationships, and the scraper already (a) identifies who to approach, (b) supplies the contact channel, and (c) generates the click data that *is* the pitch.
