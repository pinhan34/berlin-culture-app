'use client';

import { useState, useRef, useEffect } from 'react';
import type { Event } from '@/lib/types';
import { getVenueCategory, CATEGORY_STYLES, getVenueDisplayName, isAggregatorVenue, parseTitleVenue } from '@/lib/venueCategories';
import { getEventVibes, getVibeDef } from '@/lib/vibes';
import { downloadICS, buildGoogleCalendarUrl, buildOutlookUrl } from '@/lib/ics';
import { trackInteraction, extractDomain } from '@/lib/interactions';

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
  isNew?: boolean;
  isFavourited?: boolean;
  onFavouriteToggle?: (id: number) => void;
  onHide?: (id: number) => void;
}

export function EventCard({ event, highlight, isNew = false, isFavourited = false, onFavouriteToggle, onHide }: Props) {
  const sourceName = getVenueDisplayName(event.venue_id, event.venue?.name ?? `Venue #${event.venue_id}`);
  // For aggregator sources, surface the real venue parsed from "Name @ Venue".
  const parsed = isAggregatorVenue(event.venue_id)
    ? parseTitleVenue(event.title)
    : { title: event.title, venue: null };
  const displayTitle = parsed.title;
  const venueName = parsed.venue ?? sourceName;
  const viaSource = parsed.venue ? sourceName : null;
  const category = getVenueCategory(event.venue_id);
  const style = CATEGORY_STYLES[category];
  const urgency = getUrgencyLabel(event.start_time);
  const vibes = getEventVibes(event).slice(0, 2);

  function handleFavouriteClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onFavouriteToggle?.(event.id);
  }

  function handleHideClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onHide?.(event.id);
  }

  function handleCardClick() {
    trackInteraction(event.id, 'click', {
      domain: extractDomain(event.event_url),
      venueId: event.venue_id,
    });
  }

  const hasLink = !!event.event_url;
  const cardClass = `group relative block rounded-xl border p-5 transition-all ${
    hasLink ? 'hover:shadow-md' : 'cursor-default opacity-90'
  } ${
    highlight
      ? 'border-fuchsia-300 bg-fuchsia-50/50 ring-1 ring-fuchsia-200 dark:border-fuchsia-700 dark:bg-fuchsia-950/30 dark:ring-fuchsia-800'
      : 'border-stone-200 bg-white hover:border-stone-400 dark:border-purple-900/40 dark:bg-[#16101e] dark:hover:border-purple-700/60'
  }`;

  const inner = (
    <>
      {isNew && (
        <span className="absolute -top-2.5 left-3 inline-flex items-center gap-1 rounded-full bg-fuchsia-600 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm dark:bg-fuchsia-500">
          New
        </span>
      )}
      {urgency && (
        <span className="absolute -top-2.5 right-3 inline-block rounded-full bg-pink-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm dark:bg-pink-400">
          {urgency}
        </span>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className={`text-[15px] font-semibold leading-snug line-clamp-2 ${hasLink ? 'group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400' : ''} text-stone-900 dark:text-stone-100`}>
            {displayTitle}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1 text-sm font-medium text-fuchsia-700 dark:text-fuchsia-400">
              <CalendarIcon />
              {formatDate(event.start_time)}
            </span>
            <span className="inline-flex items-center gap-1 text-sm text-stone-500 dark:text-stone-400">
              <ClockIcon />
              {formatTime(event.start_time)}
            </span>
            {event.duration && (
              <span className="text-xs text-stone-400 dark:text-stone-500">
                {formatDuration(event.duration)}
              </span>
            )}
          </div>
          {vibes.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {vibes.map(v => {
                const def = getVibeDef(v);
                return (
                  <span
                    key={v}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${def.bg} ${def.text} ${def.border}`}
                  >
                    <span aria-hidden="true">{def.emoji}</span>
                    {def.label}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        {hasLink && <ArrowIcon />}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={`inline-block max-w-[180px] truncate rounded-md border px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text} ${style.border}`}>
            {venueName}
          </span>
          {viaSource && (
            <span className="truncate text-[10px] text-stone-400 dark:text-stone-500">via {viaSource}</span>
          )}
          {!hasLink && (
            <span className="text-[10px] text-stone-400 dark:text-stone-500">no link available</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <CalendarDropdown event={event} />
          {onHide && (
            <button
              onClick={handleHideClick}
              title="Not for me — show fewer like this"
              className="inline-flex items-center justify-center rounded-md border border-stone-200 bg-white p-1.5 text-stone-400 transition-all hover:border-stone-400 hover:bg-stone-50 hover:text-stone-600 active:scale-95 dark:border-purple-900/40 dark:bg-[#16101e] dark:text-stone-500 dark:hover:border-purple-700/60 dark:hover:text-stone-300"
            >
              <NotForMeIcon />
            </button>
          )}
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
    </>
  );

  return hasLink ? (
    <a
      href={event.event_url!}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleCardClick}
      className={cardClass}
    >
      {inner}
    </a>
  ) : (
    <div className={cardClass}>{inner}</div>
  );
}


function CalendarDropdown({ event }: { event: Event }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  function pick(e: React.MouseEvent, action: () => void) {
    e.preventDefault();
    e.stopPropagation();
    trackInteraction(event.id, 'calendar', { venueId: event.venue_id });
    action();
    setOpen(false);
  }

  const btnClass = 'inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2 py-1 text-[11px] font-medium text-stone-500 transition-all hover:border-fuchsia-300 hover:bg-fuchsia-50 hover:text-fuchsia-600 active:scale-95 dark:border-purple-900/40 dark:bg-[#16101e] dark:text-stone-400 dark:hover:border-fuchsia-600 dark:hover:bg-fuchsia-950/40 dark:hover:text-fuchsia-400';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(p => !p); }}
        className={btnClass}
        title="Add to calendar"
      >
        <AddCalendarIcon />
        Add to calendar
        <svg className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full right-0 z-20 mb-1 min-w-[160px] overflow-hidden rounded-lg border border-stone-200 bg-white shadow-lg dark:border-purple-900/40 dark:bg-[#1e1830]">
          <button
            onClick={(e) => pick(e, () => window.open(buildGoogleCalendarUrl(event), '_blank'))}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-stone-600 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-white/5"
          >
            <GoogleCalendarIcon /> Google Calendar
          </button>
          <button
            onClick={(e) => pick(e, () => window.open(buildOutlookUrl(event), '_blank'))}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-stone-600 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-white/5"
          >
            <OutlookIcon /> Outlook
          </button>
          <div className="my-1 border-t border-stone-100 dark:border-purple-900/30" />
          <button
            onClick={(e) => pick(e, () => downloadICS(event))}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-stone-600 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-white/5"
          >
            <AppleIcon /> Apple / .ics file
          </button>
        </div>
      )}
    </div>
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


function GoogleCalendarIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="2" fill="#fff" stroke="#dadce0"/>
      <rect x="3" y="8" width="18" height="2" fill="#4285f4"/>
      <rect x="8" y="3" width="2" height="4" rx="1" fill="#4285f4"/>
      <rect x="14" y="3" width="2" height="4" rx="1" fill="#4285f4"/>
      <text x="12" y="18" textAnchor="middle" fontSize="7" fontWeight="700" fill="#4285f4">G</text>
    </svg>
  );
}

function OutlookIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#0078d4"/>
      <rect x="2" y="4" width="11" height="16" rx="2" fill="#0078d4"/>
      <rect x="10" y="4" width="12" height="16" rx="1" fill="#106ebe"/>
      <circle cx="7.5" cy="12" r="3.5" fill="#fff"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.15-2.19 1.28-2.17 3.81.03 3.02 2.65 4.03 2.68 4.04l-.06.27ZM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11Z"/>
    </svg>
  );
}

function NotForMeIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
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
