import { chromium, type Page } from 'playwright';
import type { WebsiteAdapter, NormalizedEvent } from '../interfaces.js';

export class VillageBerlinAdapter implements WebsiteAdapter {
    sourceName = 'Village Berlin';
    venueId = 3;
    targetUrl = 'https://wearevillage.org/en/calendar/';

    async scrape(): Promise<NormalizedEvent[]> {
        console.log(`[${this.sourceName}] Starting scrape...`);

        const headless = process.env['DEBUG_HEADED'] !== '1';
        const browser = await chromium.launch({ headless });
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            await page.goto(this.targetUrl, { waitUntil: 'networkidle', timeout: 30000 });

            // Wait for actual content to render — the site is slow / JS-heavy
            await page.waitForSelector('p, li', { timeout: 15000 }).catch(() => {
                console.log(`[${this.sourceName}] Selector wait timed out, proceeding with available DOM...`);
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
            const elements = document.querySelectorAll('p, li');
            const batch: any[] = [];

            elements.forEach((element) => {
                const text = element.textContent || '';

                const dateRegex = /(\d{2})\.(\d{2})\.(\d{4})(?:\s*-\s*(\d{2}):(\d{2}))?/;
                const match = text.match(dateRegex);

                if (!match) return;

                const [fullDateMatch, day, month, year, hour, minute] = match;
                if (!fullDateMatch || !day || !month || !year) return;

                let titleText = text.split(fullDateMatch)[0]?.replace(/^[-\s•]+/, '').trim() ?? '';
                if (titleText.endsWith('.')) titleText = titleText.slice(0, -1).trim();

                if (!titleText || titleText.length < 3 || titleText.includes('Calendar for App')) return;

                const finalHour = hour || '19';
                const finalMinute = minute || '00';

                const parsedISOString = new Date(
                    `${year}-${month}-${day}T${finalHour}:${finalMinute}:00Z`
                ).toISOString();

                // Look for any link within this element or its parent container
                const linkEl = element.querySelector('a[href]') as HTMLAnchorElement
                    ?? (element.closest('div, section, article')?.querySelector('a[href]') as HTMLAnchorElement);
                const eventUrl = linkEl?.href ?? 'https://wearevillage.org/en/calendar/';

                batch.push({
                    venue_id: venueId,
                    title: titleText,
                    start_time: parsedISOString,
                    duration: null,
                    event_url: eventUrl,
                });
            });

            return batch;
        }, this.venueId);

        return raw.filter(
            (e): e is NormalizedEvent => !!e.title && !!e.start_time && !!e.venue_id
        );
    }
}
