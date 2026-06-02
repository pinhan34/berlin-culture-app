import { SinemaTranstopiaAdapter } from './adapters/sinemaTranstopia.js';
import { MeetUpAdapter } from './adapters/meetup.js';
import { VillageBerlinAdapter } from './adapters/villageBerlin.js';
import { NeuroDivergentAdapter } from './adapters/neurodivergent.js';
import { ResidentAdvisorAdapter } from './adapters/residentAdvisor.js';
import { FlutgrabenAdapter } from './adapters/flutgraben.js';
import { TelegramGroupAdapter } from './adapters/telegram.js';
import { ArtAtBerlinAdapter } from './adapters/artAtBerlin.js';
import dotenv from 'dotenv';
import type { WebsiteAdapter, NormalizedEvent } from './interfaces.js';

dotenv.config();

function describeError(reason: unknown): string {
    if (!reason) return 'unknown error';
    if (typeof reason === 'string') return reason;
    const r = reason as Record<string, unknown>;
    // GramJS uses null-prototype objects; extract all own property names
    const allKeys = Object.getOwnPropertyNames(reason);
    const parts: string[] = [];
    for (const k of allKeys) {
        if (typeof r[k] !== 'function' && typeof r[k] !== 'symbol') {
            parts.push(`${k}=${JSON.stringify(r[k])}`);
        }
    }
    return parts.length ? parts.join(' | ') : String(reason);
}

process.on('unhandledRejection', (reason) => {
    console.error('\n❌ Unhandled rejection:', describeError(reason));
    process.exit(1);
});

process.on('uncaughtException', (err) => {
    console.error('\n❌ Uncaught exception:', describeError(err));
    process.exit(1);
});

function printResults(adapterName: string, events: NormalizedEvent[]) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`  ${adapterName}: ${events.length} event(s)`);
    console.log(`${'='.repeat(50)}\n`);

    for (const event of events) {
        console.log(`  Title:      ${event.title}`);
        console.log(`  Start:      ${event.start_time}`);
        console.log(`  Duration:   ${event.duration ?? '(not available)'}`);
        console.log(`  URL:        ${event.event_url}`);
        console.log(`  Venue ID:   ${event.venue_id}`);
        console.log(`  ${'─'.repeat(40)}`);
    }

    if (events.length === 0) {
        console.log('  No events captured.');
    }
}

async function testAdapter(adapter: WebsiteAdapter) {
    const start = Date.now();
    console.log(`\n>>> Testing: ${adapter.sourceName} ...`);

    try {
        const events = await adapter.scrape();
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        printResults(adapter.sourceName, events);
        console.log(`  Completed in ${elapsed}s\n`);
        return { name: adapter.sourceName, count: events.length, status: 'OK' };
    } catch (error) {
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        console.error(`  FAILED after ${elapsed}s:`, error);
        return { name: adapter.sourceName, count: 0, status: 'FAILED' };
    }
}

async function main() {
    const target = process.argv[2];

    const adapters: Record<string, WebsiteAdapter> = {
        sinema: new SinemaTranstopiaAdapter(),
        meetup: new MeetUpAdapter(2, ['berlin-neurodivergent-community']),
        village: new VillageBerlinAdapter(),
        neuro: new NeuroDivergentAdapter(),
        ra: new ResidentAdvisorAdapter([
            {
                clubId: '15179',
                name: 'SO36',
                venueId: 5,
                keywords: /gayhane|queer\s*slam|flinta|queer|roller\s*disco/i,
            },
            {
                clubId: '132060',
                name: 'Festsaal Kreuzberg',
                venueId: 9,
                keywords: /queer|gay|drag|ocean\s*eyes|xjazz/i,
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
        flutgraben: new FlutgrabenAdapter(),
        telegram: new TelegramGroupAdapter(7,
            (process.env['TELEGRAM_GROUP_IDS'] ?? '').split(',').filter(Boolean),
        ),
        artatberlin: new ArtAtBerlinAdapter(),
    };

    const toTest = target && adapters[target]
        ? [[target, adapters[target]] as const]
        : Object.entries(adapters);

    console.log('--- Adapter Test Run ---');
    console.log(`Testing ${toTest.length} adapter(s)...\n`);

    const results = [];
    for (const [, adapter] of toTest) {
        results.push(await testAdapter(adapter));
    }

    console.log('\n--- Summary ---');
    console.log('┌────────────────────────┬────────┬────────┐');
    console.log('│ Adapter                │ Events │ Status │');
    console.log('├────────────────────────┼────────┼────────┤');
    for (const r of results) {
        const name = r.name.padEnd(22);
        const count = String(r.count).padStart(6);
        const status = r.status.padEnd(6);
        console.log(`│ ${name} │ ${count} │ ${status} │`);
    }
    console.log('└────────────────────────┴────────┴────────┘');
}

main();
