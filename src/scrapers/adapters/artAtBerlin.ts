import { chromium } from 'playwright';
import type { WebsiteAdapter, NormalizedEvent } from '../interfaces.js';

export class ArtAtBerlinAdapter implements WebsiteAdapter {
    sourceName = 'ART at Berlin';
    venueId = 8;
    targetUrl = 'https://www.artatberlin.com/';

    async scrape(): Promise<NormalizedEvent[]> {
        console.log(`[${this.sourceName}] Starting scrape...`);

        const headless = process.env['DEBUG_HEADED'] !== '1';
        const browser = await chromium.launch({ headless });
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            await page.goto(this.targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.waitForSelector('.entry-content h3', {
                state: 'attached',
                timeout: 15000,
            });

            const events = await page.evaluate((venueId: number) => {
                const batch: any[] = [];
                const seen = new Set<string>();
                const now = new Date();
                now.setHours(0, 0, 0, 0);

                const dateRangeRe = /(\d{1,2})\.(\d{2})\.\s*[-–]\s*(\d{1,2})\.(\d{2})\.(\d{4})/;

                const headings = document.querySelectorAll('h3');

                headings.forEach(h3 => {
                    const text = h3.textContent?.trim() ?? '';
                    if (text.length < 10) return;

                    const dateMatch = text.match(dateRangeRe);
                    if (!dateMatch) return;

                    const startDay = (dateMatch[1] ?? '').padStart(2, '0');
                    const startMonth = (dateMatch[2] ?? '').padStart(2, '0');
                    const endDay = (dateMatch[3] ?? '').padStart(2, '0');
                    const endMonth = (dateMatch[4] ?? '').padStart(2, '0');
                    const year = dateMatch[5] ?? '';
                    if (!year) return;

                    const endDate = new Date(`${year}-${endMonth}-${endDay}`);
                    if (isNaN(endDate.getTime()) || endDate.getTime() < now.getTime()) return;

                    // Parse pipe-separated segments: "Artist | Title | Gallery | DD.MM.-DD.MM.YYYY"
                    const rawSegments = text.split('|').map(s => s.trim());
                    // Last segment is the date range — strip it
                    const segments = rawSegments.slice(0, -1).map(s =>
                        s.replace(dateRangeRe, '').trim()
                    ).filter(s => s.length > 0);

                    // Strip leading "NEWS ++" prefix if present
                    if (segments[0]?.startsWith('NEWS')) {
                        segments[0] = (segments[0].replace(/^NEWS\s*\+*\s*/, '') ?? '').trim();
                        if (segments[0] === '') segments.shift();
                    }

                    let title: string;
                    if (segments.length >= 3) {
                        const artistExhibition = segments.slice(0, -1).join(': ');
                        const gallery = segments[segments.length - 1] ?? '';
                        title = `${artistExhibition} @ ${gallery}`;
                    } else if (segments.length === 2) {
                        title = segments.join(': ');
                    } else if (segments.length === 1) {
                        title = segments[0] ?? text;
                    } else {
                        return;
                    }

                    title = title.trim();
                    if (!title || title.length < 3) return;

                    // Duration from date range
                    const startDate = new Date(`${year}-${startMonth}-${startDay}`);
                    let duration: string | null = null;
                    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                        const diffDays = Math.round(
                            (endDate.getTime() - startDate.getTime()) / 86_400_000
                        );
                        if (diffDays > 0) {
                            duration = diffDays === 1 ? '1 day' : `${diffDays} days`;
                        }
                    }

                    // Find link — check h3 itself or its parent for an <a>
                    let eventUrl = 'https://www.artatberlin.com/';
                    const linkInside = h3.querySelector('a[href]') as HTMLAnchorElement | null;
                    const parentLink = h3.closest('a') as HTMLAnchorElement | null;
                    if (linkInside?.href) {
                        eventUrl = linkInside.href;
                    } else if (parentLink?.href) {
                        eventUrl = parentLink.href;
                    }

                    const startTime = `${year}-${startMonth}-${startDay}T12:00:00Z`;
                    const key = `${title}|${year}-${startMonth}-${startDay}`;
                    if (seen.has(key)) return;
                    seen.add(key);

                    try {
                        const iso = new Date(startTime).toISOString();
                        batch.push({
                            venue_id: venueId,
                            title,
                            start_time: iso,
                            duration,
                            event_url: eventUrl,
                        });
                    } catch {
                        // skip invalid dates
                    }
                });

                return batch;
            }, this.venueId);

            const filtered = events.filter(
                (e): e is NormalizedEvent => !!e.title && !!e.start_time && !!e.venue_id
            );

            console.log(`[${this.sourceName}] Found ${filtered.length} current exhibitions.`);
            return filtered;
        } catch (error) {
            console.error(`[${this.sourceName}] Scrape failed:`, error);
            return [];
        } finally {
            await browser.close();
        }
    }
}
