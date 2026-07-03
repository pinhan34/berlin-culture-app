/**
 * Affiliate link-transform layer (Monetization #20, Phase 1). At click time we rewrite
 * outbound ticket URLs into affiliate tracking links **for supported platforms only**
 * (Eventbrite, Eventim, GetYourGuide, Tiqets via Awin; Ticketmaster via Impact) and
 * pass **everything else through unchanged** (RA, DICE, Telegram, null, unknown).
 *
 * IDs come from NEXT_PUBLIC_* env vars, so with none configured every function is a
 * **no-op** — safe to ship before joining any network. The calendar/ICS feed must keep
 * using the ORIGINAL url (never call this there), so affiliate links never end up in
 * users' calendars. See docs/MONETIZATION.md §4.
 */

const AWIN_AFFID = process.env.NEXT_PUBLIC_AWIN_AFFID;
const EVENTBRITE_AFF = process.env.NEXT_PUBLIC_AFF_EVENTBRITE;
// An Impact tracking-link template containing "{url}" (and optionally "{clickref}"),
// e.g. "https://ticketmaster.evyy.net/c/AFFID/CAMPAIGN/URL?u={url}&subId1={clickref}".
const IMPACT_TM_TEMPLATE = process.env.NEXT_PUBLIC_IMPACT_TM_TEMPLATE;

// Awin merchant ids (default to the German programs; override via env if yours differ).
const AWIN_MID_EVENTIM = process.env.NEXT_PUBLIC_AWIN_MID_EVENTIM ?? '11388';
const AWIN_MID_GETYOURGUIDE = process.env.NEXT_PUBLIC_AWIN_MID_GETYOURGUIDE ?? '18925';
const AWIN_MID_TIQETS = process.env.NEXT_PUBLIC_AWIN_MID_TIQETS; // no reliable default

/** True if at least one affiliate program is configured (used to gate the disclosure). */
export function hasAffiliateConfig(): boolean {
  return Boolean(EVENTBRITE_AFF || AWIN_AFFID || IMPACT_TM_TEMPLATE);
}

function awinDeepLink(mid: string, originalUrl: string, clickref?: string): string {
  const params = new URLSearchParams({ awinmid: mid, awinaffid: AWIN_AFFID! });
  if (clickref) params.set('clickref', clickref);
  params.set('ued', originalUrl); // Awin's "url encoded destination"
  return `https://www.awin1.com/cread.php?${params.toString()}`;
}

/**
 * Returns an affiliate-tracking version of `original` for supported platforms, or the
 * original URL unchanged otherwise. `clickref` (e.g. the event id) is passed through as
 * a sub-id so networks can report which events convert.
 */
export function affiliateUrl(
  original: string | null | undefined,
  opts: { clickref?: string | number } = {},
): string {
  if (!original) return original ?? '';

  let host: string;
  try {
    host = new URL(original).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return original; // unparseable — leave as-is
  }

  const clickref = opts.clickref != null ? String(opts.clickref) : undefined;

  // Eventbrite — append the affiliate ref param.
  if (host.includes('eventbrite.') && EVENTBRITE_AFF) {
    try {
      const u = new URL(original);
      u.searchParams.set('aff', EVENTBRITE_AFF);
      return u.toString();
    } catch {
      return original;
    }
  }

  // Awin merchants (Eventim / GetYourGuide / Tiqets).
  if (AWIN_AFFID) {
    if (host.endsWith('eventim.de')) return awinDeepLink(AWIN_MID_EVENTIM, original, clickref);
    if (host.includes('getyourguide')) return awinDeepLink(AWIN_MID_GETYOURGUIDE, original, clickref);
    if (host.includes('tiqets') && AWIN_MID_TIQETS) {
      return awinDeepLink(AWIN_MID_TIQETS, original, clickref);
    }
  }

  // Ticketmaster via an Impact template.
  if (host.includes('ticketmaster') && IMPACT_TM_TEMPLATE) {
    return IMPACT_TM_TEMPLATE.replace('{url}', encodeURIComponent(original)).replace(
      '{clickref}',
      clickref ?? '',
    );
  }

  return original; // pass-through: RA, DICE, Telegram, unknown, or unconfigured
}
