import type { Event } from './types';

// ─── Shared helpers ───────────────────────────────────────────────────────────

function toICSDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function parseDurationMs(pg: string): number | null {
  // Postgres interval format: "HH:MM:SS" or human-readable like "37 days"
  const hms = pg.match(/^(\d+):(\d+):(\d+)$/);
  if (hms) {
    const h = parseInt(hms[1]!, 10);
    const m = parseInt(hms[2]!, 10);
    return (h * 3600 + m * 60) * 1000;
  }
  // Human-readable fallback
  const days = pg.match(/(\d+)\s*day/i);
  if (days) return parseInt(days[1]!, 10) * 86_400_000;
  const hours = pg.match(/(\d+)\s*h/i);
  const mins = pg.match(/(\d+)\s*m/i);
  let ms = 0;
  if (hours) ms += parseInt(hours[1]!, 10) * 3_600_000;
  if (mins) ms += parseInt(mins[1]!, 10) * 60_000;
  return ms > 0 ? ms : null;
}

function escapeICS(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function generateICS(event: Event): string {
  const start = toICSDate(event.start_time);

  let end: string;
  if (event.duration) {
    const durationMs = parseDurationMs(event.duration);
    if (durationMs) {
      end = toICSDate(new Date(new Date(event.start_time).getTime() + durationMs).toISOString());
    } else {
      end = toICSDate(new Date(new Date(event.start_time).getTime() + 7_200_000).toISOString());
    }
  } else {
    end = toICSDate(new Date(new Date(event.start_time).getTime() + 7_200_000).toISOString());
  }

  const location = event.venue?.address ?? event.venue?.name ?? '';
  const uid = `event-${event.id}@berlin-culture-app`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Berlin Culture App//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeICS(event.title)}`,
    location ? `LOCATION:${escapeICS(location)}` : '',
    event.event_url ? `URL:${event.event_url}` : '',
    `DTSTAMP:${toICSDate(new Date().toISOString())}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return lines.join('\r\n');
}

export function downloadICS(event: Event) {
  const ics = generateICS(event);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Direct calendar links (no download needed) ───────────────────────────────

function getEndIso(event: Event): string {
  if (event.duration) {
    const ms = parseDurationMs(event.duration);
    if (ms) return new Date(new Date(event.start_time).getTime() + ms).toISOString();
  }
  return new Date(new Date(event.start_time).getTime() + 7_200_000).toISOString();
}

export function buildGoogleCalendarUrl(event: Event): string {
  const start = toICSDate(event.start_time);
  const end   = toICSDate(getEndIso(event));
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${start}/${end}`,
    ...(event.venue?.address ? { location: event.venue.address } : {}),
    ...(event.event_url      ? { details: event.event_url }       : {}),
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

export function buildOutlookUrl(event: Event): string {
  const p = new URLSearchParams({
    subject:  event.title,
    startdt:  event.start_time,
    enddt:    getEndIso(event),
    ...(event.venue?.address ? { location: event.venue.address } : {}),
    ...(event.event_url      ? { body: event.event_url }         : {}),
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${p.toString()}`;
}

// ─── Subscription feed URL builder ────────────────────────────────────────────

export interface SubscribeParams {
  favouriteIds?: number[];
  venueIds?: number[];
  vibe?: string | null;
  community?: string | null;
}

/** Build the relative `/api/calendar` path for a (possibly filtered) feed. */
export function buildCalendarFeedPath(p: SubscribeParams): string {
  const qs = new URLSearchParams();
  if (p.favouriteIds?.length) qs.set('fav', p.favouriteIds.join(','));
  if (p.venueIds?.length) qs.set('venues', p.venueIds.join(','));
  if (p.vibe) qs.set('vibe', p.vibe);
  if (p.community) qs.set('community', p.community);
  const s = qs.toString();
  return `/api/calendar${s ? `?${s}` : ''}`;
}

// ─── Full feed for webcal subscription ────────────────────────────────────────

export function generateFeedICS(events: Event[], calendarName = 'Berlin Culture App'): string {
  const vevents = events.map(e => {
    const start = toICSDate(e.start_time);
    const end   = toICSDate(getEndIso(e));
    const location = e.venue?.address ?? e.venue?.name ?? '';
    const uid = `event-${e.id}@berlin-culture-app`;
    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeICS(e.title)}`,
      location      ? `LOCATION:${escapeICS(location)}`  : '',
      e.event_url   ? `URL:${e.event_url}`                : '',
      `DTSTAMP:${toICSDate(new Date().toISOString())}`,
      'END:VEVENT',
    ].filter(Boolean).join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Berlin Culture App//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICS(calendarName)}`,
    'X-WR-TIMEZONE:Europe/Berlin',
    ...vevents,
    'END:VCALENDAR',
  ].join('\r\n');
}
