/**
 * Diagnostic: fetch specific event IDs from Supabase and test
 * what fetchEventMeta returns for each URL.
 * Usage: node --loader ts-node/esm src/scrapers/testEventIds.ts
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const TEST_IDS = [1975, 1978, 1986, 1988, 1998, 2012, 2013];

async function fetchMeta(url: string): Promise<{ title?: string; venue?: string }> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' },
        });
        clearTimeout(timeout);
        if (!res.ok) return { title: `HTTP ${res.status}` };
        const html = await res.text();

        // JSON-LD
        const ldMatches = html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
        for (const m of ldMatches) {
            try {
                const items = JSON.parse(m[1]!);
                const list = Array.isArray(items) ? items : [items];
                for (const item of list) {
                    if (/^(Music)?Event$/i.test(item['@type'] ?? '')) {
                        return {
                            title: item.name,
                            venue: item.location?.name ?? item.location?.address?.name,
                        };
                    }
                }
            } catch { /**/ }
        }

        // OG title
        const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
                ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
        if (og?.[1]) return { title: og[1].replace(/\s*[|–—-]\s*(Resident Advisor|RA|Eventbrite).*$/i, '').trim() };

        return { title: '(no OG title found)' };
    } catch (e: any) {
        return { title: `(fetch error: ${e.message})` };
    }
}

async function main() {
    const { data, error } = await supabase
        .from('events')
        .select('id, title, event_url')
        .in('id', TEST_IDS)
        .order('id');

    if (error) { console.error('DB error:', error); return; }

    console.log('\n=== CURRENT DB ROWS ===\n');
    for (const row of data ?? []) {
        console.log(`ID ${row.id}`);
        console.log(`  DB title    : "${row.title}"`);
        console.log(`  event_url   : ${row.event_url ?? '(null)'}`);

        if (row.event_url) {
            const meta = await fetchMeta(row.event_url);
            console.log(`  fetchMeta   : title="${meta.title ?? '—'}"  venue="${meta.venue ?? '—'}"`);
            if (meta.title) {
                const final = meta.venue ? `${meta.title} @ ${meta.venue}` : meta.title;
                console.log(`  WOULD STORE : "${final}"`);
            } else {
                console.log(`  WOULD STORE : (enrichment failed — falls back to DB title)`);
            }
        } else {
            console.log(`  WOULD STORE : no URL — only if title passes isTitleClean`);
        }
        console.log();
    }
}

main().catch(console.error).finally(() => process.exit(0));
