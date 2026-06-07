import type { Event } from './types';
import { getVenueCategory, type VenueCategory } from './venueCategories';
import type { Interaction } from './interactions';

/**
 * A user's learned taste, derived entirely from local signals:
 *   - clicks (weak positive)
 *   - calendar saves (stronger positive)
 *   - favourites (strongest positive)
 *
 * This is the free, no-backend "Layer 1" of personalization. The same
 * profile + scoreEvent() pipeline is designed to later accept commercial
 * signals (promoted placement, affiliate priority) without rearchitecting.
 */
export interface TasteProfile {
  venueScores: Map<number, number>;
  categoryScores: Record<VenueCategory, number>;
  totalSignals: number;
}

const WEIGHT_CLICK = 1;
const WEIGHT_CALENDAR = 2;
const WEIGHT_FAVOURITE = 3;

export function buildTasteProfile(
  events: Event[],
  interactions: Interaction[],
  favouriteIds: number[],
): TasteProfile {
  const eventById = new Map<number, Event>();
  for (const e of events) eventById.set(e.id, e);

  const venueScores = new Map<number, number>();
  const categoryScores: Record<VenueCategory, number> = { art: 0, music: 0, community: 0, personal: 0 };
  let totalSignals = 0;

  function add(venueId: number, weight: number) {
    venueScores.set(venueId, (venueScores.get(venueId) ?? 0) + weight);
    categoryScores[getVenueCategory(venueId)] += weight;
    totalSignals += 1;
  }

  for (const it of interactions) {
    const ev = eventById.get(it.eventId);
    if (!ev) continue; // event no longer in feed (e.g. already passed)
    add(ev.venue_id, it.action === 'calendar' ? WEIGHT_CALENDAR : WEIGHT_CLICK);
  }

  for (const id of favouriteIds) {
    const ev = eventById.get(id);
    if (!ev) continue;
    add(ev.venue_id, WEIGHT_FAVOURITE);
  }

  return { venueScores, categoryScores, totalSignals };
}

/**
 * Relevance score for a single event given a taste profile.
 * Venue affinity is weighted more heavily than the broader category.
 *
 * `promotedBoost` is a forward hook for monetization: a paid/featured event
 * can pass a positive boost here to lift its placement within the same ranking.
 */
export function scoreEvent(event: Event, profile: TasteProfile, promotedBoost = 0): number {
  const venueScore = profile.venueScores.get(event.venue_id) ?? 0;
  const categoryScore = profile.categoryScores[getVenueCategory(event.venue_id)] ?? 0;
  return venueScore * 2 + categoryScore + promotedBoost;
}
