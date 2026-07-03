import type { Event } from './types';

/**
 * Community lanes — the two communities this app is built to serve well.
 * These are first-class discovery entry points, not just filters.
 *
 * An event is tagged for a community if EITHER:
 *   (a) it comes from a source venue dedicated to that community
 *       (e.g. the QUEER EVENTS Berlin feed, the ND MeetUp group), regardless
 *       of the individual event's wording, OR
 *   (b) its title/venue name matches the community's keywords.
 *
 * Rule (a) is essential for aggregator feeds: their events have individual
 * titles like "Messy Salon #1" that never contain the word "queer", so a
 * keyword-only check would silently drop most of a dedicated queer feed.
 */
export type Community = 'queer' | 'neurodivergent';

/** Source venues whose entire feed belongs to a community. */
const QUEER_VENUE_IDS = new Set<number>([
  7, // Telegram: QUEER EVENTS Berlin
]);
const ND_VENUE_IDS = new Set<number>([
  2, // MeetUp: berlin-neurodivergent-community (+ other ND groups)
]);

const QUEER_RE = /\b(queer|drag|flinta\*?|trans\*?|pride|gay|lesbian|dyke\*?|lgbtq?\+?|gbtq|sapphic|nonbinary|non-binary|enby)\b/i;
const ND_RE = /\b(neurodivergent|neurodiverse|neurospicy|neuro-?spicy|autis\w*|adhd|au?dhd|asperger\w*|sensory-?friendly)\b/i;

export interface CommunityDef {
  community: Community;
  emoji: string;
  title: string;
  tagline: string;
  bg: string;
  text: string;
  border: string;
  ring: string;
}

export const COMMUNITY_DEFS: CommunityDef[] = [
  {
    community: 'queer',
    emoji: '\u{1F3F3}\u{FE0F}\u{200D}\u{1F308}',
    title: 'Queer Berlin',
    tagline: 'Parties, drag, FLINTA* & community',
    bg: 'bg-gradient-to-br from-pink-50 to-fuchsia-50 dark:from-pink-950/30 dark:to-fuchsia-950/20',
    text: 'text-pink-700 dark:text-pink-300',
    border: 'border-pink-200 dark:border-pink-900/50',
    ring: 'ring-pink-400 dark:ring-pink-600',
  },
  {
    community: 'neurodivergent',
    emoji: '\u267E\uFE0F',
    title: 'Neurodivergent',
    tagline: 'Autistic, ADHD, HSP & sensory-aware',
    bg: 'bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/20',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-900/50',
    ring: 'ring-indigo-400 dark:ring-indigo-600',
  },
];

const COMMUNITY_BY_KEY = new Map<Community, CommunityDef>(
  COMMUNITY_DEFS.map(d => [d.community, d]),
);

export function getCommunityDef(community: Community): CommunityDef {
  return COMMUNITY_BY_KEY.get(community)!;
}

/**
 * Which communities an event belongs to (zero, one, or both).
 * Memoized by event id — called repeatedly in taste scoring / feed sorting.
 */
const communityCache = new Map<number, Community[]>();

export function getEventCommunities(event: Event): Community[] {
  const cached = communityCache.get(event.id);
  if (cached) return cached;

  const result: Community[] = [];
  const haystack = `${event.title} ${event.venue?.name ?? ''}`;

  if (QUEER_VENUE_IDS.has(event.venue_id) || QUEER_RE.test(haystack)) {
    result.push('queer');
  }
  if (ND_VENUE_IDS.has(event.venue_id) || ND_RE.test(haystack)) {
    result.push('neurodivergent');
  }

  communityCache.set(event.id, result);
  return result;
}
