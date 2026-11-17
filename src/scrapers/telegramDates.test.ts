// Unit tests for Telegram date parsing: dates without a year, "tomorrow" and weekdays
// must be worked out from the day the message was POSTED, not the day the scraper runs.
// Run with: node --loader ts-node/esm src/scrapers/telegramDates.test.ts

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TelegramGroupAdapter } from './adapters/telegram.js';

// parseDate is private; `as any` lets the test call it directly.
const adapter = new TelegramGroupAdapter(7, []) as any;

// Noon local time, so time zones can't push the date onto the previous/next day.
const posted = (year: number, month: number, day: number) => new Date(year, month - 1, day, 12);

test('a date without a year stays in the year it was posted (the September bug)', () => {
    // Posted 15 Sep about 20 Sep: must be 2026, no matter when the scraper reads it later.
    assert.deepEqual(adapter.parseDate('Workshop on 20 September', posted(2026, 9, 15)), {
        year: '2026', month: '09', day: '20',
    });
});

test('a January date posted in late December still rolls over to next year', () => {
    assert.deepEqual(adapter.parseDate('Party on 8 January', posted(2026, 12, 28)), {
        year: '2027', month: '01', day: '08',
    });
});

test('German date without a year uses the posting year (real post from the database)', () => {
    assert.deepEqual(adapter.parseDate('Diesen Donnerstag, 25.6., 18.30-20Uhr', posted(2026, 6, 21)), {
        year: '2026', month: '06', day: '25',
    });
});

test('"tomorrow" is the day after the post', () => {
    // Posted Monday 16 Nov 2026.
    assert.deepEqual(adapter.parseDate('Rave tomorrow at Tresor', posted(2026, 11, 16)), {
        year: '2026', month: '11', day: '17',
    });
});

test('"this Friday" is the Friday after the post', () => {
    // Posted Monday 16 Nov 2026, so "this Friday" is 20 Nov.
    assert.deepEqual(adapter.parseDate('Drag night this Friday at SO36', posted(2026, 11, 16)), {
        year: '2026', month: '11', day: '20',
    });
});

test('safety rule: a date just before the post is dropped, not pushed a year ahead', () => {
    // Posted 25 Oct about 22 Oct: the year guess jumps to 2027, ~12 months after the post.
    const text = 'Rave on 22 October was amazing, photos here: https://example.com/rave';
    assert.equal(adapter.extractEvent(text, 'telegram:test', posted(2026, 10, 25)), null);
});

test('safety rule: a normal upcoming event is still kept', () => {
    // Posted today about an event 10 days from now: well inside the window.
    const today = new Date();
    const inTenDays = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000);
    const monthName = inTenDays.toLocaleString('en-US', { month: 'long' });
    const text = `Party on ${inTenDays.getDate()} ${monthName}, tickets: https://example.com/party`;
    assert.notEqual(adapter.extractEvent(text, 'telegram:test', today), null);
});
