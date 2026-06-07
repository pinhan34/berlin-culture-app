// Test if RA.co allows browser-like headers
const urls = [
    'https://ra.co/events/2426265',
    'https://ra.co/events/2418171',
];

for (const url of urls) {
    try {
        const r = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9,de;q=0.8',
            },
            signal: AbortSignal.timeout(8000),
        });
        const html = await r.text();
        const og = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1]
                 ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
                 ?? '(no title found)';
        const ld = html.match(/"name"\s*:\s*"([^"]+)"/)?.[1] ?? null;
        console.log(`${url}`);
        console.log(`  HTTP ${r.status}`);
        console.log(`  og:title = ${og.substring(0, 80)}`);
        if (ld) console.log(`  JSON-LD name = ${ld.substring(0, 80)}`);
    } catch(e) {
        console.log(`${url} -> ERROR: ${e.message}`);
    }
    console.log();
}
