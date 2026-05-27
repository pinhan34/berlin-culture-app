'use client';

import type { Event } from '@/lib/types';
import { getVenueCategory, CATEGORY_STYLES } from '@/lib/venueCategories';
import { downloadICS } from '@/lib/ics';

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${SHORT_DAYS[d.getDay()]}, ${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDuration(pg: string): string {
  const h = pg.match(/(\d+):(\d+):\d+/);
  if (h) {
    const hours = parseInt(h[1]!, 10);
    const mins = parseInt(h[2]!, 10);
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days !== 1 ? 's' : ''}`;
    }
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  }
  return pg;
}

export function getUrgencyLabel(startTime: string): string | null {
  const now = Date.now();
  const start = new Date(startTime).getTime();
  const diffH = (start - now) / 3_600_000;

  if (diffH < 0) return null;
  if (diffH <= 3) return 'Starts soon';
  if (diffH <= 12) return 'Today';

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 59, 999);
  if (start <= tomorrow.getTime()) return 'Tomorrow';

  return null;
}

interface Props {
  event: Event;
  highlight?: boolean;
}

export function EventCard({ event, highlight }: Props) {
  const venueName = event.venue?.name ?? `Venue #${event.venue_id}`;
  const category = getVenueCategory(event.venue_id);
  const style = CATEGORY_STYLES[category];
  const urgency = getUrgencyLabel(event.start_time);

  function handleCalendarClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    downloadICS(event);
  }

  return (
    <a
      href={event.event_url ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative block rounded-xl border p-5 transition-all hover:shadow-md ${
        highlight
          ? 'border-indigo-300 bg-indigo-50/50 ring-1 ring-indigo-200 dark:border-indigo-700 dark:bg-indigo-950/30 dark:ring-indigo-800'
          : 'border-zinc-200 bg-white hover:border-zinc-400 dark:border-zinc-700/60 dark:bg-zinc-900 dark:hover:border-zinc-500'
      }`}
    >
      {urgency && (
        <span className="absolute -top-2.5 right-3 inline-block rounded-full bg-rose-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
          {urgency}
        </span>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold leading-snug text-zinc-900 group-hover:text-indigo-600 dark:text-zinc-100 dark:group-hover:text-indigo-400 line-clamp-2">
            {event.title}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
            <span className="inline-flex items-center gap-1">
              <CalendarIcon />
              {formatDate(event.start_time)}
            </span>
            <span className="inline-flex items-center gap-1">
              <ClockIcon />
              {formatTime(event.start_time)}
            </span>
            {event.duration && (
              <span className="text-zinc-400 dark:text-zinc-500">
                {formatDuration(event.duration)}
              </span>
            )}
          </div>
        </div>

        <ArrowIcon />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text} ${style.border}`}>
            {venueName}
          </span>
          {event.venue?.source_type === 'personal' && (
            <span className="inline-block rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
              Personal
            </span>
          )}
        </div>

        <button
          onClick={handleCalendarClick}
          title="Add to calendar"
          className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-500 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 active:scale-95 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-indigo-600 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400"
        >
          <AddCalendarIcon />
          Add to cal
        </button>
      </div>
    </a>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25" />
    </svg>
  );
}

function AddCalendarIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6v6m3-3H9" />
    </svg>
  );
}
