export type IdentityTag =
  | 'queer'
  | 'nd-friendly'
  | 'indie'
  | 'nightlife'
  | 'cinema'
  | 'live-music'
  | 'gallery'
  | 'exhibitions'
  | 'community';

export interface VenueIdentity {
  tagline: string;
  emoji: string;
  tags: IdentityTag[];
}

const VENUE_IDENTITY: Record<number, VenueIdentity> = {
  1:  { emoji: '\u{1F3AC}', tagline: 'Transcultural cinema in Wedding',          tags: ['indie', 'cinema'] },
  2:  { emoji: '\u{1F91D}', tagline: 'Community-driven meetups across Berlin',   tags: ['community'] },
  3:  { emoji: '\u{1F3E0}', tagline: 'Indie co-working and community space',     tags: ['indie', 'community'] },
  4:  { emoji: '\u{267E}\u{FE0F}',  tagline: 'Events by and for neurodivergent Berlin',  tags: ['nd-friendly', 'community'] },
  5:  { emoji: '\u{1F399}\u{FE0F}', tagline: 'Legendary queer punk club since 1978',     tags: ['queer', 'nightlife'] },
  6:  { emoji: '\u{1F3A8}', tagline: 'Artist-run project space at the Spree',    tags: ['indie', 'gallery'] },
  7:  { emoji: '\u{1F4E8}', tagline: 'Your private Telegram groups',             tags: ['community'] },
  8:  { emoji: '\u{1F5BC}\u{FE0F}', tagline: 'Independent exhibition listings',          tags: ['gallery', 'exhibitions'] },
  9:  { emoji: '\u{1F3B8}', tagline: 'Live music and queer events in Kreuzberg', tags: ['queer', 'indie', 'live-music'] },
  10: { emoji: '\u{1F378}', tagline: 'Queer bar and community collective',       tags: ['queer', 'community'] },
  11: { emoji: '\u{2728}',  tagline: 'Intimate indie venue',                     tags: ['indie', 'nightlife'] },
};

export function getVenueIdentity(venueId: number): VenueIdentity {
  return VENUE_IDENTITY[venueId] ?? { tagline: '', emoji: '', tags: [] };
}

export const IDENTITY_TAG_STYLES: Record<IdentityTag, { bg: string; text: string }> = {
  queer:       { bg: 'bg-fuchsia-100 dark:bg-fuchsia-950/50', text: 'text-fuchsia-700 dark:text-fuchsia-400' },
  'nd-friendly': { bg: 'bg-teal-100 dark:bg-teal-950/50',    text: 'text-teal-700 dark:text-teal-400' },
  indie:       { bg: 'bg-orange-100 dark:bg-orange-950/50',   text: 'text-orange-700 dark:text-orange-400' },
  nightlife:   { bg: 'bg-purple-100 dark:bg-purple-950/50',   text: 'text-purple-700 dark:text-purple-400' },
  community:   { bg: 'bg-amber-100 dark:bg-amber-950/50',     text: 'text-amber-700 dark:text-amber-400' },
  cinema:      { bg: 'bg-stone-100 dark:bg-stone-800/50',     text: 'text-stone-600 dark:text-stone-400' },
  gallery:     { bg: 'bg-stone-100 dark:bg-stone-800/50',     text: 'text-stone-600 dark:text-stone-400' },
  exhibitions: { bg: 'bg-stone-100 dark:bg-stone-800/50',     text: 'text-stone-600 dark:text-stone-400' },
  'live-music': { bg: 'bg-pink-100 dark:bg-pink-950/50',      text: 'text-pink-700 dark:text-pink-400' },
};

export const IDENTITY_TAG_LABELS: Record<IdentityTag, string> = {
  queer: 'queer',
  'nd-friendly': 'ND-friendly',
  indie: 'indie',
  nightlife: 'nightlife',
  cinema: 'cinema',
  gallery: 'gallery',
  exhibitions: 'exhibitions',
  'live-music': 'live music',
  community: 'community',
};
