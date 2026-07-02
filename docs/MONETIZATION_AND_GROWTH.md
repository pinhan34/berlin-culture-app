# Monetization & Growth Strategy — Berlin Culture App

> Strategy reference combining two areas: **affiliate ticketing monetization** and
> **distribution/marketing (incl. AI agents)**. All program facts verified June 2026.
> This is a planning document — code is **not** implemented yet unless marked ✅.

---

## 0. Bottom line up front — is affiliate a realistic monetization *gate*?

**Short answer: no.** For this app, affiliate ticketing is a *passive baseline*, not a
business model. Three structural reasons:

1. **Much of our best content can't be affiliated at all** — underground/queer/community
   events are often **free, donation, or door-pay** (no online checkout to earn on), or
   they link to **RA / DICE / Telegram**, which have **no public affiliate program**.
2. **The platforms that *do* pay (Eventim, Ticketmaster, Eventbrite) are the mainstream
   events** — exactly what this app is *least* about.
3. **It's a volume game.** Commission is a few % of a ~€15–25 ticket, at ~2–5% conversion.
   At realistic early traffic that's **single-digit to low-tens of € / month** (see §6).

**So treat affiliate as "switch it on once, take whatever trickles in" — never plan around it.**
The real money for a niche curator is **Premium (#22) + promoted placement (#21) + a handful
of direct venue/promoter partnerships** (§14–§16), with the experiences layer as an easy
complementary side-stream (§15).

**Why we still log the outbound `domain` (interactions table):** the data is valuable even
if affiliate is weak — it (a) *proves whether affiliate is even worth the paperwork* ("do
people actually click Eventim/Eventbrite, or overwhelmingly RA?" — measure before you
monetize), and (b) becomes the **evidence for direct-partnership pitches** ("we sent your
venue N clicks last month"). It earns its place regardless of whether a single affiliate
link is ever turned on.

---

## Table of contents

0. [Bottom line up front — is affiliate a realistic gate?](#0-bottom-line-up-front--is-affiliate-a-realistic-monetization-gate)
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
17. [Launch readiness — what's left to go live](#17-launch-readiness--whats-left-to-actually-go-live)
18. [Full distribution channel catalog (Berlin-specific)](#18-full-distribution-channel-catalog-berlin-specific)
19. [How distribution actually works in practice (plain mechanics)](#19-how-distribution-actually-works-in-practice-plain-mechanics)

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

> **Clarification — publishing ≠ scraping.** This is about **posting *to* our own
> Instagram account** as marketing (output), *not* scraping events *from* Instagram
> (input, which is login-gated and we don't do). We currently have **no Instagram
> presence of either kind** — both a marketing account and the auto-post generator
> below still need to be created. The "this weekend" engine just turns rows from our
> own database into a ready-to-post image + caption; no scraping involved.

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

> **Prerequisite — partnerships need leverage, and leverage = traffic + click data.**
> Partnerships are the *destination*; distribution is the *road*. Approaching a venue
> with "0 clicks last month" has no pitch. So the realistic order is:
> **(1) get the app live & marketed** (distribution + GEO — see §8/§9 and §17) →
> **(2) let the `interactions` table accumulate clicks-per-venue for a few weeks** (now
> unblocked — the table exists) → **(3) then** approach the top 3–5 venues with real
> numbers. The migration is done; the missing piece is step 1 (traffic).
>
> **Be monetization-ready in parallel:** of the three mechanisms below, build the
> **promo code** path first — it's the smallest change and the *only* one that works on
> Telegram / `event_url = null` events, so onboarding a partner later is instant.

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

---

## 17. Launch readiness — what's left to actually go live

The product is **built and auto-deploys to Vercel**, so it's technically reachable. But
it is **not launch-ready to market**. The gaps below (audited Jul 2026) are the real
bottleneck between "deployed" and "driving traffic." Nothing here is monetization — it's
the scaffolding that everything in §8–§16 depends on.

### A. Legal / compliance — **blocker, do first** (Germany)
Do **not** promote the app before these exist; they're legally required for a
German-facing site and also required for affiliate networks (Awin/Eventim) later.
- [ ] **Impressum** page (legally mandated identification).
- [ ] **Privacy policy / Datenschutzerklärung** — now required because Tier 2a collects
      anonymous engagement signals server-side (must describe the `interactions` data,
      the anonymous id, and that there's no PII). A short in-app note already exists in
      `HowItWorks.tsx`, but a full policy page is still missing.
- [ ] **Cookie / consent** handling (GDPR) — even minimal, since we set `localStorage`
      ids and log interactions.
- [ ] **Legal links in the footer** (`layout.tsx` footer currently has none).

### B. Discoverability / GEO — cheap, high-leverage (see §9)
- [ ] **`robots.txt`** in `frontend/public/` explicitly allowing AI crawlers
      (`OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, `ClaudeBot`, `Googlebot`).
- [ ] **Event JSON-LD** structured data on event/venue pages (we already hold structured
      event data — this is what gets us cited by ChatGPT/Perplexity/Google).
- [ ] Richer **`<meta>` / OpenGraph** tags for link previews (`layout.tsx` metadata is
      currently just a title + description).

### C. Distribution channel — the actual traffic engine (see §8)
- [ ] Create the **`@berlinculture` Instagram account** (and/or Telegram/WhatsApp channel).
- [ ] Build the **"this weekend in Berlin" post generator** — turns DB rows into a
      ready-to-post image + caption (auto-content from our own data; no scraping).
- [ ] Establish a **posting cadence** (e.g. Thursday "this weekend" reel + daily
      "just added" stories).

### D. Nice-to-have
- [ ] Custom domain.
- [ ] Basic analytics (privacy-friendly, e.g. Plausible) to watch traffic vs. the
      internal `interactions` signals.

### Suggested order
**A (compliance) → B (GEO, ~1–2 hrs, free) → C (distribution) →** *then* accumulate
click data → *then* §16 partnerships. A is a gate; B is the cheapest win; C is what
actually creates the audience that makes monetization (and partnership pitches) possible.

### Plain-language: what the manual tasks mean (and what needs *you*)
The GEO pieces and the *scaffolding* of the legal pages are already built in code. Three
things can't be automated because they need real-world info or a judgement call:

**1. Fill the placeholders in `/impressum` and `/privacy`.**
The two pages (`frontend/src/app/impressum/page.tsx`, `frontend/src/app/privacy/page.tsx`)
contain blanks in square brackets — e.g. `[Full name]`, `[Street and number]`,
`[your@email.tld]`, `[date]`. Replace each with your real details.
- *Why:* §5 DDG legally requires a public site to show a real **Impressum** (a name +
  reachable contact); the privacy policy needs a real "controller" + contact.
- *Caveat:* the Impressum must carry a real **postal address**. If you don't want your home
  address public, use a business/service address, or check whether a lighter rule applies to
  a purely private, non-commercial project. Worth a quick check with someone who knows German
  web law before you actively market. (This doc is not legal advice.)

**2. Decide on cookie/consent (see §17-A).**
The app stores functional data in the browser (favourites, an anonymous id) and logs
**anonymous analytics** (the `interactions` clicks). In the EU/Germany, functional storage
is fine without asking; *analytics* is safer if you **ask permission first** via a small
**consent banner**. Today there is **no banner**, and the privacy policy uses a
**legitimate-interest** basis ("we don't have to ask because it's anonymous/non-invasive").
Pick one:
- **(a) Keep as-is** — no banner, legitimate interest. Simpler, slightly more risk.
- **(b) Add a lightweight consent banner** — "Allow anonymous analytics? Yes/No"; only log
  interactions on Yes. Safer; a small dedicated build. **← ✅ implemented** (opt-in banner in
  `components/ConsentBanner.tsx`; `lib/consent.ts` gates the server sync in `interactions.ts`;
  on-device personalization is unaffected; privacy policy updated to a consent basis).

**3. Two share/trust follow-ups.**
- **Branded OG image:** when the link is pasted into WhatsApp/IG/Reddit, platforms show a
  preview card with a picture. A 1200×630 branded image fixes this. **← ✅ implemented**
  (auto-generated in `app/opengraph-image.tsx`, reused for Twitter via `app/twitter-image.tsx`;
  no design asset needed).
- **Custom domain:** the app currently lives at `berlin-culture-app.vercel.app`, which reads
  as "demo." A real domain (e.g. `berlinculture.app`, ~€10–30/yr) pointed at Vercel improves
  trust + press. This is a purchase + a Vercel settings step (owner action).

---

## 18. Full distribution channel catalog (Berlin-specific)

§8 introduced the big channels; this is the **complete menu** — every realistic medium,
platform, institution and offline surface, and **how** to use each for *this* app. Grouped
by type, with cost/effort/fit. **Fit** = how well it reaches our core (locals + the
indie/queer/neurodivergent scene + expats). Do **not** over-extend — pick **2–3 owned
channels + 1 community + a rolling offline/PR effort** and do them consistently.

> ⚠️ **Compliance gate:** paid ads, German institutional partners, and most listing sites
> will require a live **Impressum + privacy policy** (§17-A). Free organic posting can start
> earlier, but do the legal pages before anything official or paid.

### 18.1 Owned social / content platforms (post *from* our own data)
| Channel | How to use it | Cost | Effort | Fit |
|---|---|---|---|---|
| **Instagram** | "This weekend" Reels (Thu), community carousels ("7 queer parties this week"), daily "just added" Stories, link-in-bio → app. Auto-generate from DB. | Free | Med | ⭐⭐⭐⭐⭐ |
| **TikTok** | Reuse the same vertical Reels; best Gen-Z event discovery; trend audio + fast cuts. | Free | Low (reuse) | ⭐⭐⭐⭐ |
| **YouTube Shorts** | Same vertical clips again; also long-tail SEO (searchable "things to do in Berlin"). | Free | Low (reuse) | ⭐⭐⭐ |
| **Facebook Page + Events** | Cross-post from IG (Meta Business Suite); create FB Events (older/expat crowd still RSVPs here). | Free | Low | ⭐⭐⭐ |
| **Threads / Bluesky / X** | Short daily "tonight in Berlin" text posts + link. Bluesky has an active Berlin/arts crowd. | Free | Low | ⭐⭐ |
| **Pinterest** | Boards like "Berlin queer nightlife", "free things in Berlin" — evergreen, strong Google image SEO. | Free | Low | ⭐⭐ |

### 18.2 Owned audiences (algorithm-proof — capture these early)
| Channel | How to use it | Cost | Effort | Fit |
|---|---|---|---|---|
| **Email newsletter** | Weekly "Berlin this week" digest auto-built from the feed. Most durable channel; the **Premium (#22) funnel**. Capture emails from day one. | Free–low | Med | ⭐⭐⭐⭐⭐ |
| **Telegram channel** | We *scrape* Telegram — also **publish** a "Berlin Tonight" channel. Native to the scene; instant. | Free | Low | ⭐⭐⭐⭐ |
| **WhatsApp Channel** | Broadcast nightly picks; huge in Germany/EU; one-to-many, no spam. | Free | Low | ⭐⭐⭐ |
| **Discord community** | A server for regulars (queer/ND channels, "who's going tonight"). Builds retention + word of mouth. | Free | Med | ⭐⭐⭐ |

> **Owned > rented.** Algorithms change overnight; email + Telegram/WhatsApp are yours
> forever. Every other channel should funnel into these.

### 18.3 Community platforms (participate, don't spam)
| Channel | How to use it | Cost | Fit |
|---|---|---|---|
| **Reddit** — r/berlin, r/askberlin, r/berlinsocialclub, r/germany | Genuinely answer "what's on this weekend?" threads; a weekly picks post if mods allow. Also **~47% of Perplexity citations are Reddit** → feeds GEO (§9). | Free | ⭐⭐⭐⭐ |
| **Facebook Groups** | Expat, queer, neurodivergent, student, newcomer groups — real participation. A goldmine in Berlin. | Free | ⭐⭐⭐⭐ |
| **Meetup** | Host/announce our own "Berlin culture" meetups; cross-post community events. | Free–low | ⭐⭐⭐ |
| **nebenan.de** | German hyperlocal neighbourhood network — post neighbourhood events. | Free | ⭐⭐ |
| **Toytown Germany** | Long-running Berlin expat forum — event listings + presence. | Free | ⭐⭐ |

### 18.4 Search & AI discovery (pull, not push)
| Channel | How to use it | Cost | Fit |
|---|---|---|---|
| **SEO (Google)** | Rank for "things to do in Berlin this weekend", "queer events Berlin". Needs fast, structured, fresh pages — we have freshness. | Free | ⭐⭐⭐⭐ |
| **GEO (ChatGPT/Perplexity/Google AI)** | robots.txt allow + Event JSON-LD (§9/§17-B) → get *cited* when people ask AI what's on. Cheapest innovative lever. | Free | ⭐⭐⭐⭐⭐ |
| **App-store ASO** | Only if we ship a PWA/native wrapper later; rank for Berlin event searches. | Low | ⭐⭐ |

### 18.5 Berlin listing sites & media (get featured → traffic + backlinks + GEO)
Pitch these for a write-up or "app of the month"; each backlink also boosts SEO/GEO.
- **iHeartBerlin**, **tip Berlin**, **Mit Vergnügen Berlin**, **Ask Helmut** (event discovery), **Exberliner** (English-language, expat), **The Berliner / Berlin Loves You**, **SIEGESSÄULE** (the queer city magazine — *core-audience bullseye*), **Berlin.de / visitBerlin** editorial.
- **How:** a short press kit (what the app is, screenshots, founder note, the "curated underground/queer" angle) + a personal email to an editor. Free; pure pitching.

### 18.6 Institutions & organisations (Berlin-specific, high-trust reach)
These lend credibility and reach whole communities at once. Approach with the same
data-backed, on-brand pitch as venue partnerships (§16).
- **Clubcommission Berlin** — the nightlife/club association; newsletter + network of venues. Highly aligned.
- **Musicboard Berlin / Initiative Musik** — music funding bodies; community channels.
- **Universities & student bodies** — TU, HU, FU, UdK, Bard, CODE, ESMT: **AStA** (student unions), **International Offices**, **ESN / Erasmus** networks, physical notice boards, student newsletters. Students = high-intent event audience.
- **Language schools & expat services** — newcomers hunting for what to do; flyers + partnerships.
- **Queer & community orgs** — Schwules Museum, queer centres, FLINTA collectives, neurodivergent groups — reach our exact niche lanes.
- **Tourism layer** — hostels/hotels (lobby QR, concierge cards), visitBerlin partner listings — pairs naturally with the experiences layer (§15).
- **How:** short intro email + one-pager; offer them value (a curated feed/widget for *their* audience) before asking for reach.

### 18.7 Offline / guerrilla (Berlin rewards physical presence)
| Surface | How | Cost |
|---|---|---|
| **Stickers & flyers** | QR-code stickers in Spätis, cafés, venue toilets, U-Bahn, Kreuzberg/Neukölln lamp posts. Cheap, on-brand, very Berlin. | Low |
| **Posters** | A5/A3 at partner venues, coworking spaces, unis. | Low–med |
| **QR at events** | A small card/sticker at partner venues' door: "scan for what's on next". Turns venue traffic into app users. | Low |
| **Merch / tote bags** | Berlin loves a good tote; walking advertising. | Med |

### 18.8 Creators, press & cross-promotion
- **Micro-influencers** — Berlin nightlife/queer/expat creators; pay in *access* (guestlist, first-to-know) not cash at first.
- **Podcasts / local YouTubers** — "Berlin life" / expat channels; offer to be the "what's on" segment.
- **Newsletter swaps** — cross-promote with other Berlin newsletters (non-competing).
- **Widget embed / B2B** — let venues embed our "upcoming here" widget on *their* site (their content, our branding + link) — reach + backlinks + partnership seed.

### 18.9 Paid amplification (only after retention is proven — see §11)
| Channel | Use | Notes |
|---|---|---|
| **Meta Ads (IG/FB)** | Reels/Stories via Advantage+; geo-target Berlin + interests; retargeting + lookalikes. | Start €5–10/day; **requires Impressum**. |
| **TikTok Ads** | Spark Ads boosting organic winners. | Low entry. |
| **Reddit Ads** | Target r/berlin + interests. | Cheap, niche. |
| **Google Ads** | Only for high-intent search terms; usually SEO/GEO is better value. | Watch CPC. |

### How to choose (don't do everything)
1. **Owned core (pick 2–3):** Instagram + Email + Telegram — start here, post consistently.
2. **One community channel:** Reddit *or* Facebook Groups — wherever your niche already hangs out.
3. **Always-on & free:** GEO (§9) + rolling PR pitches to §18.5 (esp. **SIEGESSÄULE** for the queer core) + guerrilla stickers.
4. **Institutions:** approach 1–2 aligned ones (Clubcommission, a uni AStA) once you have something to show.
5. **Paid:** last, small, only after organic retention exists.

> The pattern: **many free channels feed the owned ones (email/Telegram); the owned
> audience → traffic → click data → partnerships (§16) & Premium (§22).** Distribution and
> monetization are the same flywheel.

---

## 19. How distribution actually works in practice (plain mechanics)

> **Q: "Do I just advertise the URL (`berlin-culture-app.vercel.app`) on these platforms?"**
> Not exactly. You **don't post the link** — you **post value (content made from the app's
> data), and the link is the doorway to more of it.** Naked links get ignored/flagged as
> spam; useful content ("5 queer parties in Berlin this weekend") gets shared, and *then*
> the link converts. This is **content marketing**, and it's near-free for us because the
> app *generates* the content (event lists) automatically.

### The funnel — the same loop every consumer app runs
**Awareness** (someone sees our content on IG / Reddit / Google) → **Click** (taps our
link) → **Land** (arrives at the app) → **Retain** (we capture them — "Subscribe to
calendar" / newsletter — so they return without another ad) → **Refer** (they share an
event → back to Awareness).

> Top of funnel = cheap/free content. Bottom = **owned audience (email/Telegram)** so we
> stop depending on any algorithm. The URL is just the *destination*; every channel drives
> to it.

### Worked example — Instagram, end to end
1. Create the account **`@berlinculture`**.
2. Every Thursday, post a ~20s **Reel**: a screen-recording/graphic of this weekend's 5
   events (auto-built from the DB). Caption: *"5 queer parties in Berlin this weekend 🏳️‍🌈
   full list + one-tap add-to-calendar → link in bio."*
3. Viewer sees it in the Berlin hashtag/For-You → taps profile → taps **bio link** → lands
   on the app → uses it → we prompt **"Subscribe to all events"** (already built) → now we
   own them.

Same motion everywhere, only the format changes: **Reddit** = a genuinely helpful comment;
**newsletter** = the weekly email; **Späti sticker** = a QR code — all pointing at the same URL.

### Norms & facts to know
- **Link-in-bio.** Instagram/TikTok captions can't have clickable links; the standard is a
  single clickable link on the profile (+ Stories "link stickers"). So the bio link = the app.
- **UTM parameters** — how traffic is *always* attributed. Append
  `?utm_source=instagram&utm_campaign=weekend` to the link so analytics show which channel
  actually delivers visitors. Do this per channel from day one.
- **Open Graph (OG) tags** — when the URL is pasted into WhatsApp/IG/Reddit it should render
  a preview card (image + title). **Currently missing** (`layout.tsx` has only title +
  description) → shared links look bare. Fix as part of §17-B.
- **Custom domain** — a `*.vercel.app` subdomain reads as "demo/unfinished" and hurts trust
  + press pitches. A real domain (e.g. `berlinculture.app`) is a small cost with a real
  credibility payoff. (§17-D)

### What you *literally do*, per channel (cheat-sheet)
| Channel | The concrete action | The link's role |
|---|---|---|
| **Instagram/TikTok** | Post Reel/carousel of events; update **bio link** | Bio link → app (+ UTM) |
| **Reddit / FB Groups** | Answer "what's on?" helpfully; link where relevant | Inline link in a useful comment |
| **Newsletter** | Weekly digest email built from the feed | Every event links back to app |
| **Telegram/WhatsApp** | Broadcast nightly picks | Link per post |
| **Press/listing sites** | Send a press kit; they write about us | Backlink in the article (SEO/GEO too) |
| **Stickers/posters/QR** | Physical placement in the city | QR → app URL (+ UTM) |
| **Venue widget embed** | Venue shows our "upcoming here" widget | Widget links back to app |

### Prerequisites that make sharing actually work (do these first)
1. **OG/preview meta tags** so pasted links look good (§17-B).
2. **UTM discipline** so you learn which channels work.
3. **A capture point on the app** (newsletter signup / calendar subscribe — partly built) so
   traffic converts into an **owned** audience instead of leaking away.
4. **(Recommended) a custom domain** for trust.

### Per-channel step-by-step playbooks
Concrete "what to actually do" for each channel — the same shape as the Instagram
example above. **Setup** = one-time; **Weekly** = the recurring motion. Always append a
UTM (`?utm_source=<channel>`) to the link so you can see what works.

**Instagram** — *see the full worked example above.* In short: create `@berlinculture`,
put the app link in bio, post a Thursday "this weekend" Reel + community carousels + daily
"just added" Stories, funnel taps from the bio link to the app.

**TikTok**
1. Setup: create the account; put the app link in bio (available once you hit the follower
   threshold, otherwise link in every caption/pinned comment).
2. Weekly: re-upload the *same* vertical Reels you made for Instagram (don't reinvent).
3. Use 3–5 Berlin hashtags + a trending sound; hook in the first 1.5 seconds.
4. Reply to comments asking "where?" with the app link.

**YouTube Shorts**
1. Setup: create a channel; add the app link to the channel banner + descriptions.
2. Weekly: upload the same vertical clips; write a keyword title ("Things to do in Berlin
   this weekend") — Shorts are searchable, so they keep working long after posting.

**Facebook (Page + Events)**
1. Setup: create a Page; link it to Instagram via **Meta Business Suite** so posts
   cross-publish automatically.
2. Weekly: let IG posts mirror to FB; additionally create a **Facebook Event** for 1–2
   flagship happenings (older/expat crowd RSVPs here) with the app link in the description.

**Email newsletter** (highest-value owned channel)
1. Setup: pick a free-tier tool (Buttondown, MailerLite, Substack); add a **signup box on
   the app** (a small "get the weekly Berlin digest" field).
2. Weekly: send one "Berlin this week" email built from the feed — 8–12 events, each linking
   back to the app. Keep a consistent day/time.
3. Every email should invite a reply and a forward (referral).

**Telegram channel**
1. Setup: create a public channel ("Berlin Tonight"); pin a short "what this is" + app link.
2. Daily/weekly: post 3–5 picks with the event link; you can partly automate this from the
   same data the app uses.

**WhatsApp Channel**
1. Setup: create a Channel from a WhatsApp Business profile; share the join link on IG/site.
2. Weekly: broadcast nightly/weekly picks (short, 1–3 events + link). One-to-many, no replies
   to manage.

**Reddit** (participation, not promotion)
1. Setup: make an account; spend a week genuinely commenting so you're not a brand-new
   account dropping links (that gets removed).
2. Weekly: find "what's on this weekend?" threads in r/berlin, r/askberlin,
   r/berlinsocialclub and **answer helpfully**, linking the app only where it truly helps.
3. If mods allow, post a weekly curated list. Bonus: Reddit answers get cited by AI engines
   (feeds §9 GEO).

**Facebook Groups**
1. Setup: join relevant groups (expat, queer, neurodivergent, student, newcomer).
2. Weekly: participate for real; share event picks where the group welcomes it. Read each
   group's rules first — value first, link second.

**Meetup**
1. Setup: create an organiser profile.
2. Recurring: list/host a small "Berlin culture" meetup; cross-reference community events.
   Put the app link in every event description.

**SEO (Google)**
1. Setup: submit the sitemap in **Google Search Console** (verify the domain once).
2. Ongoing: keep pages fast + structured (JSON-LD already added). Consider a few evergreen
   landing pages ("queer events in Berlin", "free things to do in Berlin") that rank and
   funnel to the live feed.

**GEO (ChatGPT / Perplexity / Google AI)**
1. Setup: robots.txt allowing AI crawlers + Event JSON-LD (both done in §17-B).
2. Ongoing: build a Reddit footprint (see above); periodically **test** by asking
   ChatGPT/Perplexity "what's on in Berlin this weekend?" and check whether you're named.

**Berlin listing sites & press** (get featured)
1. Setup: make a one-page **press kit** — what the app is, 3–4 screenshots, the
   curated-underground/queer angle, your contact.
2. Outreach: email individual editors at iHeartBerlin, tip Berlin, Mit Vergnügen, Exberliner
   and especially **SIEGESSÄULE** (queer core). Personal, short, "thought this fits your
   readers." Each write-up = traffic + a backlink (helps SEO/GEO).

**Institutions & universities**
1. Setup: shortlist 2–3 aligned bodies (Clubcommission Berlin, a uni **AStA**, a queer/ND
   org). Prepare a one-paragraph intro + the app link.
2. Outreach: offer *them* value first — "a curated feed/widget for your students/members" —
   then ask for a newsletter mention or a notice-board flyer. Follow up once.

**Offline / stickers & QR**
1. Setup: design one A6 sticker/flyer with a bold line ("What's on in Berlin tonight →") and
   a **QR code** pointing at the app (with `?utm_source=sticker`). Order cheaply online.
2. Recurring: place them where allowed — partner venues, cafés, Spätis, coworking, uni
   boards. Refresh monthly.

**Micro-influencers / creators**
1. Setup: list 5–10 Berlin nightlife/queer/expat creators.
2. Outreach: offer **access, not cash** first (early "just added" tips, guestlist help). Ask
   for an honest mention/story. Track who drives visits via a unique UTM link per creator.

**Venue widget embed (B2B cross-promo)**
1. Setup: offer a partner venue a small embeddable "upcoming here" widget (their events, your
   branding + link).
2. Result: reach on their site + a backlink + a natural lead-in to a §16 partnership.

**Paid ads** (only after organic retention exists — needs Impressum live)
1. Setup: Meta Ads Manager; install basic tracking; ensure the Impressum + privacy pages are
   live (required).
2. Test: **€5–10/day** boosting your best-performing organic Reel; geo-target Berlin +
   interests; kill losers fast, scale winners; retarget site visitors + build lookalikes.
