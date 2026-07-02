# Launch Readiness & Legal — Berlin Culture App

> **Part of a 3-doc strategy set** (split from the original combined report):
>
> | Doc | Covers | Sections |
> | --- | --- | --- |
> | [MONETIZATION.md](./MONETIZATION.md) | earning models, affiliate reality, partnerships | §0–§7, §10–§16 |
> | [DISTRIBUTION.md](./DISTRIBUTION.md) | marketing, channels, AI/GEO, mechanics | §8–§9, §18–§19 |
> | **LAUNCH_AND_LEGAL.md** (this) | launch readiness, legal & business | §17, §20 |
>
> Section numbers are **inherited** from the original report, so a cross-reference like
> "§8" or "§16" may live in a sibling doc (use the map above).
> ⚠️ §20 is **general orientation, not legal/tax advice.**

## Contents (this doc)
17. [Launch readiness — what's left to go live](#17-launch-readiness--whats-left-to-actually-go-live)
20. [Legal & business setup (Germany)](#20-legal--business-setup-germany)

---

## 17. Launch readiness — what's left to actually go live

The product is **built and auto-deploys to Vercel**, so it's technically reachable. The
scaffolding below closes the gap between "deployed" and "driving traffic." Nothing here is
monetization — it's what everything in DISTRIBUTION (§8–§9, §18–§19) and MONETIZATION
(§10–§16) depends on.

**Legend:** ✅ done in code · ✍️ needs your input · ⬜ not started

### A. Legal / compliance — **blocker, do first** (Germany)
Do **not** promote the app before these are *complete* (scaffolds exist; real details still needed).
- ✅ **Impressum** page (`/impressum`) — built. ✍️ fill the `[placeholders]` with real details.
- ✅ **Privacy policy / Datenschutz** (`/privacy`) — built; describes the `interactions` data,
  the anonymous id, no PII, processors. ✍️ fill controller details + date.
- ✅ **Cookie / consent** — opt-in banner (`components/ConsentBanner.tsx`) gates the anonymous
  analytics; on-device personalization is unaffected.
- ✅ **Legal links in the footer** (`layout.tsx`).

### B. Discoverability / GEO — cheap, high-leverage (see DISTRIBUTION §9)
- ✅ **`robots.txt`** (`app/robots.ts`) explicitly allowing AI crawlers (OAI-SearchBot,
  ChatGPT-User, PerplexityBot, ClaudeBot, Googlebot, …) + `sitemap.xml` (`app/sitemap.ts`).
- ✅ **Event JSON-LD** structured data on the homepage (schema.org `ItemList` of events).
- ✅ **Richer `<meta>` / OpenGraph + Twitter** tags (`layout.tsx`) + an **auto-generated
  branded share image** (`app/opengraph-image.tsx`, reused via `app/twitter-image.tsx`).

### C. Distribution channel — the actual traffic engine (see DISTRIBUTION §8/§18/§19)
- ⬜ Create the **`@berlinculture` Instagram account** (and/or Telegram/WhatsApp channel).
- ⬜ Build the **"this weekend in Berlin" post generator** — turns DB rows into a
  ready-to-post image + caption (auto-content from our own data; no scraping).
- ⬜ Establish a **posting cadence** (e.g. Thursday "this weekend" reel + daily
  "just added" stories).

### D. Nice-to-have
- ⬜ Custom domain (e.g. `berlinculture.app`) — pointed at Vercel; overridable via
  `NEXT_PUBLIC_SITE_URL`.
- ⬜ Basic privacy-friendly analytics (e.g. Plausible) to watch traffic vs. the internal
  `interactions` signals.

### Suggested order
**A (compliance) → B (GEO) → C (distribution) →** *then* accumulate click data → *then*
MONETIZATION §16 partnerships. A is a gate; B is the cheapest win (✅ mostly done); C is what
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

**2. Cookie/consent — done (opt-in).**
The app stores functional data in the browser (favourites, an anonymous id) and logs
**anonymous analytics** (the `interactions` clicks). We chose the safer route: a lightweight
**opt-in consent banner**. Analytics is sent to the server **only after the user clicks
"Allow"**; on-device personalization works regardless. Privacy policy states a consent basis
(Art. 6(1)(a) GDPR). *Implemented:* `lib/consent.ts` + `components/ConsentBanner.tsx`,
gating `syncInteraction` in `interactions.ts`.

**3. Two share/trust follow-ups.**
- **Branded OG image** — ✅ implemented (auto-generated in `app/opengraph-image.tsx`, reused
  for Twitter via `app/twitter-image.tsx`; no design asset needed). Pasted links now render a
  proper preview card.
- **Custom domain** — ⬜ the app currently lives at `berlin-culture-app.vercel.app`, which
  reads as "demo." A real domain (e.g. `berlinculture.app`, ~€10–30/yr) pointed at Vercel
  improves trust + press. This is a purchase + a Vercel settings step (owner action); set
  `NEXT_PUBLIC_SITE_URL` to it afterwards.

---

## 20. Legal & business setup (Germany)

> ⚠️ **General orientation, not legal or tax advice.** Rules change and specifics depend on
> your situation; verify with the professionals listed at the end before acting.

### Do I need to found a company?
**No.** Running a website — even a monetized one — does **not** require a GmbH or any
corporate entity. A company is about **limiting liability** and **scaling/investment**, not a
prerequisite to operate. You climb the ladder only as the stakes rise.

### The real line: hobby vs *Gewerbe* (trade)
Not "company yes/no" — this is what matters:
- **Now** — a free, personal project with no profit intent is typically a **private/hobby**
  project. (You still need an **Impressum + privacy policy** because it's a public online
  service — see §17.)
- **When you monetize** with intent to earn sustainably (affiliate, ads, paid placements,
  subscriptions), it becomes a **Gewerbe** → do a **Gewerbeanmeldung** at your local
  *Gewerbeamt*. **Cheap (~€15–65), quick.** This registers *you* as a sole trader — it is
  **not** founding a company.

### The ladder of legal forms (simplest → most serious)
| Form | What it is | When |
|---|---|---|
| **Kleingewerbe / Einzelunternehmen** | Sole trader; just the Gewerbeanmeldung; personal liability. **Kleinunternehmerregelung (§19 UStG)** skips VAT under ~€25k/yr turnover. | **Start here.** |
| **GbR** | Same, with a co-founder (partnership). | If ≥2 founders. |
| **UG (haftungsbeschränkt)** | "Mini-GmbH," from €1 capital, **limited liability**, notary + real accounting. | Real liability risk / meaningful revenue. |
| **GmbH** | €25k capital, full limited liability, most formal. | Scale / investment / employees. |

**When to jump to UG/GmbH:** real liability (venue contracts, more data, employees),
meaningful revenue, or taking investment. At zero/low revenue it's premature.

### "Corporate identity" — two meanings
- **Branding** (name, logo, domain, consistent look): good practice, no legal step; do it
  anytime. Optionally register a **trademark (Marke)** later to protect the name.
- **Legal entity** (the company): separate matter. You can have a strong brand as a sole trader.

### What you'll need soon (independent of legal form)
- **Impressum + privacy policy** — scaffolded (§17-A); fill placeholders.
- **Gewerbeanmeldung** — when you start monetizing.
- **Tax registration** — the Gewerbeanmeldung triggers the Finanzamt *Fragebogen zur
  steuerlichen Erfassung*; income is taxable. *Gewerbesteuer* only above ~€24,500 profit
  (sole trader).
- **GDPR** — applies regardless of legal form once personal data is processed (even IP logs).
  You're the **controller**: privacy policy, **data-processing agreements** with Vercel &
  Supabase, and possibly a short *record of processing*. A formal DPO is only required in
  narrow cases (not yet).

### Two situation-specific flags
- **Sensitive content.** The app centers queer & neurodivergent communities; GDPR treats
  sexual orientation/health as *special categories*. You're not profiling *identified*
  individuals (anonymous + opt-in now), which helps a lot — but it raises the value of the
  consent/privacy setup we just built.
- **You're employed.** A side business can trigger **Nebentätigkeit** (side-activity) clauses
  in your employment contract — check whether you must inform/seek approval. (Non-EU
  citizens: self-employment can also have residence-permit implications.)

### Where to get real help (cheap/free)
- **IHK (Industrie- und Handelskammer)** — free founder counseling; ideal for the "register?
  which form?" question.
- **Steuerberater** — tax/VAT/Kleinunternehmer setup once money starts.
- **Lawyer** — one-off review of Impressum + privacy + terms (worth it given sensitive content).
- **Gewerbeamt** (your Bezirksamt) — the actual registration.

### Practical sequence for where you are (pre-revenue)
1. Keep building; fill Impressum/privacy before actively marketing.
2. **When you flip on the first monetization** (or promote for profit), register a
   **Kleingewerbe** — small, reversible, low-cost.
3. Consider a **UG** only when revenue/liability makes limited liability worth the admin.
4. Have a **~20-min IHK chat** early to de-risk all of the above.
