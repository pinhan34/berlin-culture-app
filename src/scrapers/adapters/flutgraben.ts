import { chromium, type Page } from 'playwright';
import type { WebsiteAdapter, NormalizedEvent } from '../interfaces.js';

export class FlutgrabenAdapter implements WebsiteAdapter {
    sourceName = 'Flutgraben';
    venueId = 6;
    targetUrl = 'https://flutgraben.org/en/';

    async scrape(): Promise<NormalizedEvent[]> {
        console.log(`[${this.sourceName}] Starting scrape...`);

        const headless = process.env['DEBUG_HEADED'] !== '1';
        const browser = await chromium.launch({ headless });
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            await page.goto(this.targetUrl, { waitUntil: 'networkidle', timeout: 30000 });

            await page.waitForSelector('article, .post, .news-item, .entry, main', {
                timeout: 10000,
            }).catch(() => {
                console.log(`[${this.sourceName}] Content selector wait timed out, proceeding with available DOM...`);
            });

            const events = await this.extractEventsFromDOM(page);

            console.log(`[${this.sourceName}] Found ${events.length} events.`);
            return events;
        } catch (error) {
            console.error(`[${this.sourceName}] Scrape failed:`, error);
            return [];
        } finally {
            await browser.close();
        }
    }

    private async extractEventsFromDOM(page: Page): Promise<NormalizedEvent[]> {
        const raw = await page.evaluate((venueId: number) => {
            const batch: any[] = [];
            const seen = new Set<string>();

            // Flutgraben lists events as news/post blocks with dates in the text
            // Try structured elements first, then fall back to scanning all text blocks
            const containers = document.querySelectorAll(
                'article, .post, .news-item, .entry, .event, section, main > div'
            );

            // Date patterns: "12.07.2025", "12.-20.07.2025", "27th of June 2025"
            const germanDateRegex = /(\d{1,2})[\.\-](?:\d{1,2}[\.\-])?(\d{2})\.(\d{4})/;
            const englishDateRegex = /(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([A-Za-z]+)\s+(\d{4})/;
            const isoDateRegex = /(\d{4})-(\d{2})-(\d{2})/;

            const months: Record<string, string> = {
                january: '01', february: '02', march: '03', april: '04',
                may: '05', june: '06', july: '07', august: '08',
                september: '09', october: '10', november: '11', december: '12',
            };

            const timeRegex = /(\d{1,2}):(\d{2})/;

            containers.forEach(container => {
                const text = container.textContent || '';
                if (text.length < 10 || text.length > 5000) return;

                // Try to find a date in the text
                let year = '', month = '', day = '';

                const germanMatch = text.match(germanDateRegex);
                const englishMatch = text.match(englishDateRegex);
                const isoMatch = text.match(isoDateRegex);

                if (isoMatch) {
                    year = isoMatch[1] ?? '';
                    month = isoMatch[2] ?? '';
                    day = isoMatch[3] ?? '';
                } else if (germanMatch) {
                    day = (germanMatch[1] ?? '').padStart(2, '0');
                    month = (germanMatch[2] ?? '').padStart(2, '0');
                    year = germanMatch[3] ?? '';
                } else if (englishMatch) {
                    day = (englishMatch[1] ?? '').padStart(2, '0');
                    const monthName = (englishMatch[2] ?? '').toLowerCase();
                    month = months[monthName] ?? '';
                    year = englishMatch[3] ?? '';
                }

                if (!year || !month || !day) return;

                // Extract time if available
                const timeMatch = text.match(timeRegex);
                const hour = timeMatch?.[1]?.padStart(2, '0') ?? '18';
                const minute = timeMatch?.[2] ?? '00';

                // Only include future or current events
                const eventDate = new Date(`${year}-${month}-${day}`);
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                if (eventDate.getTime() < now.getTime()) return;

                // Prefer specific headings (h2/h3) over generic h1 ("News")
                const headingEl = container.querySelector('h2, h3, h4')
                    ?? container.querySelector('strong')
                    ?? container.querySelector('a[href*="/entry/"]');
                let title = headingEl?.textContent?.trim() ?? '';

                // If no heading found, use first non-empty line of text
                if (!title || title.length < 3) {
                    const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l.length > 3);
                    title = lines[0]?.substring(0, 120) ?? '';
                }
                if (!title || title.length < 3) return;

                // Extract link
                const linkEl = container.querySelector('a[href]') as HTMLAnchorElement;
                const eventUrl = linkEl?.href ?? 'https://flutgraben.org/en/';

                const key = `${title}|${year}-${month}-${day}`;
                if (seen.has(key)) return;
                seen.add(key);

                try {
                    const parsedISOString = new Date(
                        `${year}-${month}-${day}T${hour}:${minute}:00Z`
                    ).toISOString();

                    batch.push({
                        venue_id: venueId,
                        title,
                        start_time: parsedISOString,
                        duration: null,
                        event_url: eventUrl,
                    });
                } catch {
                    // Invalid date — skip
                }
            });

            return batch;
        }, this.venueId);

        return raw.filter(
            (e): e is NormalizedEvent => !!e.title && !!e.start_time && !!e.venue_id
        );
    }
}
