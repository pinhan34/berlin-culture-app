import { chromium, type Page } from 'playwright';
import type { WebsiteAdapter, NormalizedEvent } from '../interfaces.js';

export class SinemaTranstopiaAdapter implements WebsiteAdapter {
    sourceName = 'Sinema Transtopia';
    venueId = 1; // Maps directly to your internal database sequence primary key
    targetUrl = 'https://sinematranstopia.com/en/calendar';

    async scrape(): Promise<NormalizedEvent[]> {
        console.log(`[${this.sourceName}] Starting scrape...`);

        const headless = process.env['DEBUG_HEADED'] !== '1';
        const browser = await chromium.launch({ headless });
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            await page.goto(this.targetUrl, { waitUntil: 'domcontentloaded' });
            await page.waitForSelector('ul.calendar-list li, .program-list li', { timeout: 10000 });

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
            const listings = document.querySelectorAll('ul.calendar-list li, .program-list li');
            const batch: any[] = [];
            const currentYear = new Date().getFullYear();

            const months: { [key: string]: string } = {
                Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
                Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
            };

            listings.forEach((element) => {
                const linkElement = element.querySelector('a:not([href*="tickets"])') as HTMLAnchorElement;
                const titleText = linkElement?.textContent?.trim().replace(/\.\s*$/, '');
                const dateSpan = element.querySelector('.date, span')?.textContent?.trim();
                const ticketElement = element.querySelector('a[href*="tickets"], a[href*="kinotickets"]') as HTMLAnchorElement;

                if (!titleText || !dateSpan) return;

                const dateMatch = dateSpan.match(/([A-Za-z]+)\s+(\d{1,2})\.\s+[A-Za-z]+\.\s+(\d{2}):(\d{2})/);
                if (!dateMatch) return;

                const [_, monthName, day, hour, minute] = dateMatch;
                const monthNum = months[monthName?.substring(0, 3) ?? ''];
                if (!monthNum) return;

                const formattedDay = day?.padStart(2, '0') ?? '';
                const parsedISOString = new Date(
                    `${currentYear}-${monthNum}-${formattedDay}T${hour}:${minute}:00Z`
                ).toISOString();

                batch.push({
                    venue_id: venueId,
                    title: titleText,
                    start_time: parsedISOString,
                    duration: null,
                    event_url: ticketElement?.href ?? linkElement?.href ?? 'https://sinematranstopia.com/en/calendar'
                });
            });

            return batch;
        }, this.venueId);

        return raw.filter(
            (e): e is NormalizedEvent => !!e.title && !!e.start_time && !!e.venue_id
        );
    }
}