/**
 * One-off backfill: parse "Name @ Venue" out of existing event titles for
 * aggregator sources (Telegram, ART at Berlin) and populate venue_name /
 * venue_key / a cleaned title, without touching rows that already have a
 * venue_name (idempotent, safe to re-run).
 *
 * Defaults to a dry run — prints a table, writes nothing. Pass --apply to
 * actually write.
 *
 * Usage:
 *   node --loader ts-node/esm src/scrapers/backfillVenueNames.ts
 *   node --loader ts-node/esm src/scrapers/backfillVenueNames.ts --apply
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { normalizeVenueKey } from './venueKey.js';

dotenv.config();

// Aggregator venue ids whose titles may carry "Name @ Venue" — see
// .claude/specs/VENUE_MODEL.md decision log. Restricting to these avoids
// false positives on brick-and-mortar venues whose titles legitimately
// contain an "@" (e.g. a lineup entry "DJ Foo @ Club").
const AGGREGATOR_VENUE_IDS = [2, 3, 7, 8];

interface EventRow {
    id: number;
    venue_id: number;
    title: string;
}

/**
 * Same "Name @ Venue" parsing as frontend/src/lib/venueCategories.ts
 * parseTitleVenue() (Phase 1) — kept in sync deliberately: this script is a
 * one-off migration of exactly the strings that helper already renders.
 */
function parseTitleVenue(title: string): { name: string; venue: string | null } {
    const idx = title.lastIndexOf(' @ ');
    if (idx === -1) return { name: title, venue: null };
    const name = title.slice(0, idx).trim();
    const venue = title.slice(idx + 3).trim();
    if (!name || !venue) return { name: title, venue: null };
    return { name, venue };
}

async function main() {
    const apply = process.argv.includes('--apply');

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseSecretKey) {
        console.error('❌ Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in env.');
        process.exit(1);
    }
    const supabase = createClient(supabaseUrl, supabaseSecretKey);

    console.log(`Mode: ${apply ? 'APPLY (writing changes)' : 'DRY RUN (no writes)'}`);

    const { data: rows, error } = await supabase
        .from('events')
        .select('id, venue_id, title')
        .in('venue_id', AGGREGATOR_VENUE_IDS)
        .is('venue_name', null)
        .returns<EventRow[]>();

    if (error) {
        console.error('❌ Failed to fetch events:', error.message);
        process.exit(1);
    }

    const plans: { id: number; oldTitle: string; newTitle: string; venueName: string; venueKey: string }[] = [];

    for (const row of rows ?? []) {
        const { name, venue } = parseTitleVenue(row.title);
        if (!venue) continue; // no "@ Venue" separator — skip, don't guess
        plans.push({
            id: row.id,
            oldTitle: row.title,
            newTitle: name,
            venueName: venue,
            venueKey: normalizeVenueKey(venue),
        });
    }

    console.log(`\nFound ${rows?.length ?? 0} unbackfilled aggregator rows, ${plans.length} parseable.\n`);
    console.log('id | old title → new title | venue_name | venue_key');
    console.log('---------------------------------------------------');
    for (const p of plans) {
        console.log(`${p.id} | "${p.oldTitle}" → "${p.newTitle}" | ${p.venueName} | ${p.venueKey}`);
    }

    if (!apply) {
        console.log('\nDry run only — no writes. Re-run with --apply to write these changes.');
        return;
    }

    let updated = 0;
    for (const p of plans) {
        const { error: updateError } = await supabase
            .from('events')
            .update({ title: p.newTitle, venue_name: p.venueName, venue_key: p.venueKey })
            .eq('id', p.id)
            .is('venue_name', null); // re-check at write time — safe to re-run concurrently
        if (updateError) {
            console.error(`❌ Failed to update event ${p.id}:`, updateError.message);
            continue;
        }
        updated++;
    }
    console.log(`\n✅ Updated ${updated} / ${plans.length} rows.`);
}

main();
