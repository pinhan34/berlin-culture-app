import { normalizeVenueKey, ONLINE_VENUE_NAME } from './venueKey.js';

/** The venue-related slice of a MeetUp event node (see MeetUpEventNode in adapters/meetup.ts). */
export interface MeetUpVenueInput {
    venue?: { name?: string | null } | null;
    isOnline?: boolean | null;
    eventType?: string | null;
}

export interface VenueFields {
    venue_name: string | null;
    venue_key: string | null;
}

/**
 * Maps a MeetUp event's location data onto venue_name / venue_key.
 *  - online event               -> "Online" (shared constant, so every adapter agrees)
 *  - physical, venue name known -> that name
 *  - anything else              -> null (unknown stays unknown; never guess "Online")
 * Online is checked first, so an online event that carries a placeholder venue still reads "Online".
 */
export function resolveMeetupVenue(node: MeetUpVenueInput): VenueFields {
    if (node.isOnline === true || node.eventType === 'ONLINE') {
        return { venue_name: ONLINE_VENUE_NAME, venue_key: normalizeVenueKey(ONLINE_VENUE_NAME) };
    }
    const name = node.venue?.name?.trim();
    if (name) {
        return { venue_name: name, venue_key: normalizeVenueKey(name) };
    }
    return { venue_name: null, venue_key: null };
}
