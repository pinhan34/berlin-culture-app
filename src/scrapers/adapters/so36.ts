import type { WebsiteAdapter, NormalizedEvent } from '../interfaces.js';

/**
 * SO36 (Kreuzberg) — dedicated site adapter.
 *
 * SO36 sells via the "Tickettoaster" shop, whose program page is fully
 * server-rendered. Every event is a product link of the shape:
 *
 *   <a href="/produkte/92181-tickets-converge-so36-berlin-am-30-06-2026"
 *      title="Tickets CONVERGE in Berlin am 30.06.2026">…</a>
 *
 * The title attribute reliably encodes both the event name and the date, so we
 * can extract the full upcoming programme with a plain fetch (no headless
 * browser needed) — far richer and more reliable than the sparse RA listing
 * this replaces.
 */
export class So36Adapter implements WebsiteAdapter {
    sourceName = 'SO36';
    venueId = 5;
    targetUrl = 'https://www.so36.com/tickets';

    async scrape(): Promise<NormalizedEvent[]> {
        console.log(`[${this.sourceName}] Starting scrape...`);

        let html: string;
        try {
            const res = await fetch(this.targetUrl, {
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
                    'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
                },
                redirect: 'follow',
            });
            if (!res.ok) {
                console.error(`[${this.sourceName}] HTTP ${res.status} fetching programme.`);
                return [];
            }
            html = await res.text();
        } catch (error) {
            console.error(`[${this.sourceName}] Fetch failed:`, error);
            return [];
        }

        const events = this.parse(html);
        console.log(`[${this.sourceName}] Found ${events.length} events.`);
        return events;
    }

    private parse(html: string): NormalizedEvent[] {
        // Match the product anchors: capture relative url, product id, and title.
        const anchorRe =
            /<a href="(\/produkte\/(\d+)-tickets-[^"]*?am-\d\d-\d\d-\d{4})"[^>]*title="([^"]+)"/g;

        const byId = new Map<string, NormalizedEvent>();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let match: RegExpExecArray | null;
        while ((match = anchorRe.exec(html)) !== null) {
            const relUrl = match[1] ?? '';
            const productId = match[2] ?? '';
            const rawTitle = decodeEntities(match[3] ?? '');

            const dateMatch = rawTitle.match(/am (\d\d)\.(\d\d)\.(\d{4})/);
            if (!dateMatch) continue;
            const [, dd, mm, yyyy] = dateMatch;

            // Clean the event name out of "Tickets <NAME> in Berlin am DD.MM.YYYY".
            const name = rawTitle
                .replace(/^Tickets\s+/i, '')
                .replace(/\s+in Berlin am \d\d\.\d\d\.\d{4}\s*$/i, '')
                .trim();
            if (!name || name.length < 2) continue;

            // Default door/start time: SO36 doesn't expose it on the listing.
            // ~20:00 local (Berlin) ≈ 18:00 UTC during summer time.
            const startISO = `${yyyy}-${mm}-${dd}T18:00:00.000Z`;
            const eventDate = new Date(startISO);
            if (Number.isNaN(eventDate.getTime())) continue;
            if (eventDate.getTime() < today.getTime()) continue; // skip past events

            byId.set(productId, {
                venue_id: this.venueId,
                title: name,
                start_time: eventDate.toISOString(),
                duration: null,
                event_url: `https://www.so36.com${relUrl}`,
            });
        }

        return [...byId.values()];
    }
}

function decodeEntities(s: string): string {
    return s
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&#039;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&auml;/g, 'ä')
        .replace(/&ouml;/g, 'ö')
        .replace(/&uuml;/g, 'ü')
        .replace(/&Auml;/g, 'Ä')
        .replace(/&Ouml;/g, 'Ö')
        .replace(/&Uuml;/g, 'Ü')
        .replace(/&szlig;/g, 'ß')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}
