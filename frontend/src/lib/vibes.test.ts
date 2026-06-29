// Quick standalone test for the vibe classifier.
// Run with: node src/lib/vibes.test.ts   (Node 22+ strips TS types natively)
import { getEventVibes } from './vibes.ts';
import type { Event } from './types';

function ev(title: string, venueName?: string): Event {
  return {
    id: 1,
    venue_id: 1,
    title,
    start_time: new Date().toISOString(),
    duration: null,
    event_url: null,
    created_at: new Date().toISOString(),
    venue: venueName ? ({ name: venueName } as Event['venue']) : undefined,
  };
}

const cases: { title: string; venue?: string; expectIncludes: string[]; expectExcludes?: string[] }[] = [
  { title: 'ROCKSTAR GIRLFRIENDS - Queer FLINTA* Rock Party', expectIncludes: ['queer', 'party'] },
  { title: 'Yoga & connection games for GBTQ men', expectIncludes: ['wellness', 'queer'] },
  { title: 'XPOSED Film Festival 2026', expectIncludes: ['arts'] },
  { title: 'SPORTS (US) — live in Berlin', expectIncludes: ['live'] },
  { title: 'Neurodivergent Co-working & Networking', expectIncludes: ['community'] },
  { title: 'Benefit fundraiser for mutual aid', expectIncludes: ['activist'] },
  { title: 'Techno rave open air', venue: 'Tresor', expectIncludes: ['party'] },
  { title: 'Drag Brunch', expectIncludes: ['queer'] },
  { title: 'A perfectly ordinary lecture about taxes', expectIncludes: ['arts'] }, // "lecture" -> arts
  { title: 'Quiet morning', expectIncludes: [], expectExcludes: ['party', 'queer'] },
];

let passed = 0;
for (const c of cases) {
  const vibes = getEventVibes(ev(c.title, c.venue)) as string[];
  const missing = c.expectIncludes.filter(v => !vibes.includes(v));
  const wronglyPresent = (c.expectExcludes ?? []).filter(v => vibes.includes(v));
  const ok = missing.length === 0 && wronglyPresent.length === 0;
  console.log(`${ok ? 'PASS' : 'FAIL'}  "${c.title}" -> [${vibes.join(', ')}]`);
  if (!ok) {
    if (missing.length) console.log(`        missing: ${missing.join(', ')}`);
    if (wronglyPresent.length) console.log(`        should not have: ${wronglyPresent.join(', ')}`);
  }
  if (ok) passed++;
}
console.log(`\n${passed}/${cases.length} passed`);
if (passed !== cases.length) process.exit(1);
