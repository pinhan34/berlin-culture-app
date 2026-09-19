import { chromium, type Page, type Response } from 'playwright';
import type { WebsiteAdapter, NormalizedEvent } from '../interfaces.js';
import { resolveMeetupVenue, type MeetUpEventNode } from '../meetupVenue.js';
import { fetchGroupNodesViaHttp } from '../meetupHttp.js';

const MAX_ATTEMPTS = 2;           // browser attempts per group, on a thrown error
const RETRY_BACKOFF_MS = 5_000;   // wait before the next browser attempt
const GOTO_TIMEOUT_MS = 30_000;
const GQL_WAIT_MS = 15_000;       // how long to wait for the first /gql event data after DOM load
const GQL_SETTLE_MS = 2_000;      // extra time after the first hit, so later /gql calls are captured too

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export class MeetUpAdapter implements WebsiteAdapter {
    sourceName = 'MeetUp';
    venueId: number;
    targetUrl = 'https://www.meetup.com';
    private groupSlugs: string[];

    constructor(venueId: number, groupSlugs: string[]) {
        this.venueId = venueId;
        this.groupSlugs = groupSlugs;
    }

    async scrape(): Promise<NormalizedEvent[]> {
        console.log(`[${this.sourceName}] Starting scrape for ${this.groupSlugs.length} group(s)...`);

        const headless = process.env['DEBUG_HEADED'] !== '1';
        const browser = await chromium.launch({ headless });
        const allEvents: NormalizedEvent[] = [];

        try {
            for (const slug of this.groupSlugs) {
                const groupUrl = `${this.targetUrl}/${slug}/events/`;
                console.log(`[${this.sourceName}] Scraping group: ${slug} → ${groupUrl}`);

                let events: NormalizedEvent[] | null = null;
                for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
                    // Fresh context per attempt so a retry doesn't inherit a stuck page or cookies.
                    const context = await browser.newContext();
                    const page = await context.newPage();
                    try {
                        events = await this.scrapeGroup(page, groupUrl, slug);
                        break;
                    } catch (error) {
                        const reason = error instanceof Error ? error.message.split('\n')[0] : String(error);
                        console.error(`[${this.sourceName}][${slug}] Attempt ${attempt}/${MAX_ATTEMPTS} failed: ${reason}`);
                    } finally {
                        await context.close();
                    }
                    if (attempt < MAX_ATTEMPTS) await sleep(RETRY_BACKOFF_MS * attempt);
                }

                // Browser path failed or found nothing -> try the browser-free HTTP fallback.
                if (!events || events.length === 0) {
                    console.log(`[${this.sourceName}][${slug}] Browser path ${events ? 'found nothing' : 'failed'}; trying HTTP fallback...`);
                    try {
                        const nodes = await fetchGroupNodesViaHttp(groupUrl);
                        events = this.normalizeGraphQLNodes(nodes, slug);
                        console.log(`[${this.sourceName}][${slug}] HTTP fallback captured ${events.length} events.`);
                    } catch (error) {
                        const reason = error instanceof Error ? error.message.split('\n')[0] : String(error);
                        console.error(`[${this.sourceName}][${slug}] HTTP fallback failed: ${reason}`);
                    }
                }

                if (events && events.length > 0) {
                    allEvents.push(...events);
                    console.log(`[${this.sourceName}][${slug}] Captured ${events.length} events.`);
                } else {
                    console.error(`[${this.sourceName}][${slug}] No events obtained for this group.`);
                }
            }

            console.log(`[${this.sourceName}] Total events across all groups: ${allEvents.length}`);
            return allEvents;
        } finally {
            await browser.close();
        }
    }

    private async scrapeGroup(page: Page, groupUrl: string, slug: string): Promise<NormalizedEvent[]> {
        const capturedNodes: MeetUpEventNode[] = [];

        page.on('response', async (response: Response) => {
            const url = response.url();
            if (!url.includes('/gql')) return;

            try {
                const json = await response.json();
                const nodes = this.extractNodesFromGraphQL(json);
                capturedNodes.push(...nodes);
            } catch {
                // Not a JSON response or parsing failed — skip silently
            }
        });

        try {
            // 'domcontentloaded', not 'networkidle': MeetUp keeps background requests going,
            // so the network can stay "busy" past the timeout even on a fully loaded page.
            const response = await page.goto(groupUrl, { waitUntil: 'domcontentloaded', timeout: GOTO_TIMEOUT_MS });
            console.log(`[${this.sourceName}][${slug}] HTTP ${response?.status() ?? '?'} (DOM loaded). Waiting for event data...`);

            // Wait for the first /gql event payload, then a short settle for any later ones.
            const deadline = Date.now() + GQL_WAIT_MS;
            while (capturedNodes.length === 0 && Date.now() < deadline) {
                await page.waitForTimeout(500);
            }
            if (capturedNodes.length > 0) await page.waitForTimeout(GQL_SETTLE_MS);
        } catch (error) {
            // Diagnostics: what did we actually get? (block/challenge pages show up in the title)
            const title = await page.title().catch(() => '?');
            console.error(`[${this.sourceName}][${slug}] Diagnostics: url=${page.url()} title="${title}"`);
            throw error;
        }

        if (capturedNodes.length > 0) {
            console.log(`[${this.sourceName}][${slug}] GraphQL interception captured ${capturedNodes.length} event node(s).`);
            return this.normalizeGraphQLNodes(capturedNodes, slug);
        }

        console.log(`[${this.sourceName}][${slug}] GraphQL interception yielded nothing. Falling back to DOM scraping...`);
        return this.extractEventsFromDOM(page, slug);
    }

    /**
     * Recursively walks a GraphQL response looking for arrays of objects
     * that contain the shape of a MeetUp event node (title + dateTime + eventUrl).
     */
    private extractNodesFromGraphQL(payload: any): MeetUpEventNode[] {
        const results: MeetUpEventNode[] = [];

        if (Array.isArray(payload)) {
            for (const item of payload) {
                results.push(...this.extractNodesFromGraphQL(item));
            }
            return results;
        }

        if (payload && typeof payload === 'object') {
            if (payload.title && payload.dateTime && payload.eventUrl) {
                results.push({
                    id: payload.id ?? '',
                    title: payload.title,
                    dateTime: payload.dateTime,
                    endTime: payload.endTime,
                    eventUrl: payload.eventUrl,
                    going: payload.going,
                    description: typeof payload.description === 'string' ? payload.description : undefined,
                    venue: payload.venue && typeof payload.venue === 'object' ? payload.venue : null,
                    isOnline: typeof payload.isOnline === 'boolean' ? payload.isOnline : null,
                    eventType: typeof payload.eventType === 'string' ? payload.eventType : null,
                });
                return results;
            }

            // Traverse edges/node pattern
            if (payload.edges && Array.isArray(payload.edges)) {
                for (const edge of payload.edges) {
                    if (edge.node) {
                        results.push(...this.extractNodesFromGraphQL(edge.node));
                    }
                }
            }

            for (const value of Object.values(payload)) {
                if (value && typeof value === 'object') {
                    results.push(...this.extractNodesFromGraphQL(value));
                }
            }
        }

        return results;
    }

    private normalizeGraphQLNodes(nodes: MeetUpEventNode[], slug: string): NormalizedEvent[] {
        const seen = new Set<string>();

        return nodes
            .filter(node => {
                const key = `${node.title}|${node.dateTime}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .map((node): NormalizedEvent => {
                let duration: string | null = null;
                if (node.endTime) {
                    const startMs = new Date(node.dateTime).getTime();
                    const endMs = new Date(node.endTime).getTime();
                    const diffMinutes = Math.round((endMs - startMs) / 60_000);
                    if (diffMinutes > 0) {
                        const hours = Math.floor(diffMinutes / 60);
                        const mins = diffMinutes % 60;
                        duration = hours > 0
                            ? (mins > 0 ? `${hours} hour${hours > 1 ? 's' : ''} ${mins} mins` : `${hours} hour${hours > 1 ? 's' : ''}`)
                            : `${mins} mins`;
                    }
                }

                const description = node.description
                    ? node.description.replace(/\s+/g, ' ').trim().slice(0, 800) || null
                    : null;

                return {
                    venue_id: this.venueId,
                    title: node.title,
                    start_time: new Date(node.dateTime).toISOString(),
                    duration,
                    event_url: (node.eventUrl as string | null) ?? null,
                    description,
                    source: `meetup:${slug}`,
                    ...resolveMeetupVenue(node),
                };
            })
            .filter((e): e is NormalizedEvent => !!e.title && !!e.start_time);
    }

    /**
     * DOM fallback: scrapes event cards directly from the rendered MeetUp events page.
     */
    private async extractEventsFromDOM(page: Page, slug: string): Promise<NormalizedEvent[]> {
        const raw = await page.evaluate((venueId: number) => {
            const cards = document.querySelectorAll('[id^="event-card"]');
            const batch: any[] = [];

            cards.forEach(card => {
                const linkEl = card.querySelector('a[href*="/events/"]') as HTMLAnchorElement;
                const titleEl = card.querySelector('span, h2, h3');
                const timeEl = card.querySelector('time');

                const title = titleEl?.textContent?.trim();
                const dateTimeAttr = timeEl?.getAttribute('datetime');
                const eventUrl = linkEl?.href;

                if (!title || !dateTimeAttr) return;

                batch.push({
                    venue_id: venueId,
                    title,
                    start_time: new Date(dateTimeAttr).toISOString(),
                    duration: null,
                    event_url: eventUrl ?? '',
                });
            });

            return batch;
        }, this.venueId);

        return raw
            .filter((e: any): e is NormalizedEvent => !!e.title && !!e.start_time && !!e.venue_id)
            .map((e: NormalizedEvent) => ({ ...e, source: `meetup:${slug}` }));
    }
}
