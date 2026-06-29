import type { Event } from './types';

/**
 * Content-based "vibe" tagging — a free, keyword-driven classifier that reads
 * the event title (and venue name) to infer the mood/feel of an event.
 *
 * This is orthogonal to venue *category* (art/music/community/personal):
 * categories say WHERE an event is from, vibes say WHAT IT FEELS LIKE.
 * Runs entirely client-side, no API, no cost.
 */
export type Vibe =
  | 'party'
  | 'wellness'
  | 'queer'
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
    vibe: 'queer',
    emoji: '\u{1F3F3}\u{FE0F}\u{200D}\u{1F308}',
    label: 'Queer',
    bg: 'bg-pink-50 dark:bg-pink-950/40',
    text: 'text-pink-700 dark:text-pink-400',
    border: 'border-pink-200 dark:border-pink-800',
    pattern: /\b(queer|drag|flinta\*?|trans\*?|pride|gay|lesbian|dyke\*?|lgbtq?\+?|gbtq|sapphic|nonbinary|non-binary|enby)\b/i,
  },
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

/** Classify an event into zero or more vibes, ordered by salience. */
export function getEventVibes(event: Event): Vibe[] {
  const haystack = `${event.title} ${event.venue?.name ?? ''}`;
  const result: Vibe[] = [];
  for (const def of VIBE_DEFS) {
    if (def.pattern.test(haystack)) result.push(def.vibe);
  }
  return result;
}
