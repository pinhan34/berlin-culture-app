// Test extractVenueFromText against real Telegram message examples
const URL_RE = /https?:\/\/\S+/;

function extractVenueFromText(text) {
    // 1. Explicit "@" separator
    const atMatch = text.match(/[@＠]\s*([A-ZÄÖÜ][^\n@#]{2,50}?)(?:\s*[,|)\n]|$)/m);
    if (atMatch?.[1]) {
        const v = atMatch[1].trim();
        if (v.length >= 3 && !URL_RE.test(v)) return v;
    }
    // 2. En/em dash on a line: "Series #1–Café Cralle"
    const dashMatch = text.match(/[–—]\s*([A-ZÄÖÜ][^\n–—,]{2,50}?)(?:\s*[,|\n]|$)/m);
    if (dashMatch?.[1]) {
        const v = dashMatch[1].trim();
        if (v.length >= 3 && !URL_RE.test(v)) return v;
    }
    // 3a. German prepositions — allow lowercase
    const prepDe = text.match(
        /\b(?:im|in der|in dem|an der|an dem|bei)\s+([A-ZÄÖÜa-zäöü][^\n,.!?]{3,50}?)(?:\s*[,\n.!?]|$)/m,
    );
    if (prepDe?.[1]) {
        const v = prepDe[1].trim();
        if (v.length >= 3 && !/^\d/.test(v) && !URL_RE.test(v)) return v;
    }
    // 3b. English "at" — require uppercase start
    const prepEn = text.match(/\bat\s+([A-ZÄÖÜ][^\n,.!?]{3,50}?)(?:\s*[,\n.!?]|$)/m);
    if (prepEn?.[1]) {
        const v = prepEn[1].trim();
        if (v.length >= 3 && !URL_RE.test(v)) return v;
    }
    return null;
}

const cases = [
    {
        label: "User example (dash separator)",
        text: `SEXY LINE UP
Find freedom in submission?
Seminar, 5.6., 12-4pm, 6.6., 11-3pm
Messy Salon #1–Café Cralle`,
        expectedTitle: 'SEXY LINE UP',
        expectedVenue: 'Café Cralle',
    },
    {
        label: "@ separator",
        text: `CONTROL FREAK @ Tresor\nSaturday 7.6., doors 23:00`,
        expectedVenue: 'Tresor',
    },
    {
        label: "German preposition 'im'",
        text: `Workshop im silent green\n12. Juni, 18 Uhr`,
        expectedVenue: 'silent green',
    },
    {
        label: "German preposition 'in der'",
        text: `Konzert in der Volksbühne\n15. Juni 20 Uhr`,
        expectedVenue: 'Volksbühne',
    },
    {
        label: "No venue — should be DROPPED",
        text: `Party next Friday 20.6. at 22:00\nCome and dance with us`,
        expectedVenue: null,
    },
    {
        label: "No venue, no link — should be DROPPED",
        text: `Great lineup tonight, 14.6.\nTickets at the door`,
        expectedVenue: null,
    },
];

let passed = 0;
for (const { label, text, expectedVenue } of cases) {
    const venue = extractVenueFromText(text);
    const ok = venue === expectedVenue;
    const status = ok ? '✓' : '✗';
    console.log(`${status} ${label}`);
    if (!ok) console.log(`    expected: ${JSON.stringify(expectedVenue)}, got: ${JSON.stringify(venue)}`);
    else if (venue) console.log(`    venue: "${venue}"`);
    else console.log(`    (no venue — would be dropped)`);
    if (ok) passed++;
}
console.log(`\n${passed}/${cases.length} passed`);

// --- finalTitle build logic (mirrors extractEvent for link-less events) ---
function buildFinalTitle(title, text) {
    const venue = extractVenueFromText(text);
    if (!venue) return null; // dropped
    if (!title.toLowerCase().includes(venue.toLowerCase())) return `${title} @ ${venue}`;
    return title; // venue already in title — no redundant append
}

console.log('\n--- finalTitle build ---');
const titleCases = [
    {
        label: "Venue already in title — no redundant append",
        title: 'Messy Salon #1–Café Cralle',
        text: 'Seminar 14.6.\nMessy Salon #1–Café Cralle',
        expected: 'Messy Salon #1–Café Cralle',
    },
    {
        label: "Venue separate — appended",
        title: 'CONTROL FREAK',
        text: 'CONTROL FREAK @ Tresor\n7.6. workshop',
        expected: 'CONTROL FREAK @ Tresor',
    },
    {
        label: "No venue — dropped",
        title: 'Some party',
        text: 'Some party next friday 20.6. come dance',
        expected: null,
    },
];
let tPassed = 0;
for (const { label, title, text, expected } of titleCases) {
    const got = buildFinalTitle(title, text);
    const ok = got === expected;
    console.log(`${ok ? '✓' : '✗'} ${label}`);
    if (!ok) console.log(`    expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(got)}`);
    else console.log(`    => ${got === null ? '(dropped)' : `"${got}"`}`);
    if (ok) tPassed++;
}
console.log(`\n${tPassed}/${titleCases.length} passed`);
