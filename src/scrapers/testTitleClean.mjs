// Quick standalone test of isTitleClean logic
function isTitleClean(title) {
    const t = title.trim();
    if (t.length < 5) return { ok: false, reason: 'too short' };
    if (t.endsWith(':') || t.endsWith('\u2026') || t.endsWith('...')) return { ok: false, reason: 'ends with colon/ellipsis' };
    if (/^(cancelled|abgesagt|postponed|verschoben)\b/i.test(t)) return { ok: false, reason: 'cancelled' };
    if (/^€/.test(t)) return { ok: false, reason: 'starts with €' };
    if (/^\d+\s*[€£$]/.test(t)) return { ok: false, reason: 'starts with price' };
    const JUNK_START = /^(hi\b|hey\b|hallo\b|hello\b|dear\b|come\b|join\b|book\b|bring\b|get\b|grab\b|save\b|buy\b|register\b|sign\b|liebe|lieber|i have\b|i got\b|i'm\b|i am\b|would\b|could\b|looking\b|selling\b|give\b|suche\b|verschenke\b|ich\b|wer\b|does\b|anyone\b|google\b|instagram\b|facebook\b|das erwartet|hier (ist|sind|findet|gibt)|this (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b)/i;
    if (JUNK_START.test(t)) return { ok: false, reason: 'JUNK_START' };
    const JUNK_CONTAINS = /\bgoogle maps\b|\binstagram\b|\bfacebook\b|\bwhatsapp\b|€\s*only|notaflof|\bparty tip\b|\bbook your spot\b|\bbook now\b|\bclick here\b|\blink in bio\b|\bswipe up\b|\bhttps?:\/\//i;
    if (JUNK_CONTAINS.test(t)) return { ok: false, reason: 'JUNK_CONTAINS' };
    if (/^(today|tomorrow|morgen|heute|übermorgen|this week)\b/i.test(t)) return { ok: false, reason: 'date word' };
    const words = t.split(/\s+/);
    if (words.length < 2 && t === t.toLowerCase()) return { ok: false, reason: 'single lowercase word' };
    return { ok: true };
}

const cases = [
    // Should be DROPPED (bad)
    ['€ UNTIL MONDAY ONLY',              false],
    ['€ only',                           false],
    ['45€ (NOTAFLOF)',                   false],
    ['Das erwartet dich:',               false],
    ['BOOK YOUR SPOT',                   false],
    ['Google Maps',                      false],
    ['Party Tip for Saturday',           false],
    ['Hi Friends',                       false],
    ['Bring: a towel + activewear',      false],
    ['CANCELLED: Calisthenics for Black Queers', false],
    ['Hi darlings',                      false],
    ['Hey Lovelies',                     false],
    ['Come Gag',                         false],
    // Should be KEPT (good events)
    ['Control Freak Burlesque Theater',  true],
    ['Revoltrouge',                      true],
    ['Soli Queer Market Berlin Neukölln', true],
    ['FLINTA Non-Monogamous Dating',     true],
    ['Zibers Berlin Debut',              true],
    ['Queer Walkie Talkie',              true],
    ['SO36 presents: Drag Night',        true],
];

let pass = 0, fail = 0;
for (const [title, expected] of cases) {
    const res = isTitleClean(title);
    const correct = expected === res.ok;
    const icon = correct ? '✅' : '❌ WRONG';
    if (correct) pass++; else fail++;
    const action = res.ok ? 'KEEP' : `DROP (${res.reason})`;
    console.log(`${icon}  "${title}"  →  ${action}`);
}
console.log(`\n${pass}/${cases.length} correct`);
if (fail > 0) process.exit(1);
