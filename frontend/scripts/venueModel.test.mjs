// Self-contained tests for the Phase 2 venue-model rendering logic.
// Patterns mirror src/lib/venueCategories.ts and the venue-resolution logic in
// src/components/EventCard.tsx, plus the bucket key in
// src/components/EventFeed.tsx — keep in sync.
// Run with: node scripts/venueModel.test.mjs

const VENUE_DISPLAY_NAME_MAP = {
  2: 'ND Community',
  7: 'QUEER EVENTS Berlin',
};
function getVenueDisplayName(venueId, dbName) {
  return VENUE_DISPLAY_NAME_MAP[venueId] ?? dbName;
}

const AGGREGATOR_VENUE_IDS = new Set([2, 3, 7, 8]);
function isAggregatorVenue(venueId) {
  return AGGREGATOR_VENUE_IDS.has(venueId);
}

function parseTitleVenue(title) {
  const idx = title.lastIndexOf(' @ ');
  if (idx === -1) return { title, venue: null };
  const name = title.slice(0, idx).trim();
  const venue = title.slice(idx + 3).trim();
  if (!name || !venue) return { title, venue: null };
  return { title: name, venue };
}

// Mirrors EventCard.tsx lines ~67-73: prefer the real venue_name column,
// fall back to Phase 1 title-parsing only for unbackfilled aggregator rows.
function resolveVenue(event, dbName) {
  const sourceName = getVenueDisplayName(event.venue_id, dbName);
  const legacyParsed = !event.venue_name && isAggregatorVenue(event.venue_id)
    ? parseTitleVenue(event.title)
    : { title: event.title, venue: null };
  const displayTitle = legacyParsed.title;
  const venueName = event.venue_name ?? legacyParsed.venue ?? sourceName;
  const sameAsSource = venueName.trim().toLowerCase() === sourceName.trim().toLowerCase();
  const viaSource = (event.venue_name || legacyParsed.venue) && !sameAsSource ? sourceName : null;
  return { displayTitle, venueName, viaSource };
}

// Mirrors venueCategories.ts isSelfVenueKey().
const SELF_VENUE_KEYS = { 3: 'village berlin' };
function isSelfVenueKey(venueId, venueKey) {
  return venueKey != null && SELF_VENUE_KEYS[venueId] === venueKey;
}

// Mirrors EventFeed.tsx's venueBucketKey().
function venueBucketKey(e) {
  return e.venue_key ?? `id:${e.venue_id}`;
}

let passed = 0, total = 0;
function check(label, actual, expected) {
  total++;
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label} -> ${a}`);
  if (!ok) console.log(`        expected: ${e}`);
  if (ok) passed++;
}

// 1. Telegram (aggregator), venue_name populated -> use the column directly.
check(
  'Telegram, venue_name populated',
  resolveVenue({ venue_id: 7, title: 'Techno Night', venue_name: 'Tresor' }, 'QUEER EVENTS Berlin'),
  { displayTitle: 'Techno Night', venueName: 'Tresor', viaSource: 'QUEER EVENTS Berlin' },
);

// 2. Telegram, venue_name still null, legacy "@ Venue" title -> Phase 1 fallback.
check(
  'Telegram, unbackfilled legacy title',
  resolveVenue({ venue_id: 7, title: 'Techno Night @ Tresor', venue_name: null }, 'QUEER EVENTS Berlin'),
  { displayTitle: 'Techno Night', venueName: 'Tresor', viaSource: 'QUEER EVENTS Berlin' },
);

// 3. Telegram, no venue_name and no parseable "@" -> fall back to source name.
check(
  'Telegram, no venue info at all',
  resolveVenue({ venue_id: 7, title: 'Generic post', venue_name: null }, 'QUEER EVENTS Berlin'),
  { displayTitle: 'Generic post', venueName: 'QUEER EVENTS Berlin', viaSource: null },
);

// 4. Non-aggregator venue (SO36) with a literal " @ " in the title (e.g. a
// lineup entry) must NOT be parsed -- isAggregatorVenue(5) is false.
check(
  'SO36 (non-aggregator) title with a literal " @ "',
  resolveVenue({ venue_id: 5, title: 'DJ Foo @ Late Bar', venue_name: null }, 'SO36'),
  { displayTitle: 'DJ Foo @ Late Bar', venueName: 'SO36', viaSource: null },
);

// 5. MeetUp (aggregator, but never gets venue_name) -> always falls back to
// the source display name, never crashes on a permanently-null venue_name.
check(
  'MeetUp, venue_name always null',
  resolveVenue({ venue_id: 2, title: 'Board Game Night', venue_name: null }, 'MeetUp'),
  { displayTitle: 'Board Game Night', venueName: 'ND Community', viaSource: null },
);

// 6. ART at Berlin, venue_name populated from a parsed gallery name.
check(
  'ART at Berlin, venue_name populated',
  resolveVenue({ venue_id: 8, title: 'Artist X: Retrospective', venue_name: 'KW Institute' }, 'ART at Berlin'),
  { displayTitle: 'Artist X: Retrospective', venueName: 'KW Institute', viaSource: 'ART at Berlin' },
);

// 7. Village Berlin reports its own space -> no redundant "via Village Berlin".
check(
  'Village, venue_name same as source -> no "via"',
  resolveVenue({ venue_id: 3, title: 'Yoga', venue_name: 'Village Berlin' }, 'Village Berlin'),
  { displayTitle: 'Yoga', venueName: 'Village Berlin', viaSource: null },
);

// 8. Brick-and-mortar venue with venue_name equal to the source -> no "via" either.
check(
  'SO36, venue_name same as source -> no "via"',
  resolveVenue({ venue_id: 5, title: 'Punk Night', venue_name: 'SO36' }, 'SO36'),
  { displayTitle: 'Punk Night', venueName: 'SO36', viaSource: null },
);

// Self-venue pills: Village's own name is skipped, real venues and other sources are not.
check('self venue: Village own key is skipped', isSelfVenueKey(3, 'village berlin'), true);
check('self venue: other Village location is kept', isSelfVenueKey(3, 'tempelhofer feld'), false);
check('self venue: same key on another source is kept', isSelfVenueKey(7, 'village berlin'), false);
check('self venue: null key is not self', isSelfVenueKey(3, null), false);

// Bucket key: real venue_key wins; falls back to a per-source bucket.
check('bucket key uses venue_key when present', venueBucketKey({ venue_id: 7, venue_key: 'tresor' }), 'tresor');
check('bucket key falls back to id:venue_id', venueBucketKey({ venue_id: 7, venue_key: null }), 'id:7');
check('bucket key falls back when venue_key is undefined', venueBucketKey({ venue_id: 3 }), 'id:3');

console.log(`\n${passed}/${total} passed`);
if (passed !== total) process.exit(1);
