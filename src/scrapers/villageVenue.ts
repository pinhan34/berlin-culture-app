import { normalizeVenueKey } from './venueKey.js';

export const VILLAGE_VENUE_NAME = 'Village Berlin';

/**
 * Village's API `location` is Village's own space, spelled inconsistently
 * ("Village.Berlin", "Village Berlin", "village.berlin"), or empty. Standardise the
 * spellings to one display name so the label doesn't depend on which row is seen first.
 * Empty stays null: a few events are off-site (e.g. outdoor walks), so we don't
 * assume Village for them.
 */
export function resolveVillageVenue(location: string | null | undefined): {
    venue_name: string | null;
    venue_key: string | null;
} {
    const name = location?.trim();
    if (!name) return { venue_name: null, venue_key: null };

    const key = normalizeVenueKey(name);
    if (!key) return { venue_name: null, venue_key: null };
    if (key === normalizeVenueKey(VILLAGE_VENUE_NAME)) {
        return { venue_name: VILLAGE_VENUE_NAME, venue_key: key };
    }
    return { venue_name: name, venue_key: key };
}
