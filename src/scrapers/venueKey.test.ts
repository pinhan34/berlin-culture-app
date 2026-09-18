// Unit tests for the Phase 2 venue-key normalizer (imports the real module,
// unlike frontend's self-contained classifier tests, since this project
// already runs everything through ts-node/esm).
// Run with: node --loader ts-node/esm src/scrapers/venueKey.test.ts

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeVenueKey, slugify } from './venueKey.js';

test('normalizeVenueKey lowercases', () => {
    assert.equal(normalizeVenueKey('Tresor'), 'tresor');
});

test('normalizeVenueKey strips accents', () => {
    assert.equal(normalizeVenueKey('Café Cralle'), 'cafe cralle');
});

test('normalizeVenueKey treats accented and unaccented spellings as the same key', () => {
    assert.equal(normalizeVenueKey('Café Cralle'), normalizeVenueKey('Cafe Cralle'));
});

test('normalizeVenueKey strips punctuation', () => {
    assert.equal(normalizeVenueKey("Schwuz!"), 'schwuz');
});

test('normalizeVenueKey collapses whitespace', () => {
    assert.equal(normalizeVenueKey('  silent   green  '), 'silent green');
});

test('slugify hyphenates for use in a source string', () => {
    assert.equal(slugify('QUEER EVENTS Berlin'), 'queer-events-berlin');
});

test('slugify matches the spec example exactly', () => {
    assert.equal(`telegram:${slugify('QUEER EVENTS Berlin')}`, 'telegram:queer-events-berlin');
});
