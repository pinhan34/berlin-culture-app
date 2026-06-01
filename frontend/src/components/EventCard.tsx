'use client';

import type { Event } from '@/lib/types';
import { getVenueCategory, CATEGORY_STYLES } from '@/lib/venueCategories';
import { downloadICS } from '@/lib/ics';
import { trackInteraction } from '@/lib/interactions';

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
  isFavourited?: boolean;
  onFavouriteToggle?: (id: number) => void;
}

// Display name overrides — lets us show a friendlier name without touching the DB
const VENUE_DISPLAY_NAMES: Record<number, string> = {
  2: 'ND Community',   // MeetUp: berlin-neurodivergent-community
  7: 'Queer Berlin',   // Telegram: QUEER EVENTS Berlin group
};

export function EventCard({ event, highlight, isFavourited = false, onFavouriteToggle }: Props) {
  const venueName = VENUE_DISPLAY_NAMES[event.venue_id] ?? event.venue?.name ?? `Venue #${event.venue_id}`;
  const category = getVenueCategory(event.venue_id);
  const style = CATEGORY_STYLES[category];
  const urgency = getUrgencyLabel(event.start_time);

  function handleCalendarClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    trackInteraction(event.id, 'calendar');
    downloadICS(event);
  }

  function handleFavouriteClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onFavouriteToggle?.(event.id);
  }

  function handleCardClick() {
    trackInteraction(event.id, 'click');
  }

  return (
    <a
      href={event.event_url ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleCardClick}
      className={`group relative block rounded-xl border p-5 transition-all hover:shadow-md ${
        highlight
          ? 'border-fuchsia-300 bg-fuchsia-50/50 ring-1 ring-fuchsia-200 dark:border-fuchsia-700 dark:bg-fuchsia-950/30 dark:ring-fuchsia-800'
          : 'border-stone-200 bg-white hover:border-stone-400 dark:border-purple-900/40 dark:bg-[#16101e] dark:hover:border-purple-700/60'
      }`}
    >
      {urgency && (
        <span className="absolute -top-2.5 right-3 inline-block rounded-full bg-pink-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm dark:bg-pink-400">
          {urgency}
        </span>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold leading-snug text-stone-900 group-hover:text-fuchsia-600 dark:text-stone-100 dark:group-hover:text-fuchsia-400 line-clamp-2">
            {event.title}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500 dark:text-stone-400">
            <span className="inline-flex items-center gap-1">
              <CalendarIcon />
              {formatDate(event.start_time)}
            </span>
            <span className="inline-flex items-center gap-1">
              <ClockIcon />
              {formatTime(event.start_time)}
            </span>
            {event.duration && (
              <span className="text-stone-400 dark:text-stone-500">
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
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCalendarClick}
            title="Save to calendar"
            className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2 py-1 text-[11px] font-medium text-stone-500 transition-all hover:border-fuchsia-300 hover:bg-fuchsia-50 hover:text-fuchsia-600 active:scale-95 dark:border-purple-900/40 dark:bg-[#16101e] dark:text-stone-400 dark:hover:border-fuchsia-600 dark:hover:bg-fuchsia-950/40 dark:hover:text-fuchsia-400"
          >
            <AddCalendarIcon />
            Save to calendar
          </button>

          <button
            onClick={handleFavouriteClick}
            title={isFavourited ? 'Remove from favourites' : 'Save to favourites'}
            className={`inline-flex items-center justify-center rounded-md border p-1.5 transition-all active:scale-95 ${
              isFavourited
                ? 'border-pink-300 bg-pink-50 text-pink-500 hover:bg-pink-100 dark:border-pink-700 dark:bg-pink-950/40 dark:text-pink-400 dark:hover:bg-pink-950/60'
                : 'border-stone-200 bg-white text-stone-400 hover:border-pink-300 hover:bg-pink-50 hover:text-pink-500 dark:border-purple-900/40 dark:bg-[#16101e] dark:text-stone-500 dark:hover:border-pink-700 dark:hover:bg-pink-950/40 dark:hover:text-pink-400'
            }`}
          >
            <HeartIcon filled={isFavourited} />
          </button>
        </div>
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
    <svg className="h-4 w-4 flex-shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-fuchsia-500 dark:text-stone-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
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

function HeartIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
    </svg>
  ) : (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  );
}
