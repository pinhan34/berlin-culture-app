import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import type { WebsiteAdapter, NormalizedEvent } from '../interfaces.js';

const MONTHS: Record<string, string> = {
    january: '01', february: '02', march: '03', april: '04',
    may: '05', june: '06', july: '07', august: '08',
    september: '09', october: '10', november: '11', december: '12',
    januar: '01', februar: '02', märz: '03', april_de: '04',
    mai: '05', juni: '06', juli: '07', august_de: '08',
    oktober: '10', november_de: '11', dezember: '12',
};

const GERMAN_DAYS: Record<string, number> = {
    montag: 1, dienstag: 2, mittwoch: 3, donnerstag: 4,
    freitag: 5, samstag: 6, sonntag: 0,
};

const ENGLISH_DAYS: Record<string, number> = {
    monday: 1, tuesday: 2, wednesday: 3, thursday: 4,
    friday: 5, saturday: 6, sunday: 0,
};

// German date: 24.05.2026 or 24.5.2026
const GERMAN_DATE_RE = /(\d{1,2})\.(\d{1,2})\.(\d{4})/;
// English date: 24th of May 2026, May 24 2026, May 24, 2026
const ENGLISH_DATE_RE = /(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([A-Za-zä]+)\s+(\d{4})/;
const ENGLISH_DATE_RE2 = /([A-Za-zä]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/;
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
const EVENT_SIGNALS_RE = /\b(event|veranstaltung|eintritt|tickets?|lineup|konzert|workshop|treffen|meetup|party|festival|ausstellung|exhibition|opening|vernissage|performance|show|live|dj|screening)\b/i;
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

    constructor(venueId: number, groupIds: string[], lookbackDays = 7) {
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

        const messages = await client.getMessages(peer, {
            limit: 200,
            offsetDate: Math.floor(Date.now() / 1000),
        });

        const results: NormalizedEvent[] = [];
        const seen = new Set<string>();

        for (const msg of messages) {
            if (!(msg instanceof Api.Message)) continue;

            const msgDate = new Date(msg.date * 1000);
            if (msgDate < cutoff) continue;

            const text = msg.message ?? '';
            if (text.length < 10) continue;

            const event = this.extractEvent(text, groupName);
            if (!event) continue;

            const key = `${event.title}|${event.start_time}`;
            if (seen.has(key)) continue;
            seen.add(key);

            results.push(event);
        }

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

        // Only keep messages that link to a real event page (not just the group itself).
        // Promo-only messages ("15 € until Monday") have no external link and should not
        // become events — they have no event page to send the user to.
        if (!externalUrl || externalUrl.startsWith('https://t.me/')) return null;

        return {
            venue_id: this.venueId,
            title,
            start_time: startTime,
            duration: null,
            event_url: externalUrl,
        };
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

        // German: 24.05.2026
        const germanMatch = text.match(GERMAN_DATE_RE);
        if (germanMatch) {
            return {
                day: (germanMatch[1] ?? '').padStart(2, '0'),
                month: (germanMatch[2] ?? '').padStart(2, '0'),
                year: germanMatch[3] ?? '',
            };
        }

        // English: "24th of May 2026" or "May 24, 2026"
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
