export type VenueCategory = 'art' | 'music' | 'community' | 'personal';

const VENUE_CATEGORY_MAP: Record<number, VenueCategory> = {
  1: 'art',         // Sinema Transtopia
  2: 'community',   // MeetUp Groups
  3: 'community',   // Village Berlin
  4: 'community',   // Neurodivergent Berlin
  5: 'music',       // SO36
  6: 'art',         // Flutgraben
  7: 'personal',    // Telegram Groups
  8: 'art',         // ART at Berlin
  9: 'music',       // Festsaal Kreuzberg
  10: 'music',      // OYA Bar
  11: 'music',      // Gelegenheiten
};

export function getVenueCategory(venueId: number): VenueCategory {
  return VENUE_CATEGORY_MAP[venueId] ?? 'community';
}

/**
 * Override the raw database venue name with a more descriptive display name.
 * Used in VenueStrip, VenueFilter, and EventCard.
 */
const VENUE_DISPLAY_NAME_MAP: Record<number, string> = {
  2: 'ND Community',             // MeetUp: berlin-neurodivergent-community
  7: 'QUEER EVENTS Berlin',      // Telegram group
};

export function getVenueDisplayName(venueId: number, dbName: string): string {
  return VENUE_DISPLAY_NAME_MAP[venueId] ?? dbName;
}

export const CATEGORY_STYLES: Record<VenueCategory, { bg: string; text: string; border: string; label: string }> = {
  art: {
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    text: 'text-teal-700 dark:text-teal-400',
    border: 'border-teal-200 dark:border-teal-800',
    label: 'Art & Exhibitions',
  },
  music: {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800',
    label: 'Music & Nightlife',
  },
  community: {
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    text: 'text-orange-700 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800',
    label: 'Community & Meetups',
  },
  personal: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
    label: 'Personal Feeds',
  },
};
