/**
 * Share-content helpers — turn our own event data into ready-to-post social content
 * ("this weekend in Berlin"). Pure & client-safe: no DB, no next/og. Used by both the
 * image route (`/api/share`) and the owner tool (`/share`).
 *
 * All day boundaries and displayed times are computed in Europe/Berlin so the
 * generated post matches what a Berliner expects, regardless of server timezone.
 */

import type { Event } from './types';
import { getVenueDisplayName, isAggregatorVenue, parseTitleVenue } from './venueCategories';

export type ShareRangeKey = 'today' | 'tomorrow' | 'weekend' | 'week';

export const SHARE_RANGE_KEYS: ShareRangeKey[] = ['today', 'tomorrow', 'weekend', 'week'];

export interface ShareRange {
  key: ShareRangeKey;
  /** Lowercase, sentence-fragment form for captions, e.g. "this weekend". */
  label: string;
  /** Uppercase form for the image header, e.g. "THIS WEEKEND". */
  headline: string;
  start: Date;
  end: Date;
}

export interface ShareEvent {
  id: number;
  title: string;
  venue: string | null;
  when: string; // e.g. "Fri 23:00"
}

// ---------------------------------------------------------------------------
// Berlin timezone helpers
// ---------------------------------------------------------------------------

/** Offset of Europe/Berlin from UTC, in minutes, for a given instant. */
function berlinOffsetMinutes(date: Date): number {
  try {
    const label = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Berlin',
      timeZoneName: 'shortOffset',
    }).format(date);
    const m = label.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
    if (m) {
      const hours = Number(m[1]);
      const mins = Number(m[2] ?? '0');
      return hours * 60 + (hours < 0 ? -mins : mins);
    }
  } catch {
    // ignore
  }
  return 120; // default CEST
}

interface BerlinParts {
  year: number;
  month: number; // 1-12
  day: number;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

function berlinParts(date: Date): BerlinParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = fmt.formatToParts(date);
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    weekday: WEEKDAY_INDEX[get('weekday')] ?? 0,
  };
}

/** UTC instant of Berlin-local midnight for the given Berlin calendar date. */
function berlinMidnightUTC(year: number, month: number, day: number): Date {
  const guess = Date.UTC(year, month - 1, day, 0, 0, 0);
  const offset = berlinOffsetMinutes(new Date(guess));
  return new Date(guess - offset * 60_000);
}

/** Add whole days to a Berlin calendar date, returning the resulting midnight (UTC instant). */
function addBerlinDays(base: BerlinParts, days: number): Date {
  const guess = Date.UTC(base.year, base.month - 1, base.day + days, 0, 0, 0);
  const offset = berlinOffsetMinutes(new Date(guess));
  return new Date(guess - offset * 60_000);
}

// ---------------------------------------------------------------------------
// Ranges
// ---------------------------------------------------------------------------

export function isShareRangeKey(v: string | null | undefined): v is ShareRangeKey {
  return !!v && (SHARE_RANGE_KEYS as string[]).includes(v);
}

/** Build a Berlin-aware date range for the given key, relative to `now`. */
export function getShareRange(key: ShareRangeKey, now: Date = new Date()): ShareRange {
  const bp = berlinParts(now);
  const todayMidnight = berlinMidnightUTC(bp.year, bp.month, bp.day);
  const tomorrowMidnight = addBerlinDays(bp, 1);

  switch (key) {
    case 'today':
      return { key, label: 'today', headline: 'TONIGHT', start: now, end: tomorrowMidnight };

    case 'tomorrow':
      return {
        key,
        label: 'tomorrow',
        headline: 'TOMORROW',
        start: tomorrowMidnight,
        end: addBerlinDays(bp, 2),
      };

    case 'week':
      return {
        key,
        label: 'this week',
        headline: 'THIS WEEK',
        start: now,
        end: addBerlinDays(bp, 7),
      };

    case 'weekend':
    default: {
      const dow = bp.weekday; // 0 Sun … 6 Sat
      // Weekend = Fri 00:00 → Mon 00:00 (Berlin). If we're already in it, start now.
      const inWeekend = dow === 5 || dow === 6 || dow === 0;
      const daysToFriday = (5 - dow + 7) % 7; // 0 if Fri
      const start = inWeekend ? now : addBerlinDays(bp, daysToFriday);
      // Days from today to the Monday that ends this weekend.
      let daysToMonday: number;
      if (dow === 0) daysToMonday = 1;            // Sunday → next day
      else daysToMonday = ((8 - dow) % 7) || 7;    // Mon..Sat → coming Monday
      const end = addBerlinDays(bp, daysToMonday);
      return { key: 'weekend', label: 'this weekend', headline: 'THIS WEEKEND', start, end };
    }
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** "Fri 23:00" in Berlin time. */
export function formatWhen(date: Date): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Berlin',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return '';
  }
}

/** Clean title + real venue for display, mirroring the EventCard logic. */
export function toShareEvent(e: Event): ShareEvent {
  const parsed = isAggregatorVenue(e.venue_id)
    ? parseTitleVenue(e.title)
    : { title: e.title, venue: null };
  const venue =
    parsed.venue ?? (e.venue ? getVenueDisplayName(e.venue_id, e.venue.name) : null);
  return {
    id: e.id,
    title: parsed.title,
    venue,
    when: formatWhen(new Date(e.start_time)),
  };
}

export function toShareEvents(events: Event[]): ShareEvent[] {
  return events.map(toShareEvent);
}

// ---------------------------------------------------------------------------
// Channels & UTM links
// ---------------------------------------------------------------------------

export type ShareChannelKey =
  | 'instagram'
  | 'tiktok'
  | 'facebook'
  | 'telegram'
  | 'whatsapp'
  | 'reddit'
  | 'newsletter'
  | 'sticker';

/** Display label + UTM medium for each channel we post to. */
export const SHARE_CHANNELS: { key: ShareChannelKey; label: string; medium: string }[] = [
  { key: 'instagram', label: 'Instagram', medium: 'social' },
  { key: 'tiktok', label: 'TikTok', medium: 'social' },
  { key: 'facebook', label: 'Facebook', medium: 'social' },
  { key: 'telegram', label: 'Telegram', medium: 'messaging' },
  { key: 'whatsapp', label: 'WhatsApp', medium: 'messaging' },
  { key: 'reddit', label: 'Reddit', medium: 'social' },
  { key: 'newsletter', label: 'Newsletter', medium: 'email' },
  { key: 'sticker', label: 'Sticker / QR', medium: 'offline' },
];

const CHANNEL_MEDIUM = new Map(SHARE_CHANNELS.map(c => [c.key, c.medium]));

export function isShareChannelKey(v: string | null | undefined): v is ShareChannelKey {
  return !!v && CHANNEL_MEDIUM.has(v as ShareChannelKey);
}

/**
 * Build a UTM-tagged destination link so analytics attribute the visit to the
 * right channel. `campaign` is typically the range key (weekend/today/...).
 */
export function buildShareLink(
  baseUrl: string,
  channel: ShareChannelKey,
  campaign: string,
): string {
  const medium = CHANNEL_MEDIUM.get(channel) ?? 'referral';
  const params = new URLSearchParams({
    utm_source: channel,
    utm_medium: medium,
    utm_campaign: campaign,
  });
  const base = baseUrl.replace(/\/$/, '');
  return `${base}/?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Caption
// ---------------------------------------------------------------------------

const BASE_HASHTAGS = [
  '#berlin',
  '#berlinevents',
  '#whatson',
  '#thingstodoinberlin',
  '#berlinnightlife',
  '#queerberlin',
  '#berlinculture',
];

/**
 * Build a ready-to-paste caption for Instagram/Telegram/etc. `link` is the
 * destination shown at the end (append UTM before passing in if desired).
 */
export function buildShareCaption(
  events: ShareEvent[],
  range: ShareRange,
  link: string,
  opts: { linkInBio?: boolean } = {},
): string {
  const lines: string[] = [];
  lines.push(`\u2728 What's on in Berlin ${range.label} \u2728`);
  lines.push('');

  for (const e of events) {
    const venue = e.venue ? ` @ ${e.venue}` : '';
    lines.push(`\u{1F5D3}\uFE0F ${e.when} \u2014 ${e.title}${venue}`);
  }

  lines.push('');
  if (opts.linkInBio) {
    // Instagram/TikTok captions can't have clickable links — point to the bio.
    lines.push('Full list + one-tap add-to-calendar \u2192 link in bio \u{1F447}');
  } else {
    lines.push('Full list + one-tap add-to-calendar \u{1F447}');
    lines.push(link);
  }
  lines.push('');
  lines.push(BASE_HASHTAGS.join(' '));

  return lines.join('\n');
}
