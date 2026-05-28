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
  description: string;
  tags: IdentityTag[];
}

const VENUE_IDENTITY: Record<number, VenueIdentity> = {
  1:  { emoji: '\u{1F3AC}', tagline: 'Transcultural cinema in Wedding',
       description: 'SiNEMA TRANSTOPIA is a transcultural cinema space in Berlin-Wedding run by bi\'bak. Their programme spans queer and postcolonial film, workshops, and open-air screenings -- a living room for stories that don\'t fit mainstream cinema.',
       tags: ['indie', 'cinema'] },
  2:  { emoji: '\u{1F91D}', tagline: 'Community-driven meetups across Berlin',
       description: 'We pull events from MeetUp groups that centre neurodivergent, queer, and indie communities in Berlin. These are grassroots gatherings -- co-working sessions, social hangs, creative circles, and more.',
       tags: ['community'] },
  3:  { emoji: '\u{1F3E0}', tagline: 'Indie co-working and community space',
       description: 'Village Berlin is a co-working and community space in Kreuzberg. They host queer meetups, creative workshops, and social events that bring people together beyond the laptop.',
       tags: ['indie', 'community'] },
  4:  { emoji: '\u{267E}\u{FE0F}',  tagline: 'Events by and for neurodivergent Berlin',
       description: 'Berlin\'s neurodivergent-led, volunteer-run community. They organise co-working sessions, creative sharing circles, music therapy, sensory-friendly museum visits, and the annual Neurodivergent Pride Walk.',
       tags: ['nd-friendly', 'community'] },
  5:  { emoji: '\u{1F399}\u{FE0F}', tagline: 'Legendary queer punk club since 1978',
       description: 'SO36 in Kreuzberg has been a queer and punk institution since 1978. From Gayhane (queer oriental night) to punk shows and Roller Disco -- if it\'s loud, weird, and welcoming, it probably happens here.',
       tags: ['queer', 'nightlife'] },
  6:  { emoji: '\u{1F3A8}', tagline: 'Artist-run project space at the Spree',
       description: 'Flutgraben e.V. is an artist-run exhibition and performance space on the Spree in Kreuzberg. Installations, screenings, music -- always experimental, always independent.',
       tags: ['indie', 'gallery'] },
  7:  { emoji: '\u{1F4E8}', tagline: 'Your private Telegram groups',
       description: 'Events shared in your Telegram communities -- currently pulling from QUEER EVENTS Berlin. These are crowd-sourced recommendations from people who actually go out.',
       tags: ['community'] },
  8:  { emoji: '\u{1F5BC}\u{FE0F}', tagline: 'Independent exhibition listings',
       description: 'ART at Berlin aggregates exhibitions and openings across the city\'s independent galleries and project spaces. If it\'s hanging on a wall somewhere in Berlin, it\'s probably listed here.',
       tags: ['gallery', 'exhibitions'] },
  9:  { emoji: '\u{1F3B8}', tagline: 'Live music and queer events in Kreuzberg',
       description: 'Festsaal Kreuzberg is a live music and event venue in Kreuzberg. We filter for queer events, drag nights, and indie concerts -- the kind of shows where the stage is three feet away.',
       tags: ['queer', 'indie', 'live-music'] },
  10: { emoji: '\u{1F378}', tagline: 'Queer bar and community collective',
       description: 'OYA Bar is a queer collective bar in Kreuzberg. All their events go through -- DJ nights, community meetups, drag performances, and cosy bar evenings.',
       tags: ['queer', 'community'] },
  11: { emoji: '\u{2728}',  tagline: 'Intimate indie venue on Weserstraße',
       description: 'Gelegenheiten is a small, beloved venue on Weserstraße in Neukölln. Home to Elektronischer Salon and eclectic indie nights. The kind of place where the bartender knows your name.',
       tags: ['indie', 'nightlife'] },
};

export function getVenueIdentity(venueId: number): VenueIdentity {
  return VENUE_IDENTITY[venueId] ?? { tagline: '', emoji: '', description: '', tags: [] };
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
