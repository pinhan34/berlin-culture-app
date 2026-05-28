import { chromium } from 'playwright';
import type { WebsiteAdapter, NormalizedEvent } from '../interfaces.js';

export class SinemaTranstopiaAdapter implements WebsiteAdapter {
    sourceName = 'Sinema Transtopia';
    venueId = 1;
    targetUrl = 'https://sinematranstopia.com/en/calendar';

    async scrape(): Promise<NormalizedEvent[]> {
        console.log(`[${this.sourceName}] Starting scrape...`);

        const headless = process.env['DEBUG_HEADED'] !== '1';
        const browser = await chromium.launch({ headless });
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            await page.goto(this.targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
            await page.waitForTimeout(3000);

            const html = await page.content();
            const events = this.extractEvents(html);

            console.log(`[${this.sourceName}] Found ${events.length} events.`);
            return events;
        } catch (error) {
            console.error(`[${this.sourceName}] Scrape failed:`, error);
            return [];
        } finally {
            await browser.close();
        }
    }

    private extractEvents(html: string): NormalizedEvent[] {
        const results: NormalizedEvent[] = [];
        const seen = new Set<string>();
        const now = new Date();

        const dateTimeRe = /(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/g;
        let match: RegExpExecArray | null;

        while ((match = dateTimeRe.exec(html)) !== null) {
            const [, day, month, year, hour, minute] = match;
            const isoString = `${year}-${month}-${day}T${hour}:${minute}:00Z`;

            let startTime: Date;
            try {
                startTime = new Date(isoString);
                if (isNaN(startTime.getTime())) continue;
                if (startTime < now) continue;
            } catch {
                continue;
            }

            const afterMatch = html.substring(match.index + match[0].length, match.index + match[0].length + 800);

            const textAfter = afterMatch.replace(/<[^>]+>/g, '\n').replace(/&[^;]+;/g, ' ');
            const lines = textAfter.split('\n').map(l => l.trim()).filter(l => l.length > 2);

            let title = '';
            let category = '';
            for (const line of lines.slice(0, 6)) {
                if (/^\d{2}[.\/:]\d{2}/.test(line)) continue;
                if (/^(Tickets?|Registration|Gratis|Open Air|Meyhane|Application)$/i.test(line)) continue;

                if (!category) {
                    category = line;
                } else if (!title) {
                    title = line;
                    break;
                }
            }

            if (!title && category) {
                title = category;
                category = '';
            }
            if (!title || title.length < 3) continue;

            if (category && category.length < 40) {
                title = `${category}: ${title}`;
            }

            if (title.length > 120) {
                title = title.substring(0, 117) + '...';
            }

            const key = `${title}|${isoString}`;
            if (seen.has(key)) continue;
            seen.add(key);

            const linkMatch = afterMatch.match(/href="(\/[^"]*?)"/);
            const eventUrl = linkMatch
                ? `https://sinematranstopia.com${linkMatch[1]}`
                : this.targetUrl;

            results.push({
                venue_id: this.venueId,
                title,
                start_time: startTime.toISOString(),
                duration: null,
                event_url: eventUrl,
            });
        }

        return results;
    }
}
