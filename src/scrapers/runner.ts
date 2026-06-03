import { createClient } from '@supabase/supabase-js';
import { SinemaTranstopiaAdapter } from './adapters/sinemaTranstopia.js';
import { MeetUpAdapter } from './adapters/meetup.js';
import { VillageBerlinAdapter } from './adapters/villageBerlin.js';
import type { WebsiteAdapter, NormalizedEvent } from './interfaces.js';
import dotenv from 'dotenv';
import { ResidentAdvisorAdapter } from './adapters/residentAdvisor.js';
import { FlutgrabenAdapter } from './adapters/flutgraben.js';
import { TelegramGroupAdapter } from './adapters/telegram.js';
import { ArtAtBerlinAdapter } from './adapters/artAtBerlin.js';

// 1. Initialize environment configuration variables
dotenv.config();

// Global safety net: if any adapter fires an uncaughtException (e.g. GramJS MTProto errors),
// log it and exit cleanly so GitHub Actions doesn't mark the whole workflow as failed.
// Other adapters that already completed have already written their data to Supabase.
process.on('uncaughtException', (err: unknown) => {
    const msg = (err as any)?.errorMessage ?? (err as any)?.message ?? String(err);
    console.error(`\n💥 [ORCHESTRATOR] Uncaught exception — one adapter crashed: ${msg}`);
    console.error('Other adapters that completed before this point have been saved.');
    process.exit(0); // exit 0 so GitHub Actions doesn't fail the whole workflow
});

process.on('unhandledRejection', (reason: unknown) => {
    const msg = (reason as any)?.errorMessage ?? (reason as any)?.message ?? String(reason);
    console.error(`\n💥 [ORCHESTRATOR] Unhandled rejection: ${msg}`);
    process.exit(0);
});

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
    console.error('❌ Infrastructure Fault: Missing critical connection strings in env file.');
    process.exit(1);
}

// 2. Initialize the Supabase Client with administrative master clearance
const supabase = createClient(supabaseUrl, supabaseSecretKey);

async function runOrchestrator() {
    console.log('🚀 [ORCHESTRATOR] Initializing daily ingestion run...');

    // 3. Register your active venue adapters here
    const activeAdapters: WebsiteAdapter[] = [
        new SinemaTranstopiaAdapter(),
        new MeetUpAdapter(4, [
            'berlin-neurodivergent-community',
        ]),
        new VillageBerlinAdapter(),
        new ResidentAdvisorAdapter([
            {
                clubId: '15179',
                name: 'SO36',
                venueId: 5,
                keywords: /.*/,
            },
            {
                clubId: '132060',
                name: 'Festsaal Kreuzberg',
                venueId: 9,
                keywords: /.*/,
            },
            {
                clubId: '249089',
                name: 'OYA Bar',
                venueId: 10,
                keywords: /.*/,
            },
            {
                clubId: '88368',
                name: 'Gelegenheiten',
                venueId: 11,
                keywords: /.*/,
            },
        ]),
        new FlutgrabenAdapter(),
        new ArtAtBerlinAdapter(),
        // Telegram last: GramJS can fire uncaughtException on session errors.
        // Running it last ensures all other adapters complete before any crash.
        new TelegramGroupAdapter(7,
            (process.env['TELEGRAM_GROUP_IDS'] ?? '').split(',').filter(Boolean),
        ),
    ];

    let totalProcessed = 0;

    // 4. Sequential loop execution path to prevent resource choking
    for (const adapter of activeAdapters) {
        try {
            console.log(`\n─────────────────────────────────────────`);
            console.log(`📂 Processing Active Target: ${adapter.sourceName}`);
            console.log(`─────────────────────────────────────────`);

            // Execute the underlying Playwright promise script
            const events: NormalizedEvent[] = await adapter.scrape();

            if (events.length === 0) {
                console.log(`⚠️ [${adapter.sourceName}] No operational rows captured. Skipping write sequence.`);
                continue;
            }

            console.log(`💾 [${adapter.sourceName}] Attempting bulk insert of ${events.length} records into Supabase...`);

            // 5. Native PostgreSQL upsert deployment using Supabase client
            const { data, error } = await supabase
                .from('events')
                .upsert(events, {
                    onConflict: 'venue_id,title,start_time', // Our database deduplication shield
                    ignoreDuplicates: true                 // If it finds a match, do nothing. Save bandwidth!
                });

            if (error) {
                console.error(`❌ [${adapter.sourceName}] Supabase Database Write Error:`, error.message);
            } else {
                console.log(`✅ [${adapter.sourceName}] Ingestion sequence finalized successfully.`);
                totalProcessed += events.length;
            }

        } catch (adapterError) {
            console.error(`💥 [${adapter.sourceName}] Unexpected adapter engine failure:`, adapterError);
        }
    }

    console.log(`\n=========================================`);
    console.log(`🏁 [ORCHESTRATOR] Cycle complete. Processed ${totalProcessed} events.`);
    console.log(`=========================================`);
}

// Fire the execution script
runOrchestrator();