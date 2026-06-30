import type { Event } from './types';
import { getVenueCategory, type VenueCategory } from './venueCategories';

/**
 * Content-based "vibe" tagging — a free, keyword-driven classifier that reads
 * the event title (and venue name) to infer the mood/feel of an event.
 *
 * This is orthogonal to venue *category* (art/music/community/personal):
 * categories say WHERE an event is from, vibes say WHAT IT FEELS LIKE.
 * Runs entirely client-side, no API, no cost.
 *
 * Note: "queer" is intentionally NOT a vibe — it is a first-class Community
 * lane (see communities.ts) to avoid a redundant duplicate filter.
 */
export type Vibe =
  | 'party'
  | 'wellness'
  | 'arts'
  | 'live'
  | 'community'
  | 'activist';

interface VibeDef {
  vibe: Vibe;
  emoji: string;
  label: string;
  /** Tailwind classes for chips/filters. */
  bg: string;
  text: string;
  border: string;
  /** Matched against lowercased "title + venue" text. */
  pattern: RegExp;
}

// Order matters: earlier entries are considered more salient and shown first.
export const VIBE_DEFS: VibeDef[] = [
  {
    vibe: 'party',
    emoji: '\u{1F525}',
    label: 'Party',
    bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/40',
    text: 'text-fuchsia-700 dark:text-fuchsia-400',
    border: 'border-fuchsia-200 dark:border-fuchsia-800',
    pattern: /\b(party|rave|club\s?night|dj\b|d\.j\.|dancefloor|dance\s?floor|disco|techno|house\s?night|after\s?hour|open\s?air|nightlife|clubbing)\b/i,
  },
  {
    vibe: 'wellness',
    emoji: '\u{1F9D8}',
    label: 'Wellness',
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    text: 'text-teal-700 dark:text-teal-400',
    border: 'border-teal-200 dark:border-teal-800',
    pattern: /\b(yoga|meditation|meditate|cuddle|massage|healing|embodi\w*|breathwork|sound\s?bath|somatic|wellness|self-?care|tantra|reiki|mindful\w*|retreat)\b/i,
  },
  {
    vibe: 'arts',
    emoji: '\u{1F3A8}',
    label: 'Arts & Film',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800',
    pattern: /\b(exhibition|gallery|vernissage|film|screening|cinema|kino|theatre|theater|performance|reading|lecture|poetry|spoken\s?word|art\s?market|installation|premiere|festival)\b/i,
  },
  {
    vibe: 'live',
    emoji: '\u{1F3B8}',
    label: 'Live Music',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
    pattern: /\b(concert|live\b|gig|band|acoustic|konzert|unplugged|showcase|jam\s?session)\b/i,
  },
  {
    vibe: 'activist',
    emoji: '\u270A',
    label: 'Activist',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-800',
    pattern: /\b(protest|solidarity|political|benefit|fundraiser|demo\b|demonstration|mutual\s?aid|notaflof|activis\w*|resistance|workers?'?\s?rights|anti-?\w+)\b/i,
  },
  {
    vibe: 'community',
    emoji: '\u{1F91D}',
    label: 'Community',
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    text: 'text-orange-700 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800',
    pattern: /\b(meet-?up|meeting|networking|co-?working|workshop|gathering|potluck|community|stammtisch|sprachcaf\w*|language\s?exchange|board\s?game|buddy|circle)\b/i,
  },
];

const VIBE_BY_KEY = new Map<Vibe, VibeDef>(VIBE_DEFS.map(d => [d.vibe, d]));

export function getVibeDef(vibe: Vibe): VibeDef {
  return VIBE_BY_KEY.get(vibe)!;
}

/**
 * When no keyword matches, fall back to a vibe inferred from the venue's
 * category so (almost) every event still carries one tag for discovery.
 */
const CATEGORY_FALLBACK: Record<VenueCategory, Vibe> = {
  art: 'arts',
  music: 'live',
  community: 'community',
  personal: 'community',
};

/**
 * Classify an event into one or more vibes, ordered by salience.
 * Always returns at least one vibe (keyword match, else a category fallback).
 *
 * Memoized by event id — classification is content-static per id and this is
 * now called repeatedly inside taste scoring / feed sorting.
 */
const vibeCache = new Map<number, Vibe[]>();

export function getEventVibes(event: Event): Vibe[] {
  const cached = vibeCache.get(event.id);
  if (cached) return cached;

  const haystack = `${event.title} ${event.venue?.name ?? ''}`;
  const result: Vibe[] = [];
  for (const def of VIBE_DEFS) {
    if (def.pattern.test(haystack)) result.push(def.vibe);
  }
  if (result.length === 0) {
    result.push(CATEGORY_FALLBACK[getVenueCategory(event.venue_id)]);
  }

  vibeCache.set(event.id, result);
  return result;
}
