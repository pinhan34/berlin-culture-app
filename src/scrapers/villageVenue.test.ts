// Unit tests for Village Berlin venue resolution.
// Run with: node --loader ts-node/esm src/scrapers/villageVenue.test.ts

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveVillageVenue } from './villageVenue.js';

test('all three Village spellings resolve to the same name and key', () => {
    for (const raw of ['Village.Berlin', 'Village Berlin', 'village.berlin']) {
        assert.deepEqual(resolveVillageVenue(raw), { venue_name: 'Village Berlin', venue_key: 'village berlin' });
    }
});

test('surrounding whitespace is ignored', () => {
    assert.equal(resolveVillageVenue('  Village.Berlin ').venue_name, 'Village Berlin');
});

test('empty, blank, null and undefined stay unknown (never assumed to be Village)', () => {
    for (const raw of ['', '   ', null, undefined]) {
        assert.deepEqual(resolveVillageVenue(raw), { venue_name: null, venue_key: null });
    }
});

test('a different real location keeps its own name and key', () => {
    assert.deepEqual(resolveVillageVenue('Tempelhofer Feld'), { venue_name: 'Tempelhofer Feld', venue_key: 'tempelhofer feld' });
});

test('punctuation-only location is treated as unknown', () => {
    assert.deepEqual(resolveVillageVenue('...'), { venue_name: null, venue_key: null });
});
