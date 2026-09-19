/**
 * Normalizes a venue name into a stable dedup key: lowercase, accents
 * stripped, punctuation stripped, whitespace collapsed. Used by every
 * adapter that writes venue_name (so "Café Cralle" and "Cafe Cralle"
 * collapse to the same key) and by the backfill script.
 */
export function normalizeVenueKey(raw: string): string {
    return raw
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '') // strip accents
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ') // strip punctuation
        .replace(/\s+/g, ' ')
        .trim();
}

/** Display name for events with no physical location. Shared so every adapter produces the same venue_key ('online'). */
export const ONLINE_VENUE_NAME = 'Online';

/** Hyphenated variant of normalizeVenueKey, for building `source` slugs (e.g. 'telegram:queer-events-berlin'). */
export function slugify(raw: string): string {
    return normalizeVenueKey(raw).replace(/\s+/g, '-');
}
