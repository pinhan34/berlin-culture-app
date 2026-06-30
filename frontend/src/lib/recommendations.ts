import type { Event } from './types';
import { getVenueCategory, type VenueCategory } from './venueCategories';
import type { Interaction } from './interactions';
import { getEventVibes, getVibeDef, type Vibe } from './vibes';
import { getEventCommunities, getCommunityDef, type Community } from './communities';

/**
 * A user's learned taste, derived entirely from local signals:
 *   - clicks (weak positive, recency-decayed)
 *   - calendar saves (stronger positive, recency-decayed)
 *   - favourites (strongest positive)
 *   - hides / "not for me" (negative)
 *   - explicit filter usage (soft hint)
 *
 * Taste is tracked across four dimensions — venue, broad category, content
 * vibe, and community — so recommendations understand not just WHERE an event
 * is from but WHAT IT FEELS LIKE and WHO it's for.
 *
 * This is the free, no-backend "Layer 1" of personalization. The same
 * profile + scoreEvent() pipeline is designed to later accept commercial
 * signals (promoted placement, affiliate priority) without rearchitecting.
 */
export interface TasteProfile {
  venueScores: Map<number, number>;
  categoryScores: Record<VenueCategory, number>;
  vibeScores: Partial<Record<Vibe, number>>;
  communityScores: Partial<Record<Community, number>>;
  totalSignals: number;
}

/** Soft signals from explicit filter usage (not real engagement). */
export interface TasteHints {
  vibes?: Partial<Record<Vibe, number>>;
  communities?: Partial<Record<Community, number>>;
}

const WEIGHT_CLICK = 1;
const WEIGHT_CALENDAR = 2;
const WEIGHT_FAVOURITE = 3;
const WEIGHT_HIDE = -2.5;
const HINT_WEIGHT = 0.5;

/** Recency decay: a signal loses half its weight every ~3 weeks. */
const RECENCY_HALFLIFE_MS = 21 * 24 * 60 * 60 * 1000;
function recencyWeight(timestamp: number): number {
  const age = Date.now() - timestamp;
  if (age <= 0) return 1;
  return Math.pow(0.5, age / RECENCY_HALFLIFE_MS);
}

export function buildTasteProfile(
  events: Event[],
  interactions: Interaction[],
  favouriteIds: number[],
  hiddenIds: number[] = [],
  hints?: TasteHints,
): TasteProfile {
  const eventById = new Map<number, Event>();
  for (const e of events) eventById.set(e.id, e);

  const venueScores = new Map<number, number>();
  const categoryScores: Record<VenueCategory, number> = { art: 0, music: 0, community: 0, personal: 0 };
  const vibeScores: Partial<Record<Vibe, number>> = {};
  const communityScores: Partial<Record<Community, number>> = {};
  let totalSignals = 0;

  function addEvent(ev: Event, weight: number, countSignal: boolean) {
    venueScores.set(ev.venue_id, (venueScores.get(ev.venue_id) ?? 0) + weight);
    categoryScores[getVenueCategory(ev.venue_id)] += weight;
    for (const v of getEventVibes(ev)) vibeScores[v] = (vibeScores[v] ?? 0) + weight;
    for (const c of getEventCommunities(ev)) communityScores[c] = (communityScores[c] ?? 0) + weight;
    if (countSignal) totalSignals += 1;
  }

  for (const it of interactions) {
    const ev = eventById.get(it.eventId);
    if (!ev) continue; // event no longer in feed (e.g. already passed)
    const base = it.action === 'calendar' ? WEIGHT_CALENDAR : WEIGHT_CLICK;
    addEvent(ev, base * recencyWeight(it.timestamp), true);
  }

  for (const id of favouriteIds) {
    const ev = eventById.get(id);
    if (!ev) continue;
    addEvent(ev, WEIGHT_FAVOURITE, true);
  }

  // Negative signal — "not for me" downranks similar events. Doesn't count as
  // taste depth (it tells us what to avoid, not how much we know the user).
  for (const id of hiddenIds) {
    const ev = eventById.get(id);
    if (!ev) continue;
    addEvent(ev, WEIGHT_HIDE, false);
  }

  // Soft hints from explicit filter usage — a gentle nudge, not real
  // engagement, so excluded from totalSignals / the For-You threshold.
  if (hints?.vibes) {
    for (const [v, n] of Object.entries(hints.vibes) as [Vibe, number][]) {
      vibeScores[v] = (vibeScores[v] ?? 0) + n * HINT_WEIGHT;
    }
  }
  if (hints?.communities) {
    for (const [c, n] of Object.entries(hints.communities) as [Community, number][]) {
      communityScores[c] = (communityScores[c] ?? 0) + n * HINT_WEIGHT;
    }
  }

  return { venueScores, categoryScores, vibeScores, communityScores, totalSignals };
}

const W_VENUE = 2;
const W_CATEGORY = 1;
const W_VIBE = 1.5;
const W_COMMUNITY = 2;

/**
 * Relevance score for a single event given a taste profile. Combines venue,
 * category, vibe, and community affinity (venue + community weighted highest).
 *
 * `promotedBoost` is a forward hook for monetization: a paid/featured event
 * can pass a positive boost here to lift its placement within the same ranking.
 */
export function scoreEvent(event: Event, profile: TasteProfile, promotedBoost = 0): number {
  const venueScore = profile.venueScores.get(event.venue_id) ?? 0;
  const categoryScore = profile.categoryScores[getVenueCategory(event.venue_id)] ?? 0;

  let vibeScore = 0;
  for (const v of getEventVibes(event)) vibeScore += profile.vibeScores[v] ?? 0;

  let communityScore = 0;
  for (const c of getEventCommunities(event)) communityScore += profile.communityScores[c] ?? 0;

  return (
    venueScore * W_VENUE +
    categoryScore * W_CATEGORY +
    vibeScore * W_VIBE +
    communityScore * W_COMMUNITY +
    promotedBoost
  );
}

/**
 * Human-readable reasons an event matches the user's taste, strongest first.
 * Used for "why you're seeing this" transparency chips.
 */
export function explainEvent(event: Event, profile: TasteProfile, max = 2): string[] {
  const reasons: { text: string; weight: number }[] = [];

  const venueScore = profile.venueScores.get(event.venue_id) ?? 0;
  if (venueScore > 0) reasons.push({ text: 'A venue you like', weight: venueScore * W_VENUE });

  for (const c of getEventCommunities(event)) {
    const s = profile.communityScores[c] ?? 0;
    if (s > 0) reasons.push({ text: getCommunityDef(c).title, weight: s * W_COMMUNITY });
  }
  for (const v of getEventVibes(event)) {
    const s = profile.vibeScores[v] ?? 0;
    if (s > 0) reasons.push({ text: getVibeDef(v).label, weight: s * W_VIBE });
  }

  return reasons
    .sort((a, b) => b.weight - a.weight)
    .slice(0, max)
    .map(r => r.text);
}
