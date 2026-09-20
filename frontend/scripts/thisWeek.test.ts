import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDaysToKey,
  berlinDateKey,
  berlinDayLabel,
  getThisWeek,
  seriesKey,
} from '../src/lib/thisWeek';
import type { Event } from '../src/lib/types';

let nextId = 1;
function ev(start_time: string, over: Partial<Event> = {}): Event {
  const id = over.id ?? nextId++;
  return {
    id,
    venue_id: 1,
    title: `Event ${id}`,
    start_time,
    duration: null,
    event_url: null,
    created_at: '2026-01-01T00:00:00Z',
    ...over,
  };
}

const ids = (events: Event[]) => events.map((e) => e.id);
// minCount 0 disables the fallback so window boundaries can be tested in isolation.
const strict = { minCount: 0 };

test('berlinDateKey and addDaysToKey', () => {
  assert.equal(berlinDateKey(new Date('2026-07-10T22:30:00Z')), '2026-07-11');
  assert.equal(addDaysToKey('2026-02-27', 2), '2026-03-01');
  assert.equal(addDaysToKey('2026-12-31', 1), '2027-01-01');
  assert.equal(addDaysToKey('2026-03-01', -1), '2026-02-28');
});

test('berlinDayLabel uses the Berlin day', () => {
  assert.equal(berlinDayLabel(new Date('2026-07-10T22:30:00Z')), 'Saturday, 11 July 2026');
});

test('window boundaries: today .. today + 6', () => {
  const now = new Date('2026-07-10T08:00:00Z');
  const inLast = ev('2026-07-16T15:00:00Z');
  const outFirst = ev('2026-07-17T15:00:00Z');
  const r = getThisWeek([inLast, outFirst], { now, ...strict });
  assert.deepEqual(ids(r.events), [inLast.id]);
  assert.equal(r.mode, 'week');
});

test('Berlin midnight edge', () => {
  const now = new Date('2026-07-10T12:00:00Z');
  const late = ev('2026-07-10T21:59:00Z'); // 23:59 Berlin, still today
  const after = ev('2026-07-10T22:30:00Z'); // 00:30 Berlin, tomorrow
  assert.deepEqual(ids(getThisWeek([late, after], { now, days: 1, ...strict }).events), [late.id]);
  assert.deepEqual(
    ids(getThisWeek([late, after], { now, days: 2, ...strict }).events),
    [late.id, after.id],
  );
});

test('DST change 2026-03-29 (spring forward)', () => {
  const now = new Date('2026-03-27T12:00:00Z');
  const inside = ev('2026-04-02T21:30:00Z'); // 23:30 CEST on 04-02
  const outside = ev('2026-04-02T22:00:00Z'); // 00:00 CEST on 04-03
  assert.deepEqual(ids(getThisWeek([inside, outside], { now, ...strict }).events), [inside.id]);
});

test('DST change 2026-10-25 (fall back)', () => {
  const now = new Date('2026-10-23T12:00:00Z');
  const inside = ev('2026-10-29T22:30:00Z'); // 23:30 CET on 10-29
  const outside = ev('2026-10-29T23:00:00Z'); // 00:00 CET on 10-30
  assert.deepEqual(ids(getThisWeek([inside, outside], { now, ...strict }).events), [inside.id]);
});

test('hidden and past events are excluded', () => {
  const now = new Date('2026-07-10T12:00:00Z');
  const hidden = ev('2026-07-11T18:00:00Z');
  const past = ev('2026-07-10T11:00:00Z');
  const ok = ev('2026-07-12T18:00:00Z');
  const r = getThisWeek([hidden, past, ok], { now, hiddenIds: new Set([hidden.id]), ...strict });
  assert.deepEqual(ids(r.events), [ok.id]);
});

test('series collapse to the earliest occurrence', () => {
  const now = new Date('2026-07-10T08:00:00Z');
  const later = ev('2026-07-14T18:00:00Z', { title: 'Yoga', venue_id: 2 });
  const earlier = ev('2026-07-11T18:00:00Z', { title: 'Yoga', venue_id: 2 });
  const otherVenue = ev('2026-07-12T18:00:00Z', { title: 'Yoga', venue_id: 3 });
  const r = getThisWeek([later, earlier, otherVenue], { now, ...strict });
  assert.deepEqual(ids(r.events), [earlier.id, otherVenue.id]);
});

test('emoji and whitespace title variants collapse', () => {
  const a = ev('2026-07-11T18:00:00Z', { title: ' 💼🧠 Neurodivergent Co-working & Networking ' });
  const b = ev('2026-07-13T18:00:00Z', { title: 'neurodivergent   co-working networking' });
  assert.equal(seriesKey(a), seriesKey(b));
  const r = getThisWeek([b, a], { now: new Date('2026-07-10T08:00:00Z'), ...strict });
  assert.deepEqual(ids(r.events), [a.id]);
});

test('venue_key takes precedence over venue_id in the series key', () => {
  const a = ev('2026-07-11T18:00:00Z', { title: 'Jam', venue_id: 5, venue_key: 'k1' });
  const b = ev('2026-07-12T18:00:00Z', { title: 'Jam', venue_id: 6, venue_key: 'k1' });
  assert.equal(seriesKey(a), seriesKey(b));
});

test('falls back to 14 days with mode "next"', () => {
  const now = new Date('2026-07-10T08:00:00Z');
  const e1 = ev('2026-07-12T18:00:00Z');
  const e2 = ev('2026-07-20T18:00:00Z');
  const e3 = ev('2026-07-30T18:00:00Z'); // beyond 14 days
  const r = getThisWeek([e1, e2, e3], { now });
  assert.equal(r.mode, 'next');
  assert.deepEqual(ids(r.events), [e1.id, e2.id]);
  assert.equal(r.totalCount, 2);
});

test('enough events keeps mode "week"', () => {
  const now = new Date('2026-07-10T08:00:00Z');
  const list = [11, 12, 13, 14].map((d) => ev(`2026-07-${d}T18:00:00Z`));
  const r = getThisWeek(list, { now });
  assert.equal(r.mode, 'week');
  assert.equal(r.totalCount, 4);
});

test('empty input', () => {
  const r = getThisWeek([], { now: new Date('2026-07-10T08:00:00Z') });
  assert.deepEqual(r, { events: [], mode: 'next', totalCount: 0 });
});

test('deterministic: shuffled input gives the same output, ties broken by id', () => {
  const now = new Date('2026-07-10T08:00:00Z');
  const list = [
    ev('2026-07-11T18:00:00Z', { id: 30 }),
    ev('2026-07-11T18:00:00Z', { id: 10 }),
    ev('2026-07-12T18:00:00Z', { id: 20 }),
    ev('2026-07-13T18:00:00Z', { id: 40 }),
  ];
  const a = getThisWeek(list, { now });
  const b = getThisWeek([...list].reverse(), { now });
  assert.deepEqual(a, b);
  assert.deepEqual(ids(a.events), [10, 30, 20, 40]);
});

test('layer 0: taste input never changes the result', () => {
  const now = new Date('2026-07-10T08:00:00Z');
  const list = [11, 12, 13, 14].map((d) => ev(`2026-07-${d}T18:00:00Z`));
  const plain = getThisWeek(list, { now });
  const withTaste = getThisWeek(list, {
    now,
    profile: { venue: { 1: 99 } },
    interactions: [{ eventId: list[3].id, type: 'click' }],
  } as never);
  assert.deepEqual(plain, withTaste);
});
