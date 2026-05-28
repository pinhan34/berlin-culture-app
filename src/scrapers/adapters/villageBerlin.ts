import type { WebsiteAdapter, NormalizedEvent } from '../interfaces.js';

interface VillageEvent {
    occurrence_id: string;
    id: number;
    title: string;
    event_date: string;
    event_end: string | null;
    location: string;
    permalink: string;
    short_description: string;
    categories: { id: number; slug: string; name: string }[];
    tags: { id: number; slug: string; name: string }[];
}

interface VillageEventsResponse {
    timezone: string;
    currency: string;
    generated_at: string;
    events: VillageEvent[];
}

export class VillageBerlinAdapter implements WebsiteAdapter {
    sourceName = 'Village Berlin';
    venueId = 3;
    targetUrl = 'https://wearevillage.org/wp-json/village/v1/events';

    async scrape(): Promise<NormalizedEvent[]> {
        console.log(`[${this.sourceName}] Starting scrape via REST API...`);

        try {
            const today = new Date().toISOString().slice(0, 10);
            const url = `${this.targetUrl}?lang=en&from=${today}&per_page=200`;

            const res = await fetch(url, {
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(20_000),
            });

            if (!res.ok) {
                console.error(`[${this.sourceName}] API responded ${res.status}`);
                return [];
            }

            const data: VillageEventsResponse = await res.json();
            const events = this.normalize(data.events);

            console.log(`[${this.sourceName}] Found ${events.length} events.`);
            return events;
        } catch (error) {
            console.error(`[${this.sourceName}] Scrape failed:`, error);
            return [];
        }
    }

    private normalize(raw: VillageEvent[]): NormalizedEvent[] {
        return raw
            .filter((e) => e.title && e.event_date && e.permalink)
            .map((e) => ({
                venue_id: this.venueId,
                title: this.decodeHtml(e.title),
                start_time: new Date(e.event_date).toISOString(),
                duration: this.extractDuration(e),
                event_url: e.permalink,
            }));
    }

    private extractDuration(e: VillageEvent): string | null {
        if (!e.event_end) return null;
        const start = new Date(e.event_date).getTime();
        const end = new Date(e.event_end).getTime();
        const diffMs = end - start;
        if (diffMs <= 0) return null;

        const hours = Math.floor(diffMs / 3_600_000);
        const mins = Math.round((diffMs % 3_600_000) / 60_000);
        const parts: string[] = [];
        if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
        if (mins > 0) parts.push(`${mins} min${mins > 1 ? 's' : ''}`);
        return parts.join(' ') || null;
    }

    private decodeHtml(text: string): string {
        return text
            .replace(/&#8211;/g, '–')
            .replace(/&#8212;/g, '—')
            .replace(/&#8216;/g, '\u2018')
            .replace(/&#8217;/g, '\u2019')
            .replace(/&#8220;/g, '\u201C')
            .replace(/&#8221;/g, '\u201D')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&nbsp;/g, ' ');
    }
}
