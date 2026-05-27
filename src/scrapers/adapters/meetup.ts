import { chromium, type Page, type Response } from 'playwright';
import type { WebsiteAdapter, NormalizedEvent } from '../interfaces.js';

interface MeetUpEventNode {
    id: string;
    title: string;
    dateTime: string;
    endTime?: string;
    eventUrl: string;
    going?: number;
    description?: string;
}

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

                const context = await browser.newContext();
                const page = await context.newPage();

                try {
                    const events = await this.scrapeGroup(page, groupUrl, slug);
                    allEvents.push(...events);
                    console.log(`[${this.sourceName}][${slug}] Captured ${events.length} events.`);
                } catch (error) {
                    console.error(`[${this.sourceName}][${slug}] Group scrape failed:`, error);
                } finally {
                    await context.close();
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

        await page.goto(groupUrl, { waitUntil: 'networkidle' });

        // Give the page a moment to fire any lazy GraphQL requests
        await page.waitForTimeout(2000);

        if (capturedNodes.length > 0) {
            console.log(`[${this.sourceName}][${slug}] GraphQL interception captured ${capturedNodes.length} event node(s).`);
            return this.normalizeGraphQLNodes(capturedNodes);
        }

        console.log(`[${this.sourceName}][${slug}] GraphQL interception yielded nothing. Falling back to DOM scraping...`);
        return this.extractEventsFromDOM(page);
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

    private normalizeGraphQLNodes(nodes: MeetUpEventNode[]): NormalizedEvent[] {
        const seen = new Set<string>();

        return nodes
            .filter(node => {
                const key = `${node.title}|${node.dateTime}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .map(node => {
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

                return {
                    venue_id: this.venueId,
                    title: node.title,
                    start_time: new Date(node.dateTime).toISOString(),
                    duration,
                    event_url: node.eventUrl,
                };
            })
            .filter((e): e is NormalizedEvent => !!e.title && !!e.start_time);
    }

    /**
     * DOM fallback: scrapes event cards directly from the rendered MeetUp events page.
     */
    private async extractEventsFromDOM(page: Page): Promise<NormalizedEvent[]> {
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

        return raw.filter(
            (e): e is NormalizedEvent => !!e.title && !!e.start_time && !!e.venue_id
        );
    }
}
