/**
 * End-to-end pipeline test: for each event in the DB, simulate exactly what
 * the CURRENT scraper code would do: enrich from URL → isTitleClean → store or drop.
 * Run: node --loader ts-node/esm src/scrapers/testPipeline.ts
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ─── Blocked URL patterns (substring match on full URL) ────────────────────
const BLOCKED_URL_PATTERNS = [
    'instagram.com', 'facebook.com', 'fb.me',
    'maps.google.com', 'google.com/maps', 'maps.app.goo.gl', 'goo.gl',
];

// ─── fetchEventMeta ─────────────────────────────────────────────────────────
async function fetchEventMeta(url: string): Promise<{ title?: string; venue?: string }> {
    const BLOCKED_DOMAINS = ['instagram.com', 'facebook.com', 'fb.me',
        'maps.google.com', 'goo.gl', 'maps.app.goo.gl', 'google.com'];
    try {
        const hostname = new URL(url).hostname.replace(/^www\./, '');
        if (BLOCKED_DOMAINS.some(d => d.includes(hostname) || url.includes(d))) return {};
    } catch { return {}; }
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);
        const res = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BerlinCultureBot/1.0)', Accept: 'text/html' },
        });
        clearTimeout(timeout);
        if (!res.ok) return {}; // real scraper returns {} — caller falls back to telegram text
        const html = await res.text();
        // JSON-LD
        for (const m of html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
            try {
                const list = [JSON.parse(m[1]!)].flat();
                for (const item of list) {
                    if (/^(Music)?Event$/i.test(item['@type'] ?? '')) {
                        const venue = item.location?.name ?? item.location?.address?.name;
                        const title = typeof item.name === 'string' ? item.name.trim() : undefined;
                        if (title) return { title, venue };
                    }
                }
            } catch { /* malformed */ }
        }
        // OG title
        const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
                ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
        if (og?.[1]) {
            const stripped = og[1]
                .replace(/\s*[|\u2013\u2014]\s*(Resident Advisor|RA|Eventbrite|Facebook|Instagram|Alle Events[^|]*|Events, Termine[^|]*).*$/i, '')
                .replace(/\s*[|\u2013\u2014]\s*.{0,40}(ticket|karten|event|veranstaltung).*$/i, '')
                .trim();
            if (stripped && !/^(events?|aktuelles|news|workshops?|termine|programm)\b/i.test(stripped)) return { title: stripped };
        }
    } catch { /* timeout / network */ }
    return {};
}

// ─── isTitleClean — MUST MATCH telegram.ts exactly ──────────────────────────
function isTitleClean(title: string): boolean {
    const t = title.trim();
    if (t.length < 5) return false;
    if (t.endsWith(':') || t.endsWith('…') || t.endsWith('...')) return false;
    if (/^(cancelled|abgesagt|postponed|verschoben)\b/i.test(t)) return false;
    if (/^€/.test(t)) return false;
    if (/^\d+\s*[€£$]/.test(t)) return false;
    if (/^(january|february|march|april|may|june|july|august|september|october|november|december|januar|februar|märz|mai|juni|juli|oktober|dezember|monday|tuesday|wednesday|thursday|friday|saturday|sunday|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b.{0,8}(\d|uhr|pm|am)/i.test(t)) return false;
    const JUNK_START = /^(hi\b|hey\b|hallo\b|hello\b|dear|come\b|join\b|book\b|bring\b|few\b|get\b|grab\b|save\b|buy\b|register\b|sign\b|hosted by\b|last chance\b|liebe|lieber|i have\b|i got\b|i['']m\b|i am\b|there are\b|would\b|could\b|looking\b|selling\b|give\b|suche\b|verschenke\b|ich\b|wer\b|does\b|anyone\b|news\b|aktuelles\b|workshops?\b|termine\b|programm\b|google\b|instagram\b|facebook\b|euros\b|das erwartet|hier (ist|sind|findet|gibt)|this (monday|tuesday|wednesday|thursday|friday|saturday|sunday|evening|weekend)\b)/i;
    if (JUNK_START.test(t)) return false;
    if (/^[→←➡➜►•\-–—]\s/.test(t)) return false;
    const JUNK_CONTAINS = /\bgoogle maps\b|\binstagram\b|\bfacebook\b|\bwhatsapp\b|€\s*only|notaflof|\bparty tip\b|\bfew spots\b|\bspots left\b|\bra tickets\b|\bticket link\b|\btickets here\b|\bsell tickets\b|\bdj lineup\b|\bbook your spot\b|\bbook now\b|\bclick here\b|\blink in bio\b|\bswipe up\b|\blast chance\b|\bhttps?:\/\//i;
    if (JUNK_CONTAINS.test(t)) return false;
    if (/^(today|tomorrow|morgen|heute|übermorgen|next week|this week|this evening|heute abend)\b/i.test(t)) return false;
    const words = t.split(/\s+/);
    if (words.length < 2 && t === t.toLowerCase()) return false;
    return true;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
    // Fetch ALL current venue_id=7 events
    const { data, error } = await supabase
        .from('events')
        .select('id, title, event_url')
        .eq('venue_id', 7)
        .order('id', { ascending: false })
        .limit(500);

    if (error) { console.error('DB error:', error); return; }

    console.log(`\nSimulating NEW scraper pipeline on ${data?.length} Telegram events...\n`);
    console.log('─'.repeat(80));

    for (const row of data ?? []) {
        let finalTitle = row.title;
        let enrichedFrom = 'telegram text';

        if (row.event_url) {
            const isBlocked = BLOCKED_URL_PATTERNS.some(p => row.event_url.includes(p));
            if (!isBlocked) {
                const meta = await fetchEventMeta(row.event_url);
                if (meta.title) {
                    finalTitle = meta.venue ? `${meta.title} @ ${meta.venue}` : meta.title;
                    enrichedFrom = 'URL metadata';
                } else {
                    enrichedFrom = `URL fetch failed (${row.event_url.split('/')[2]})`;
                }
            } else {
                enrichedFrom = 'blocked URL → telegram text';
            }
        }

        const clean = isTitleClean(finalTitle);
        const status = clean ? '✅ STORE' : '❌ DROP ';
        console.log(`${status}  ID ${row.id}`);
        console.log(`         DB title  : "${row.title}"`);
        if (finalTitle !== row.title) {
            console.log(`         Enriched  : "${finalTitle}"  [from ${enrichedFrom}]`);
        } else {
            console.log(`         Source    : ${enrichedFrom}`);
        }
        if (clean) console.log(`         → WILL BE STORED AS: "${finalTitle}"`);
        console.log();
    }
}

main().catch(console.error).finally(() => process.exit(0));
