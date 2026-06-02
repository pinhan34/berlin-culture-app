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
const ENGLISH_DATE_NO_YEAR_RE = /(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([A-Za-zä]{3,})/;
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
const EVENT_SIGNALS_RE = /\b(event|veranstaltung|eintritt|tickets?|lineup|konzert|workshop|treffen|meetup|party|festival|ausstellung|exhibition|opening|vernissage|performance|show|live|dj|screening|debut|premiere|burlesque|cabaret|theater|theatre|reading|lecture|dance|dating|night|gig|concert|drag|queer|flinta|trans|pride|rave|disco|club|bar|gallery|art|music|film|cinema|kino)\b/i;
const CASUAL_SIGNALS_RE = /\b(wer kommt|anyone coming|kommt jemand|join us|kommt ihr|come join|wanna go|let'?s go|einlass|doors?\s+open|starts?\s+at|ab\s+\d{1,2}\s*uhr)\b/i;
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

        await client.connect();
        console.log(`[${this.sourceName}] Connected to Telegram.`);

        const allEvents: NormalizedEvent[] = [];

        try {
            for (const groupId of this.groupIds) {
                try {
                    const events = await this.scrapeGroup(client, groupId);
                    allEvents.push(...events);
                    console.log(`[${this.sourceName}][${groupId}] Extracted ${events.length} events.`);
                } catch (error) {
                    console.error(`[${this.sourceName}][${groupId}] Group scrape failed:`, error);
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

        console.log(`[${this.sourceName}] Found ${results.length} events in "${groupName}".`);
        return results;
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
        // Remove URLs for cleaner title extraction
        const clean = text.replace(URL_RE, '').trim();
        const lines = clean.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        // Patterns that indicate a line is promotional noise rather than an event title
        const PROMO_LINE_RE = /^\d+\s*(?:€|euro|eur)\b/i;          // "15 Euro", "€10"
        const DATE_ONLY_RE = /^\d{1,2}[.:]\d{1,2}/;                // "24.05" or "20:00"
        const EMOJI_NOISE_RE = /^[\p{Emoji}\s]+$/u;                 // line is just emojis
        const SHORT_CAPS_RE = /^[A-Z0-9\s€!]{2,30}$/;             // "FREE ENTRY", "SOLD OUT"

        function isNoiseLine(line: string): boolean {
            return (
                PROMO_LINE_RE.test(line) ||
                DATE_ONLY_RE.test(line) ||
                EMOJI_NOISE_RE.test(line) ||
                SHORT_CAPS_RE.test(line)
            );
        }

        // Walk lines until we find one that looks like a real title
        let title = '';
        for (const line of lines) {
            if (!isNoiseLine(line) && line.length >= 5) {
                title = line;
                break;
            }
        }

        // Fall back to first line if nothing better was found
        if (!title) title = lines[0] ?? '';

        // Trim to reasonable length
        if (title.length > 120) {
            title = title.substring(0, 117) + '...';
        }

        return title;
    }
}
