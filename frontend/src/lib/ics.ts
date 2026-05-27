import type { Event } from './types';

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
