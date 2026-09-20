import type { Event } from './types';

const BERLIN_TZ = 'Europe/Berlin';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const keyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BERLIN_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** `YYYY-MM-DD` of the given instant on the Berlin calendar. */
export function berlinDateKey(d: Date): string {
  return keyFormatter.format(d);
}

function parseKey(key: string): Date {
  const [y, m, day] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

/** Adds whole days to a `YYYY-MM-DD` key. UTC math on the parts, so DST cannot shift it. */
export function addDaysToKey(key: string, n: number): string {
  const d = parseKey(key);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Day heading such as "Saturday, 12 September 2026", using the Berlin calendar day. */
export function berlinDayLabel(d: Date): string {
  const p = parseKey(berlinDateKey(d));
  return `${WEEKDAYS[p.getUTCDay()]}, ${p.getUTCDate()} ${MONTHS[p.getUTCMonth()]} ${p.getUTCFullYear()}`;
}

/** Identifies a recurring series: same normalized title at the same venue. */
export function seriesKey(e: Event): string {
  const title = e.title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  return `${title}|${e.venue_key ?? `id:${e.venue_id}`}`;
}

export interface ThisWeekOptions {
  now: Date;
  hiddenIds?: ReadonlySet<number>;
  days?: number;
  fallbackDays?: number;
  minCount?: number;
}

export interface ThisWeekResult {
  events: Event[];
  mode: 'week' | 'next';
  totalCount: number;
}

function pickWindow(upcoming: Event[], todayKey: string, days: number): Event[] {
  const lastKey = addDaysToKey(todayKey, days - 1);
  const earliest = new Map<string, Event>();
  for (const e of upcoming) {
    const key = berlinDateKey(new Date(e.start_time));
    if (key < todayKey || key > lastKey) continue;
    const sk = seriesKey(e);
    const seen = earliest.get(sk);
    if (!seen || compareEvents(e, seen) < 0) earliest.set(sk, e);
  }
  return [...earliest.values()].sort(compareEvents);
}

function compareEvents(a: Event, b: Event): number {
  const t = Date.parse(a.start_time) - Date.parse(b.start_time);
  return t !== 0 ? t : a.id - b.id;
}

/**
 * The shared, unfiltered "This week" list. Output depends only on the events, the
 * hidden set and `now` — never on taste — so every visitor sees the same events in
 * the same order.
 */
export function getThisWeek(events: Event[], opts: ThisWeekOptions): ThisWeekResult {
  const { now, hiddenIds, days = 7, fallbackDays = 14, minCount = 4 } = opts;
  const nowMs = now.getTime();
  const upcoming = events.filter(
    (e) => !hiddenIds?.has(e.id) && Date.parse(e.start_time) >= nowMs,
  );
  const todayKey = berlinDateKey(now);

  let picked = pickWindow(upcoming, todayKey, days);
  let mode: ThisWeekResult['mode'] = 'week';
  if (picked.length < minCount) {
    picked = pickWindow(upcoming, todayKey, fallbackDays);
    mode = 'next';
  }
  return { events: picked, mode, totalCount: picked.length };
}
