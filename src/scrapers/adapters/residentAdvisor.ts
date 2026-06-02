import type { WebsiteAdapter, NormalizedEvent } from '../interfaces.js';

interface RAVenueConfig {
    clubId: string;
    name: string;
    venueId: number;
    keywords: RegExp;
}

interface RAEventData {
    id: string;
    title: string;
    contentUrl: string;
    startTime?: string;
    endTime?: string;
    date?: string;
    venue?: { id: string; name: string };
}

const RA_GRAPHQL_URL = 'https://ra.co/graphql';

const LISTING_QUERY = `query GET_DEFAULT_EVENTS_LISTING($indices: [IndexType!], $pageSize: Int, $page: Int, $aggregations: [ListingAggregationType!], $filters: [FilterInput]) {
    listing(indices: $indices, pageSize: $pageSize, page: $page, aggregations: $aggregations, filters: $filters) {
        data {
            ... on Event {
                id title contentUrl startTime endTime date
                venue { id name }
            }
        }
        totalResults
    }
}`;

export class ResidentAdvisorAdapter implements WebsiteAdapter {
    sourceName = 'Resident Advisor';
    venueId = 0;
    targetUrl = 'https://ra.co';
    private venues: RAVenueConfig[];

    constructor(venues: RAVenueConfig[]) {
        this.venues = venues;
    }

    async scrape(): Promise<NormalizedEvent[]> {
        console.log(`[${this.sourceName}] Starting scrape for ${this.venues.length} venue(s)...`);

        const allEvents: NormalizedEvent[] = [];

        for (const venue of this.venues) {
            try {
                const events = await this.fetchVenueEvents(venue);
                allEvents.push(...events);
                console.log(`[${this.sourceName}][${venue.name}] Captured ${events.length} filtered events.`);
            } catch (error) {
                console.error(`[${this.sourceName}][${venue.name}] Venue scrape failed:`, error);
            }
        }

        console.log(`[${this.sourceName}] Total filtered events across all venues: ${allEvents.length}`);
        return allEvents;
    }

    private async fetchVenueEvents(venue: RAVenueConfig): Promise<NormalizedEvent[]> {
        const today = new Date().toISOString().split('T')[0];

        const body = JSON.stringify({
            operationName: 'GET_DEFAULT_EVENTS_LISTING',
            variables: {
                indices: ['EVENT'],
                pageSize: 50,
                page: 1,
                aggregations: [],
                filters: [
                    { type: 'CLUB', value: venue.clubId },
                    { type: 'DATERANGE', value: JSON.stringify({ gte: today }) },
                ],
            },
            query: LISTING_QUERY,
        });

        const resp = await fetch(RA_GRAPHQL_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': `https://ra.co/clubs/${venue.clubId}`,
                'Origin': 'https://ra.co',
            },
            body,
        });

        if (!resp.ok) {
            throw new Error(`RA API returned ${resp.status} ${resp.statusText}`);
        }

        const json = await resp.json();
        const rawEvents: RAEventData[] = json.data?.listing?.data ?? [];
        const totalResults: number = json.data?.listing?.totalResults ?? 0;

        console.log(`[${this.sourceName}][${venue.name}] API returned ${rawEvents.length} of ${totalResults} total upcoming events.`);

        return this.normalizeAndFilter(rawEvents, venue);
    }

    private normalizeAndFilter(events: RAEventData[], venue: RAVenueConfig): NormalizedEvent[] {
        const seen = new Set<string>();

        return events
            .filter(event => {
                if (!venue.keywords.test(event.title)) return false;

                const key = `${event.title}|${event.startTime ?? event.date ?? ''}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .map(event => {
                const startTime = event.startTime ?? event.date;
                if (!startTime) return null;

                let duration: string | null = null;
                if (event.startTime && event.endTime) {
                    const startMs = new Date(event.startTime).getTime();
                    const endMs = new Date(event.endTime).getTime();
                    let diffMinutes = Math.round((endMs - startMs) / 60_000);
                    if (diffMinutes < 0) diffMinutes += 24 * 60;
                    if (diffMinutes > 0) {
                        const hours = Math.floor(diffMinutes / 60);
                        const mins = diffMinutes % 60;
                        duration = hours > 0
                            ? (mins > 0 ? `${hours} hour${hours > 1 ? 's' : ''} ${mins} mins` : `${hours} hour${hours > 1 ? 's' : ''}`)
                            : `${mins} mins`;
                    }
                }

                const eventUrl = event.contentUrl
                    ? `https://ra.co${event.contentUrl}`
                    : `https://ra.co/clubs/${venue.clubId}`;

                return {
                    venue_id: venue.venueId,
                    title: event.title,
                    start_time: new Date(startTime).toISOString(),
                    duration,
                    event_url: eventUrl as string | null,
                };
            })
            .filter((e): e is NormalizedEvent => e !== null && !!e.title && !!e.start_time);
    }
}
