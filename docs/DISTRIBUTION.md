# Distribution & Marketing — Berlin Culture App

> **Part of a 3-doc strategy set** (split from the original combined report):
>
> | Doc | Covers | Sections |
> | --- | --- | --- |
> | [MONETIZATION.md](./MONETIZATION.md) | earning models, affiliate reality, partnerships | §0–§7, §10–§16 |
> | **DISTRIBUTION.md** (this) | marketing, channels, AI/GEO, mechanics | §8–§9, §18–§19 |
> | [LAUNCH_AND_LEGAL.md](./LAUNCH_AND_LEGAL.md) | launch readiness, legal & business | §17, §20 |
>
> Section numbers are **inherited** from the original report, so a cross-reference like
> "§16" or "§17" may live in a sibling doc (use the map above).

## Contents (this doc)
8. [Marketing & distribution](#8-marketing--distribution)
9. [AI agents & ChatGPT](#9-ai-agents--chatgpt)
18. [Full distribution channel catalog (Berlin-specific)](#18-full-distribution-channel-catalog-berlin-specific)
19. [How distribution actually works in practice (plain mechanics)](#19-how-distribution-actually-works-in-practice-plain-mechanics)

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
- **Allow AI crawlers** in `robots.txt`: `OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, `ClaudeBot`, `Googlebot`. ✅ Done (see LAUNCH_AND_LEGAL §17-B).
- **Structure for extraction:** question-style headings + 40–60 word answer blocks; add **FAQ / Event JSON-LD schema** (✅ Event JSON-LD live on the homepage).
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

## 18. Full distribution channel catalog (Berlin-specific)

§8 introduced the big channels; this is the **complete menu** — every realistic medium,
platform, institution and offline surface, and **how** to use each for *this* app. Grouped
by type, with cost/effort/fit. **Fit** = how well it reaches our core (locals + the
indie/queer/neurodivergent scene + expats). Do **not** over-extend — pick **2–3 owned
channels + 1 community + a rolling offline/PR effort** and do them consistently.

> ⚠️ **Compliance gate:** paid ads, German institutional partners, and most listing sites
> will require a live **Impressum + privacy policy** (LAUNCH_AND_LEGAL §17-A). Free organic
> posting can start earlier, but do the legal pages before anything official or paid.

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
| **GEO (ChatGPT/Perplexity/Google AI)** | robots.txt allow + Event JSON-LD (§9 / LAUNCH_AND_LEGAL §17-B) → get *cited* when people ask AI what's on. Cheapest innovative lever. | Free | ⭐⭐⭐⭐⭐ |
| **App-store ASO** | Only if we ship a PWA/native wrapper later; rank for Berlin event searches. | Low | ⭐⭐ |

### 18.5 Berlin listing sites & media (get featured → traffic + backlinks + GEO)
Pitch these for a write-up or "app of the month"; each backlink also boosts SEO/GEO.
- **iHeartBerlin**, **tip Berlin**, **Mit Vergnügen Berlin**, **Ask Helmut** (event discovery), **Exberliner** (English-language, expat), **The Berliner / Berlin Loves You**, **SIEGESSÄULE** (the queer city magazine — *core-audience bullseye*), **Berlin.de / visitBerlin** editorial.
- **How:** a short press kit (what the app is, screenshots, founder note, the "curated underground/queer" angle) + a personal email to an editor. Free; pure pitching.

### 18.6 Institutions & organisations (Berlin-specific, high-trust reach)
These lend credibility and reach whole communities at once. Approach with the same
data-backed, on-brand pitch as venue partnerships (MONETIZATION §16).
- **Clubcommission Berlin** — the nightlife/club association; newsletter + network of venues. Highly aligned.
- **Musicboard Berlin / Initiative Musik** — music funding bodies; community channels.
- **Universities & student bodies** — TU, HU, FU, UdK, Bard, CODE, ESMT: **AStA** (student unions), **International Offices**, **ESN / Erasmus** networks, physical notice boards, student newsletters. Students = high-intent event audience.
- **Language schools & expat services** — newcomers hunting for what to do; flyers + partnerships.
- **Queer & community orgs** — Schwules Museum, queer centres, FLINTA collectives, neurodivergent groups — reach our exact niche lanes.
- **Tourism layer** — hostels/hotels (lobby QR, concierge cards), visitBerlin partner listings — pairs naturally with the experiences layer (MONETIZATION §15).
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

### 18.9 Paid amplification (only after retention is proven — see MONETIZATION §11)
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
> audience → traffic → click data → partnerships (MONETIZATION §16) & Premium (#22).**
> Distribution and monetization are the same flywheel.

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
  a preview card (image + title). ✅ Now implemented (auto-generated share card; see
  LAUNCH_AND_LEGAL §17).
- **Custom domain** — a `*.vercel.app` subdomain reads as "demo/unfinished" and hurts trust
  + press pitches. A real domain (e.g. `berlinculture.app`) is a small cost with a real
  credibility payoff. (LAUNCH_AND_LEGAL §17-D)

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
1. **OG/preview meta tags** so pasted links look good (✅ done; LAUNCH_AND_LEGAL §17-B).
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
1. Setup: robots.txt allowing AI crawlers + Event JSON-LD (both done — LAUNCH_AND_LEGAL §17-B).
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
2. Result: reach on their site + a backlink + a natural lead-in to a MONETIZATION §16 partnership.

**Paid ads** (only after organic retention exists — needs Impressum live)
1. Setup: Meta Ads Manager; install basic tracking; ensure the Impressum + privacy pages are
   live (required).
2. Test: **€5–10/day** boosting your best-performing organic Reel; geo-target Berlin +
   interests; kill losers fast, scale winners; retarget site visitors + build lookalikes.
