// Self-contained tests for the vibe + community classifiers.
// Patterns mirror src/lib/vibes.ts and src/lib/communities.ts — keep in sync.
// Run with: node scripts/classifiers.test.mjs

const VIBE_PATTERNS = {
  queer: /\b(queer|drag|flinta\*?|trans\*?|pride|gay|lesbian|dyke\*?|lgbtq?\+?|gbtq|sapphic|nonbinary|non-binary|enby)\b/i,
  party: /\b(party|rave|club\s?night|dj\b|d\.j\.|dancefloor|dance\s?floor|disco|techno|house\s?night|after\s?hour|open\s?air|nightlife|clubbing)\b/i,
  wellness: /\b(yoga|meditation|meditate|cuddle|massage|healing|embodi\w*|breathwork|sound\s?bath|somatic|wellness|self-?care|tantra|reiki|mindful\w*|retreat)\b/i,
  arts: /\b(exhibition|gallery|vernissage|film|screening|cinema|kino|theatre|theater|performance|reading|lecture|poetry|spoken\s?word|art\s?market|installation|premiere|festival)\b/i,
  live: /\b(concert|live\b|gig|band|acoustic|konzert|unplugged|showcase|jam\s?session)\b/i,
  activist: /\b(protest|solidarity|political|benefit|fundraiser|demo\b|demonstration|mutual\s?aid|notaflof|activis\w*|resistance|workers?'?\s?rights|anti-?\w+)\b/i,
  community: /\b(meet-?up|meeting|networking|co-?working|workshop|gathering|potluck|community|stammtisch|sprachcaf\w*|language\s?exchange|board\s?game|buddy|circle)\b/i,
};
const VIBE_ORDER = ['queer', 'party', 'wellness', 'arts', 'live', 'activist', 'community'];

function getEventVibes(title, venueName = '') {
  const hay = `${title} ${venueName}`;
  return VIBE_ORDER.filter(v => VIBE_PATTERNS[v].test(hay));
}

const ND_VENUE_ID = 2;
const ND_RE = /\b(neurodivergent|neurodiverse|neurospicy|neuro-?spicy|autis\w*|adhd|au?dhd|asperger\w*|sensory-?friendly)\b/i;

function getEventCommunities(title, venueId = 1, venueName = '') {
  const out = [];
  if (getEventVibes(title, venueName).includes('queer')) out.push('queer');
  if (venueId === ND_VENUE_ID || ND_RE.test(`${title} ${venueName}`)) out.push('neurodivergent');
  return out;
}

let passed = 0, total = 0;
function check(label, actual, expected) {
  total++;
  const a = [...actual].sort().join(',');
  const e = [...expected].sort().join(',');
  const ok = a === e;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label} -> [${actual.join(', ')}]`);
  if (!ok) console.log(`        expected: [${expected.join(', ')}]`);
  if (ok) passed++;
}

// Vibes
check('Queer FLINTA* Rock Party', getEventVibes('ROCKSTAR GIRLFRIENDS - Queer FLINTA* Rock Party'), ['queer', 'party']);
check('Yoga for GBTQ men', getEventVibes('Yoga & connection games for GBTQ men'), ['queer', 'wellness']);
check('XPOSED Film Festival', getEventVibes('XPOSED Film Festival 2026'), ['arts']);
check('SPORTS live in Berlin', getEventVibes('SPORTS (US) — live in Berlin'), ['live']);
check('Co-working & Networking', getEventVibes('Neurodivergent Co-working & Networking'), ['community']);
check('Benefit fundraiser', getEventVibes('Benefit fundraiser for mutual aid'), ['activist']);
check('Quiet morning (none)', getEventVibes('Quiet morning'), []);

// Communities
check('Queer party (community)', getEventCommunities('Queer FLINTA* Rock Party'), ['queer']);
check('ND co-working (community)', getEventCommunities('Neurodivergent Co-working & Networking'), ['neurodivergent']);
check('Sensory-friendly drag', getEventCommunities('Sensory-friendly drag brunch'), ['queer', 'neurodivergent']);
check('ND venue board game', getEventCommunities('Board Game Meetup', 2), ['neurodivergent']);
check('Generic techno (none)', getEventCommunities('Generic techno night'), []);

console.log(`\n${passed}/${total} passed`);
if (passed !== total) process.exit(1);
