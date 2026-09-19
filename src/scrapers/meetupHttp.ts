import type { MeetUpEventNode } from './meetupVenue.js';

/**
 * Browser-free fallback for MeetUp. Group pages are server-rendered Next.js: the
 * events are embedded in the HTML as Apollo cache JSON inside <script id="__NEXT_DATA__">,
 * so a plain HTTP GET yields the same data the Playwright path intercepts — no Chromium,
 * no waiting for network idle.
 */

/**
 * Pulls upcoming Event nodes out of a group page's HTML. Returns [] if the page
 * doesn't contain the expected structure (never throws on malformed input).
 * Events already in the past are skipped so a stale cache entry can't be written as a new row.
 */
export function parseNextDataEvents(html: string, now: number = Date.now()): MeetUpEventNode[] {
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!match?.[1]) return [];

    let data: any;
    try {
        data = JSON.parse(match[1]);
    } catch {
        return [];
    }

    const apollo = data?.props?.pageProps?.__APOLLO_STATE__;
    if (!apollo || typeof apollo !== 'object') return [];

    // Apollo stores related objects (venue, group, ...) as { __ref: 'Venue:123' } pointers.
    const resolve = (v: any): any => (v && typeof v.__ref === 'string' ? apollo[v.__ref] : v);

    const nodes: MeetUpEventNode[] = [];
    for (const [key, raw] of Object.entries(apollo)) {
        if (!key.startsWith('Event:') || !raw) continue;
        const e = raw as any;
        if (!e.title || !e.dateTime || !e.eventUrl) continue;
        if (new Date(e.dateTime).getTime() < now) continue;

        const venue = resolve(e.venue);
        const node: MeetUpEventNode = {
            id: String(e.id ?? key),
            title: e.title,
            dateTime: e.dateTime,
            eventUrl: e.eventUrl,
            venue: venue && typeof venue === 'object'
                ? { name: typeof venue.name === 'string' ? venue.name : null }
                : null,
            isOnline: typeof e.isOnline === 'boolean' ? e.isOnline : null,
            eventType: typeof e.eventType === 'string' ? e.eventType : null,
        };
        if (typeof e.endTime === 'string') node.endTime = e.endTime;
        if (typeof e.going === 'number') node.going = e.going;
        if (typeof e.description === 'string') node.description = e.description;
        nodes.push(node);
    }
    return nodes;
}

export async function fetchGroupNodesViaHttp(groupUrl: string): Promise<MeetUpEventNode[]> {
    const res = await fetch(groupUrl, {
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; BerlinCultureApp/1.0)', 'accept-language': 'en' },
        signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return parseNextDataEvents(await res.text());
}
