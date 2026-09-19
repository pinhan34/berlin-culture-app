// Unit tests for MeetUp venue resolution.
// Run with: node --loader ts-node/esm src/scrapers/meetupVenue.test.ts

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveMeetupVenue } from './meetupVenue.js';

test('physical event with a venue name uses that name and a normalized key', () => {
    assert.deepEqual(
        resolveMeetupVenue({ eventType: 'PHYSICAL', isOnline: false, venue: { name: 'Zwischenraum' } }),
        { venue_name: 'Zwischenraum', venue_key: 'zwischenraum' },
    );
});

test('venue name is trimmed', () => {
    assert.equal(resolveMeetupVenue({ venue: { name: '  Café Cralle ' } }).venue_key, 'cafe cralle');
});

test('online event becomes "Online" with key "online"', () => {
    assert.deepEqual(
        resolveMeetupVenue({ isOnline: true, venue: null }),
        { venue_name: 'Online', venue_key: 'online' },
    );
});

test('eventType ONLINE is treated as online even if isOnline is missing', () => {
    assert.equal(resolveMeetupVenue({ eventType: 'ONLINE' }).venue_key, 'online');
});

test('online wins over a placeholder venue', () => {
    assert.equal(resolveMeetupVenue({ isOnline: true, venue: { name: 'Online event' } }).venue_name, 'Online');
});

test('physical event with no venue stays null (never guessed as Online)', () => {
    assert.deepEqual(
        resolveMeetupVenue({ eventType: 'PHYSICAL', isOnline: false, venue: null }),
        { venue_name: null, venue_key: null },
    );
});

test('blank venue name stays null', () => {
    assert.deepEqual(resolveMeetupVenue({ venue: { name: '   ' } }), { venue_name: null, venue_key: null });
});

test('completely empty input stays null', () => {
    assert.deepEqual(resolveMeetupVenue({}), { venue_name: null, venue_key: null });
});
