import { chromium, type Page } from 'playwright';
import type { WebsiteAdapter, NormalizedEvent } from '../interfaces.js';

export class NeuroDivergentAdapter implements WebsiteAdapter {
    sourceName = 'Neurodivergent Berlin';
    venueId = 4;
    targetUrl = 'https://www.neurodivergent-berlin.com/events';

    async scrape(): Promise<NormalizedEvent[]> {
        console.log(`[${this.sourceName}] Starting scrape...`);

        const headless = process.env['DEBUG_HEADED'] !== '1';
        const browser = await chromium.launch({ headless });
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            await page.goto(this.targetUrl, { waitUntil: 'domcontentloaded' });

            await page.waitForSelector('article, .eventlist-event, .summary-item, .flyer-card', {
                timeout: 10000,
            }).catch(() => {
                console.log(`[${this.sourceName}] No event cards found in DOM, proceeding anyway...`);
            });

            const events = await this.extractEventsFromDOM(page);

            console.log(`[${this.sourceName}] Found ${events.length} queer/FLINTA-filtered events.`);
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
            const eventCards = document.querySelectorAll('article, .eventlist-event, .summary-item, .flyer-card');
            const batch: any[] = [];
            const currentYear = new Date().getFullYear();

            eventCards.forEach((card) => {
                const titleElement = card.querySelector('.eventlist-title, h1, h2, h3, .summary-title a');
                const titleText = titleElement?.textContent?.trim() || '';

                const containsRainbowEmoji = titleText.includes('🌈');
                const containsQueerKeywords = /queer|flinta|lgbt|trans|non-binary/i.test(titleText);

                if (!containsRainbowEmoji && !containsQueerKeywords) {
                    return;
                }

                const timeElement = card.querySelector('.eventlist-meta-time, time, .summary-metadata--date');
                const dateText = timeElement?.textContent?.trim() || '';

                const linkElement = card.querySelector('a') as HTMLAnchorElement;
                const eventUrl = linkElement ? linkElement.href : 'https://www.neurodivergent-berlin.com/events';

                let parsedISOString: string | null = null;

                // Squarespace often provides datetime attributes directly
                const datetimeAttr = timeElement?.getAttribute('datetime');
                if (datetimeAttr) {
                    parsedISOString = new Date(datetimeAttr).toISOString();
                } else {
                    // Fallback: parse text like "Saturday, May 30, 2026 at 4:00 PM"
                    const timeMatch = dateText.match(/([A-Za-z]+)\s+(\d{1,2}).*?(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
                    if (timeMatch) {
                        const [_, monthName, day, hour, minute, ampm] = timeMatch;
                        const months: { [key: string]: string } = {
                            Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
                            Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
                        };
                        const monthNum = months[monthName?.substring(0, 3) ?? ''];
                        if (!monthNum) return;

                        let calculatedHour = parseInt(hour ?? '0', 10);
                        if (ampm && ampm.toUpperCase() === 'PM' && calculatedHour < 12) calculatedHour += 12;
                        if (ampm && ampm.toUpperCase() === 'AM' && calculatedHour === 12) calculatedHour = 0;

                        const finalHour = calculatedHour.toString().padStart(2, '0');
                        const finalDay = (day ?? '').padStart(2, '0');

                        parsedISOString = new Date(
                            `${currentYear}-${monthNum}-${finalDay}T${finalHour}:${minute}:00Z`
                        ).toISOString();
                    }
                }

                // Skip events with unparseable dates rather than defaulting to now
                if (!parsedISOString) return;

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
