import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import type { WebsiteAdapter, NormalizedEvent } from '../interfaces.js';

const MONTHS: Record<string, string> = {
    // English
    january: '01', february: '02', march: '03', april: '04',
    may: '05', june: '06', july: '07', august: '08',
    september: '09', october: '10', november: '11', december: '12',
    // German (same spelling as English for some)
    januar: '01', februar: '02', märz: '03',
    mai: '05', juni: '06', juli: '07',
    oktober: '10', dezember: '12',
    // Short abbreviations (German & English)
    jan: '01', feb: '02', mär: '03', mar: '03', apr: '04',
    jun: '06', jul: '07', aug: '08', sep: '09', okt: '10', oct: '10',
    nov: '11', dez: '12', dec: '12',
};

const GERMAN_DAYS: Record<string, number> = {
    montag: 1, dienstag: 2, mittwoch: 3, donnerstag: 4,
    freitag: 5, samstag: 6, sonntag: 0,
};

const ENGLISH_DAYS: Record<string, number> = {
    monday: 1, tuesday: 2, wednesday: 3, thursday: 4,
    friday: 5, saturday: 6, sunday: 0,
};

// German date: 24.05.2026 or 24.5.2026 (with year)
const GERMAN_DATE_RE = /(\d{1,2})\.(\d{1,2})\.(\d{4})/;
// German date: 24.05 or 24.5 (without year)
const GERMAN_DATE_NO_YEAR_RE = /(\d{1,2})\.(\d{1,2})\.?(?!\d)/;
// English date: 24th of May 2026, May 24 2026, May 24, 2026 (with year)
const ENGLISH_DATE_RE = /(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([A-Za-zä]+)\s+(\d{4})/;
const ENGLISH_DATE_RE2 = /([A-Za-zä]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/;
// English/German date without year: "4th of June", "June 4", "4. Juni", "4 Juni", "Juni 4"
// "4th of June", "4. Juni", "4 Juni", "30. Mai" — dot after day number is optional
const ENGLISH_DATE_NO_YEAR_RE = /(\d{1,2})(?:st|nd|rd|th)?\.?\s+(?:of\s+)?([A-Za-zä]{3,})/;
const ENGLISH_DATE_NO_YEAR_RE2 = /([A-Za-zä]{3,})\s+(\d{1,2})(?:st|nd|rd|th)?(?!\d)/;
// ISO date: 2026-05-24
const ISO_DATE_RE = /(\d{4})-(\d{2})-(\d{2})/;
// Time: 20:00, 8pm, 20 Uhr
const TIME_RE = /(\d{1,2}):(\d{2})/;
const TIME_UHR_RE = /(\d{1,2})\s*(?:Uhr|uhr)/;
const TIME_PM_RE = /(\d{1,2})\s*(?:pm|PM)/;
// Relative day references
const RELATIVE_DAY_RE = /\b(morgen|übermorgen|tomorrow|today|heute)\b/i;
const WEEKDAY_RE = /\b(?:this\s+|am\s+|nächsten?\s+)?(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;

// Event-signal keywords (at least one must be present alongside a date)
const EVENT_SIGNALS_RE = /\b(event|veranstaltung|eintritt|lineup|konzert|workshop|treffen|meetup|party|festival|ausstellung|exhibition|opening|vernissage|performance|show|live|dj|screening|debut|premiere|burlesque|cabaret|theater|theatre|reading|lecture|dance|dating|night|gig|concert|drag|queer|flinta|trans|pride|rave|disco|club|bar|gallery|art|music|film|cinema|kino)\b/i;
const CASUAL_SIGNALS_RE = /\b(wer kommt|anyone coming|kommt jemand|join us|kommt ihr|come join|wanna go|let'?s go|einlass|doors?\s+open|starts?\s+at|ab\s+\d{1,2}\s*uhr)\b/i;
// First-person messages about tickets/plans that are NOT event announcements
const PERSONAL_MESSAGE_RE = /\b(i have|i'm|i am|i need|ich habe|ich bin|ich suche|ich verkaufe|selling my|give away|giving away|my ticket|mein ticket|looking for .{0,20}ticket|suche .{0,20}ticket|verschenke|habe leider|leider kann ich)\b/i;
const URL_RE = /https?:\/\/\S+/;

interface ParsedDate {
    year: string;
    month: string;
    day: string;
}

interface ParsedTime {
    hour: string;
    minute: string;
}

/**
 * Domains we trust to return clean event metadata.
 * Instagram and Facebook require login and return garbage — skip them.
 * Google Maps is a location, not an event.
 * Unknown domains may or may not work — we try them but don't require success.
 */
// Any URL from these domains cannot produce a clean event title.
// We block enrichment AND require isTitleClean to pass on the Telegram text.
// Patterns are matched as substrings of the full URL string.
const BLOCKED_URL_PATTERNS = [
    'instagram.com', 'facebook.com', 'fb.me',
    'maps.google.com', 'google.com/maps', 'maps.app.goo.gl', 'goo.gl/maps',
    'goo.gl', // short redirect — could go anywhere, too risky
];
// Keep old name as alias for fetchEventMeta (which still uses it)
const BLOCKED_DOMAINS = ['instagram.com', 'www.instagram.com', 'facebook.com', 'www.facebook.com', 'fb.me', 'maps.google.com', 'goo.gl', 'maps.app.goo.gl', 'google.com'];
const RELIABLE_DOMAINS = ['ra.co', 'www.ra.co', 'eventbrite.com', 'www.eventbrite.com', 'eventbrite.de', 'eventbrite.co.uk', 'dice.fm', 'www.dice.fm', 'tickets.de', 'koka36.de', 'schwuz.de'];

/**
 * Fetch page metadata (title + venue) from an event URL.
 * Returns { title, venue } on success, or {} if blocked/failed.
 */
async function fetchEventMeta(url: string): Promise<{ title?: string; venue?: string }> {
    try {
        const hostname = new URL(url).hostname.replace(/^www\./, '');
        if (BLOCKED_DOMAINS.some(d => d.includes(hostname) || url.includes(d))) {
            return {}; // Can't enrich — caller will decide what to do
        }
    } catch { return {}; }
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; BerlinCultureBot/1.0)',
                'Accept': 'text/html',
            },
        });
        clearTimeout(timeout);
        if (!res.ok) return {};
        const html = await res.text();

        // 1. JSON-LD structured data (RA, Eventbrite, many others)
        const ldMatches = html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
        for (const m of ldMatches) {
            try {
                const items = JSON.parse(m[1]!);
                const list = Array.isArray(items) ? items : [items];
                for (const item of list) {
                    if (/^(Music)?Event$/i.test(item['@type'] ?? '')) {
                        const venue = item.location?.name
                            ?? item.location?.address?.name
                            ?? undefined;
                        const title = typeof item.name === 'string' ? item.name.trim() : undefined;
                        if (title) return { title, venue };
                    }
                }
            } catch { /* malformed JSON — skip */ }
        }

        // 2. Open Graph title
        const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
                ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
        if (og?.[1]) {
            // Strip trailing " | Site Name" suffixes common on RA, Eventbrite, etc.
            const title = og[1]
                .replace(/\s*[|\u2013\u2014-]\s*(Resident Advisor|RA|Eventbrite|Facebook|Instagram).*$/i, '')
                .trim();
            return { title };
        }

        // 3. HTML <title> as last resort
        const htmlTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
        if (htmlTitle) {
            const title = htmlTitle
                .replace(/\s*[|\u2013\u2014-]\s*(Resident Advisor|RA|Eventbrite|Facebook|Instagram).*$/i, '')
                .trim();
            return { title };
        }
    } catch { /* network error, timeout, redirect loop — fall back silently */ }
    return {};
}

/**
 * Returns true if a title looks like a real event name.
 * Rejects conversational openers, personal messages, and common junk patterns.
 * This is the last line of defence before writing to the database.
 */
function isTitleClean(title: string): boolean {
    const t = title.trim();
    if (t.length < 5) return false;

    // Conversational / personal openers that are never event titles
    const JUNK_START = /^(hi\b|hey\b|hallo\b|hello\b|dear\b|come\b|join\b|book\b|get\b|grab\b|save\b|buy\b|register\b|sign\b|liebe|lieber|i have\b|i got\b|i['']m\b|i am\b|would\b|could\b|looking\b|selling\b|give\b|suche\b|verschenke\b|ich\b|wer\b|does\b|anyone\b|google\b|instagram\b|facebook\b|this (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b)/i;
    if (JUNK_START.test(t)) return false;

    // Titles that contain known non-event strings anywhere inside them
    const JUNK_CONTAINS = /\bgoogle maps\b|\binstagram\b|\bfacebook\b|\bwhatsapp\b|\btelegram\b|\b€\s*only\b|\bparty tip\b|\bbook your spot\b|\bbook now\b|\bclick here\b|\blink in bio\b|\bswipe up\b/i;
    if (JUNK_CONTAINS.test(t)) return false;

    // Title is just a weekday or relative date reference
    if (/^(today|tomorrow|morgen|heute|übermorgen|this week)\b/i.test(t)) return false;

    // Titles shorter than 2 words that are all lowercase → likely a fragment
    const words = t.split(/\s+/);
    if (words.length < 2 && t === t.toLowerCase()) return false;

    return true;
}

/**
 * GramJS throws non-standard null-prototype objects as errors.
 * This extracts a human-readable message from them.
 */
function extractGramError(err: unknown): string {
    if (!err) return 'unknown error';
    if (typeof err === 'string') return err;
    if (err instanceof Error) return err.message;
    const e = err as Record<string, unknown>;
    return (
        (e['errorMessage'] as string) ??
        (e['message'] as string) ??
        (e['code'] ? `error code ${e['code']}` : null) ??
        JSON.stringify(err, Object.getOwnPropertyNames(err as object)) ??
        String(err)
    );
}

export class TelegramGroupAdapter implements WebsiteAdapter {
    sourceName = 'Telegram Groups';
    venueId: number;
    targetUrl = 'https://t.me';
    private groupIds: string[];
    private lookbackDays: number;

    constructor(venueId: number, groupIds: string[], lookbackDays = 30) {
        this.venueId = venueId;
        this.groupIds = groupIds;
        this.lookbackDays = lookbackDays;
    }

    async scrape(): Promise<NormalizedEvent[]> {
        const apiId = Number(process.env['TELEGRAM_API_ID']);
        const apiHash = process.env['TELEGRAM_API_HASH'] ?? '';
        const sessionStr = process.env['TELEGRAM_SESSION'] ?? '';

        if (!apiId || !apiHash || !sessionStr) {
            console.error(
                `[${this.sourceName}] Missing Telegram credentials. Run telegramAuth.ts first.`
            );
            return [];
        }

        const session = new StringSession(sessionStr);
        const client = new TelegramClient(session, apiId, apiHash, {
            connectionRetries: 3,
        });

        try {
            await client.connect();
        } catch (err: unknown) {
            const msg = extractGramError(err);
            console.error(`[${this.sourceName}] Failed to connect to Telegram: ${msg}`);
            return [];
        }
        console.log(`[${this.sourceName}] Connected to Telegram.`);

        const allEvents: NormalizedEvent[] = [];

        try {
            for (const groupId of this.groupIds) {
                try {
                    const events = await this.scrapeGroup(client, groupId);
                    allEvents.push(...events);
                    console.log(`[${this.sourceName}][${groupId}] Extracted ${events.length} events.`);
                } catch (error) {
                    console.error(`[${this.sourceName}][${groupId}] Group scrape failed: ${extractGramError(error)}`);
                }
            }

            console.log(`[${this.sourceName}] Total events across all groups: ${allEvents.length}`);
            return allEvents;
        } finally {
            await client.disconnect();
        }
    }

    private async resolveInviteHash(client: TelegramClient, hash: string): Promise<Api.TypeChat | null> {
        try {
            const result = await client.invoke(
                new Api.messages.CheckChatInvite({ hash })
            );

            if (result instanceof Api.ChatInviteAlready || result instanceof Api.ChatInvitePeek) {
                console.log(`[${this.sourceName}] Already a member of invite-link group.`);
                return result.chat;
            }

            console.log(`[${this.sourceName}] Not yet a member, joining via invite link...`);
            const joinResult = await client.invoke(
                new Api.messages.ImportChatInvite({ hash })
            );
            if ('chats' in joinResult && (joinResult as any).chats?.length > 0) {
                return (joinResult as any).chats[0];
            }
            return null;
        } catch (error) {
            console.error(`[${this.sourceName}] Failed to resolve invite hash "${hash}":`, error);
            return null;
        }
    }

    private getInputPeer(chat: Api.TypeChat): Api.TypeInputPeer {
        if (chat instanceof Api.Channel) {
            return new Api.InputPeerChannel({
                channelId: chat.id,
                accessHash: (chat.accessHash as any) ?? BigInt(0),
            });
        }
        if (chat instanceof Api.Chat) {
            return new Api.InputPeerChat({ chatId: chat.id });
        }
        throw new Error(`Unsupported chat type: ${chat.className}`);
    }

    private async scrapeGroup(client: TelegramClient, groupId: string): Promise<NormalizedEvent[]> {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - this.lookbackDays);

        let peer: any;
        let groupName = groupId;
        const isInviteHash = groupId.startsWith('+') || groupId.startsWith('joinchat/');

        if (isInviteHash) {
            const hash = groupId.replace(/^\+/, '').replace(/^joinchat\//, '');
            const chat = await this.resolveInviteHash(client, hash);
            if (!chat) {
                console.error(`[${this.sourceName}] Could not resolve invite hash: ${groupId}`);
                return [];
            }
            peer = this.getInputPeer(chat);
            groupName = ('title' in chat ? chat.title : undefined) ?? groupId;
        } else {
            peer = await client.getEntity(groupId);
            groupName = ('title' in peer ? (peer as any).title : undefined) ?? groupId;
        }
        console.log(`[${this.sourceName}] Fetching messages from "${groupName}" (last ${this.lookbackDays} days)...`);

        const cutoffUnix = Math.floor(cutoff.getTime() / 1000);
        const results: NormalizedEvent[] = [];
        const seen = new Set<string>();
        let offsetId = 0;

        // Paginate in batches of 100 until we go past the cutoff date
        outer: while (true) {
            const batch = await client.getMessages(peer, {
                limit: 100,
                ...(offsetId ? { offsetId } : { offsetDate: Math.floor(Date.now() / 1000) }),
            });

            if (!batch.length) break;

            for (const msg of batch) {
                if (!(msg instanceof Api.Message)) continue;

                if (msg.date < cutoffUnix) break outer;

                offsetId = msg.id;

                const text = msg.message ?? '';
                if (text.length < 10) continue;

                const event = this.extractEvent(text, groupName);
                if (!event) continue;

                const key = `${event.title}|${event.start_time}`;
                if (seen.has(key)) continue;
                seen.add(key);

                results.push(event);
            }

            // If the batch was smaller than requested, we've reached the beginning
            if (batch.length < 100) break;
        }

        console.log(`[${this.sourceName}] Found ${results.length} raw events in "${groupName}". Enriching from URLs...`);

        // Enrich + quality gate.
        // No matter where the title comes from (Telegram text OR enriched page),
        // it must pass isTitleClean before being stored.
        const enriched = (await Promise.all(
            results.map(async (e): Promise<NormalizedEvent | null> => {
                let finalTitle = e.title;

                if (e.event_url) {
                    const isBlockedUrl = BLOCKED_URL_PATTERNS.some(p => e.event_url!.includes(p));
                    if (!isBlockedUrl) {
                        const meta = await fetchEventMeta(e.event_url);
                        if (meta.title) {
                            finalTitle = meta.venue
                                ? `${meta.title} @ ${meta.venue}`
                                : meta.title;
                        }
                    }
                }

                // FINAL GATE: applies to ALL events regardless of source.
                // "Google Maps", "Hi Friends", "BOOK YOUR SPOT" all fail here.
                if (!isTitleClean(finalTitle)) {
                    console.log(`[${this.sourceName}] Dropped: "${finalTitle}"`);
                    return null;
                }

                return { ...e, title: finalTitle };
            })
        )).filter((e): e is NormalizedEvent => e !== null);

        console.log(`[${this.sourceName}] Kept ${enriched.length} / ${results.length} events from "${groupName}".`);
        return enriched;
    }

    private extractEvent(text: string, groupName: string): NormalizedEvent | null {
        const date = this.parseDate(text);
        if (!date) return null;

        const hasUrl = URL_RE.test(text);
        const hasEventSignal = EVENT_SIGNALS_RE.test(text);
        const hasCasualSignal = CASUAL_SIGNALS_RE.test(text);

        // Tier 1: structured (date + event signal or URL)
        // Tier 2: casual (date + casual phrase)
        if (!hasEventSignal && !hasUrl && !hasCasualSignal) return null;

        // Reject personal messages like "I have to give away my ticket" —
        // they have a date + keyword but are not event announcements.
        if (PERSONAL_MESSAGE_RE.test(text) && !hasUrl) return null;

        const time = this.parseTime(text);
        const title = this.extractTitle(text);
        if (!title || title.length < 3) return null;

        const isoString = `${date.year}-${date.month}-${date.day}T${time.hour}:${time.minute}:00Z`;
        let startTime: string;
        try {
            const d = new Date(isoString);
            if (isNaN(d.getTime())) return null;
            // Only keep future events
            if (d.getTime() < Date.now()) return null;
            startTime = d.toISOString();
        } catch {
            return null;
        }

        const urlMatch = text.match(URL_RE);
        const externalUrl = urlMatch?.[0];
        // Use the external URL if it's a real event page; otherwise null.
        // t.me group links are useless (require login), so we store null instead.
        const eventUrl =
            externalUrl && !externalUrl.startsWith('https://t.me/')
                ? externalUrl
                : null;

        return {
            venue_id: this.venueId,
            title,
            start_time: startTime,
            duration: null,
            event_url: eventUrl,
        };
    }

    /**
     * Given a month (1-12) and day, infer the year.
     * Use the current year unless the date is more than 2 days in the past,
     * in which case assume next year (handles posts written in late December
     * about January events).
     */
    private inferYear(month: number, day: number): string {
        const now = new Date();
        const candidate = new Date(now.getFullYear(), month - 1, day);
        if (candidate.getTime() < now.getTime() - 2 * 24 * 60 * 60 * 1000) {
            return String(now.getFullYear() + 1);
        }
        return String(now.getFullYear());
    }

    private parseDate(text: string): ParsedDate | null {
        // ISO: 2026-05-24
        const isoMatch = text.match(ISO_DATE_RE);
        if (isoMatch) {
            return {
                year: isoMatch[1] ?? '',
                month: isoMatch[2] ?? '',
                day: isoMatch[3] ?? '',
            };
        }

        // German with year: 24.05.2026
        const germanMatch = text.match(GERMAN_DATE_RE);
        if (germanMatch) {
            return {
                day: (germanMatch[1] ?? '').padStart(2, '0'),
                month: (germanMatch[2] ?? '').padStart(2, '0'),
                year: germanMatch[3] ?? '',
            };
        }

        // English with year: "24th of May 2026" or "May 24, 2026"
        const engMatch = text.match(ENGLISH_DATE_RE);
        if (engMatch) {
            const monthName = (engMatch[2] ?? '').toLowerCase();
            const month = MONTHS[monthName];
            if (month) {
                return {
                    day: (engMatch[1] ?? '').padStart(2, '0'),
                    month,
                    year: engMatch[3] ?? '',
                };
            }
        }

        const engMatch2 = text.match(ENGLISH_DATE_RE2);
        if (engMatch2) {
            const monthName = (engMatch2[1] ?? '').toLowerCase();
            const month = MONTHS[monthName];
            if (month) {
                return {
                    day: (engMatch2[2] ?? '').padStart(2, '0'),
                    month,
                    year: engMatch2[3] ?? '',
                };
            }
        }

        // English/German WITHOUT year: "4th of June", "June 4", "4. Juni", "4 Juni"
        const engNoYear = text.match(ENGLISH_DATE_NO_YEAR_RE);
        if (engNoYear) {
            const monthName = (engNoYear[2] ?? '').toLowerCase();
            const month = MONTHS[monthName];
            if (month) {
                const day = Number(engNoYear[1] ?? 0);
                return {
                    day: String(day).padStart(2, '0'),
                    month,
                    year: this.inferYear(Number(month), day),
                };
            }
        }

        const engNoYear2 = text.match(ENGLISH_DATE_NO_YEAR_RE2);
        if (engNoYear2) {
            const monthName = (engNoYear2[1] ?? '').toLowerCase();
            const month = MONTHS[monthName];
            if (month) {
                const day = Number(engNoYear2[2] ?? 0);
                return {
                    day: String(day).padStart(2, '0'),
                    month,
                    year: this.inferYear(Number(month), day),
                };
            }
        }

        // German without year: "4.6" or "04.06"
        const germanNoYear = text.match(GERMAN_DATE_NO_YEAR_RE);
        if (germanNoYear) {
            const day = Number(germanNoYear[1] ?? 0);
            const month = Number(germanNoYear[2] ?? 0);
            if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
                return {
                    day: String(day).padStart(2, '0'),
                    month: String(month).padStart(2, '0'),
                    year: this.inferYear(month, day),
                };
            }
        }

        // Relative days: "morgen", "tomorrow", "heute", "today"
        const relMatch = text.match(RELATIVE_DAY_RE);
        if (relMatch) {
            const word = (relMatch[1] ?? '').toLowerCase();
            const d = new Date();
            if (word === 'morgen' || word === 'tomorrow') d.setDate(d.getDate() + 1);
            else if (word === 'übermorgen') d.setDate(d.getDate() + 2);
            return {
                year: String(d.getFullYear()),
                month: String(d.getMonth() + 1).padStart(2, '0'),
                day: String(d.getDate()).padStart(2, '0'),
            };
        }

        // Weekday references: "this Friday", "am Samstag"
        const weekdayMatch = text.match(WEEKDAY_RE);
        if (weekdayMatch) {
            const dayName = (weekdayMatch[1] ?? '').toLowerCase();
            const targetDay = GERMAN_DAYS[dayName] ?? ENGLISH_DAYS[dayName];
            if (targetDay !== undefined) {
                const d = new Date();
                const currentDay = d.getDay();
                let daysAhead = targetDay - currentDay;
                if (daysAhead <= 0) daysAhead += 7;
                d.setDate(d.getDate() + daysAhead);
                return {
                    year: String(d.getFullYear()),
                    month: String(d.getMonth() + 1).padStart(2, '0'),
                    day: String(d.getDate()).padStart(2, '0'),
                };
            }
        }

        return null;
    }

    private parseTime(text: string): ParsedTime {
        // Standard time: 20:00
        const timeMatch = text.match(TIME_RE);
        if (timeMatch) {
            return {
                hour: (timeMatch[1] ?? '18').padStart(2, '0'),
                minute: timeMatch[2] ?? '00',
            };
        }

        // "20 Uhr"
        const uhrMatch = text.match(TIME_UHR_RE);
        if (uhrMatch) {
            return {
                hour: (uhrMatch[1] ?? '18').padStart(2, '0'),
                minute: '00',
            };
        }

        // "8pm"
        const pmMatch = text.match(TIME_PM_RE);
        if (pmMatch) {
            const h = Number(pmMatch[1] ?? 6);
            return {
                hour: String(h < 12 ? h + 12 : h).padStart(2, '0'),
                minute: '00',
            };
        }

        // Default to 19:00 (typical event time)
        return { hour: '19', minute: '00' };
    }

    private extractTitle(text: string): string {
        // Remove URLs and leading/trailing whitespace
        const clean = text.replace(URL_RE, '').trim();
        const lines = clean.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        // Lines that are definitely NOT the event title
        const PROMO_RE   = /^\d+\s*(?:€|euro|eur)\b/i;        // "15 Euro", "€10"
        const DATE_RE    = /^\d{1,2}[.:]\d{1,2}/;              // "24.05" or "20:00"
        const EMOJI_RE   = /^[\p{Emoji}\s]+$/u;                // line is only emojis
        const FIRST_PERSON_RE = /^(i |ich |i'm |I'm )/i;      // personal lines
        // Very long lines are descriptions, not titles
        const TOO_LONG   = 90;

        function isNoise(line: string): boolean {
            return (
                PROMO_RE.test(line) ||
                DATE_RE.test(line) ||
                EMOJI_RE.test(line) ||
                FIRST_PERSON_RE.test(line) ||
                line.length > TOO_LONG
            );
        }

        // Scoring: prefer lines that look like event names
        function titleScore(line: string): number {
            let score = 0;
            // ALL-CAPS words (e.g. "CONTROL FREAK", "REVOLTROUGE") → strong signal
            const words = line.split(/\s+/);
            const capsWords = words.filter(w => w.length > 1 && w === w.toUpperCase() && /[A-Z]/.test(w));
            if (capsWords.length >= 2) score += 10;
            else if (capsWords.length === 1 && words.length <= 4) score += 5;
            // Short lines with proper capitalization → likely a title
            if (line.length <= 50 && /^[A-ZÄÖÜ\d"'(«]/.test(line)) score += 3;
            // Starts with emoji followed by text → often the event headline
            if (/^[\p{Emoji}]/u.test(line) && line.replace(/^[\p{Emoji}\s]+/u, '').length > 3) score += 2;
            // Penalty for lines that look like sentences (lowercase start, punctuation at end)
            if (/^[a-z]/.test(line)) score -= 4;
            if (/[.!?]$/.test(line) && line.length > 40) score -= 2;
            return score;
        }

        const candidates = lines.filter(l => !isNoise(l) && l.length >= 3);

        // Pick the highest-scoring candidate
        let best = candidates[0] ?? lines[0] ?? '';
        let bestScore = titleScore(best);
        for (const line of candidates.slice(1)) {
            const s = titleScore(line);
            if (s > bestScore) { best = line; bestScore = s; }
        }

        // Strip leading emoji characters from the chosen title
        best = best.replace(/^[\p{Emoji}\s]+/u, '').trim() || best.trim();

        // Trim to reasonable length
        if (best.length > 120) best = best.substring(0, 117) + '...';

        return best;
    }
}
