import type { WebsiteAdapter, NormalizedEvent } from '../interfaces.js';

/**
 * Festsaal Kreuzberg — dedicated site adapter.
 *
 * The public site is a Nuxt SPA, but it's powered by a headless Wagtail CMS
 * whose REST API is openly readable at admin.festsaal-kreuzberg.de. Each event
 * is a `home.EventPage` with clean structured fields (date, start, ticket, …),
 * so we read the API directly — no headless browser, and far richer/more
 * reliable than the sparse RA listing this replaces.
 *
 * The CMS only retains upcoming events, but rescheduled ("moved") events keep
 * their original past date for sorting, so we page through everything and filter
 * by the *effective* date (the new date when moved) rather than stopping early.
 */

const API_BASE = 'https://admin.festsaal-kreuzberg.de/api/v2/pages/';
const PAGE_SIZE = 20;
const MAX_PAGES = 30; // safety cap (≈600 events) so we never loop forever

interface WagtailEvent {
    title: string;
    sub_title?: string | null;
    date?: string | null;            // "YYYY-MM-DD"
    start?: string | null;           // "HH:MM:SS"
    doors?: string | null;           // "HH:MM:SS"
    changed_date?: string | null;
    changed_start?: string | null;
    moved?: boolean;
    ticket?: string | null;
    meta?: { html_url?: string | null } | null;
}

export class FestsaalKreuzbergAdapter implements WebsiteAdapter {
    sourceName = 'Festsaal Kreuzberg';
    venueId = 9;
    targetUrl = 'https://festsaal-kreuzberg.de/en/';

    async scrape(): Promise<NormalizedEvent[]> {
        console.log(`[${this.sourceName}] Starting scrape...`);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const out = new Map<string, NormalizedEvent>();

        try {
            for (let pageIdx = 0; pageIdx < MAX_PAGES; pageIdx++) {
                const offset = pageIdx * PAGE_SIZE;
                const url =
                    `${API_BASE}?type=home.EventPage` +
                    `&fields=title,sub_title,date,start,doors,changed_date,changed_start,moved,ticket` +
                    `&order=-date&limit=${PAGE_SIZE}&offset=${offset}`;

                const res = await fetch(url, {
                    headers: {
                        'User-Agent':
                            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
                        Accept: 'application/json',
                    },
                });
                if (!res.ok) {
                    console.error(`[${this.sourceName}] HTTP ${res.status} on page ${pageIdx}.`);
                    break;
                }

                const json = (await res.json()) as { items?: WagtailEvent[] };
                const items = json.items ?? [];
                if (items.length === 0) break;

                for (const item of items) {
                    const dateStr = (item.moved && item.changed_date) ? item.changed_date : item.date;
                    if (!dateStr) continue;

                    const eventDay = new Date(`${dateStr}T00:00:00Z`);
                    if (Number.isNaN(eventDay.getTime())) continue;

                    // Skip genuinely past events (moved events use their new date above).
                    if (eventDay.getTime() < today.getTime()) continue;

                    const timeStr =
                        (item.moved && item.changed_start) ||
                        item.start ||
                        item.doors ||
                        '19:00:00';

                    const startISO = berlinToUTCISO(dateStr, timeStr);
                    if (!startISO) continue;

                    const title = (item.title || '').trim();
                    if (!title) continue;

                    const publicUrl = item.meta?.html_url
                        ? item.meta.html_url.replace(
                              'admin.festsaal-kreuzberg.de',
                              'festsaal-kreuzberg.de',
                          )
                        : item.ticket || this.targetUrl;

                    const key = `${title}|${startISO}`;
                    out.set(key, {
                        venue_id: this.venueId,
                        title,
                        start_time: startISO,
                        duration: null,
                        event_url: publicUrl,
                    });
                }

                if (items.length < PAGE_SIZE) break; // last page
            }
        } catch (error) {
            console.error(`[${this.sourceName}] Scrape failed:`, error);
        }

        const events = [...out.values()];
        console.log(`[${this.sourceName}] Found ${events.length} events.`);
        return events;
    }
}

/** Returns the offset of Europe/Berlin from UTC, in minutes, for a given instant. */
function berlinOffsetMinutes(date: Date): number {
    try {
        const label = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Europe/Berlin',
            timeZoneName: 'shortOffset',
        }).format(date);
        const m = label.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
        if (m) {
            const hours = Number(m[1]);
            const mins = Number(m[2] ?? '0');
            return hours * 60 + (hours < 0 ? -mins : mins);
        }
    } catch {
        // ignore — fall through to default
    }
    return 120; // default to CEST
}

/** Interpret a Berlin-local date + time as a UTC ISO string. */
function berlinToUTCISO(dateStr: string, timeStr: string): string | null {
    const dm = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!dm) return null;
    const tm = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    const hh = tm ? Number(tm[1]) : 19;
    const mi = tm ? Number(tm[2]) : 0;
    const ss = tm && tm[3] ? Number(tm[3]) : 0;

    const y = Number(dm[1]);
    const mo = Number(dm[2]);
    const d = Number(dm[3]);

    const guessUTC = Date.UTC(y, mo - 1, d, hh, mi, ss);
    const offset = berlinOffsetMinutes(new Date(guessUTC));
    const real = new Date(guessUTC - offset * 60_000);
    return Number.isNaN(real.getTime()) ? null : real.toISOString();
}
