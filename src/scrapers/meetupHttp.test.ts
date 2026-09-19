// Unit tests for the MeetUp __NEXT_DATA__ parser (no network).
// Run with: node --loader ts-node/esm src/scrapers/meetupHttp.test.ts

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNextDataEvents } from './meetupHttp.js';

const NOW = new Date('2026-09-19T12:00:00Z').getTime();

function page(apollo: Record<string, unknown>): string {
    const data = { props: { pageProps: { __APOLLO_STATE__: apollo } } };
    return `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script></html>`;
}

const physical = {
    id: '1', title: 'Board Game Meetup', dateTime: '2026-09-25T18:00:00+02:00',
    eventUrl: 'https://www.meetup.com/g/events/1/', eventType: 'PHYSICAL', isOnline: false,
    venue: { __ref: 'Venue:10' },
};

test('resolves the venue reference and maps event fields', () => {
    const nodes = parseNextDataEvents(page({ 'Event:1': physical, 'Venue:10': { name: 'Zwischenraum' } }), NOW);
    assert.equal(nodes.length, 1);
    assert.equal(nodes[0]?.venue?.name, 'Zwischenraum');
    assert.equal(nodes[0]?.isOnline, false);
    assert.equal(nodes[0]?.eventType, 'PHYSICAL');
});

test('keeps online flag and tolerates a missing venue', () => {
    const online = { ...physical, id: '2', isOnline: true, eventType: 'ONLINE', venue: null };
    const nodes = parseNextDataEvents(page({ 'Event:2': online }), NOW);
    assert.equal(nodes[0]?.isOnline, true);
    assert.equal(nodes[0]?.venue, null);
});

test('skips events that already started', () => {
    const past = { ...physical, id: '3', dateTime: '2026-09-01T18:00:00+02:00' };
    assert.equal(parseNextDataEvents(page({ 'Event:3': past }), NOW).length, 0);
});

test('ignores non-Event entries and events missing required fields', () => {
    const apollo = { 'Group:5': { title: 'x' }, 'Event:4': { id: '4', title: 'No URL', dateTime: physical.dateTime } };
    assert.equal(parseNextDataEvents(page(apollo), NOW).length, 0);
});

test('returns [] for pages without __NEXT_DATA__, bad JSON, or no Apollo state', () => {
    assert.deepEqual(parseNextDataEvents('<html>blocked</html>', NOW), []);
    assert.deepEqual(parseNextDataEvents('<script id="__NEXT_DATA__">{oops</script>', NOW), []);
    assert.deepEqual(parseNextDataEvents('<script id="__NEXT_DATA__">{"props":{}}</script>', NOW), []);
});
