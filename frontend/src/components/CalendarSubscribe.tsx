'use client';

import { useState, useEffect } from 'react';
import { buildCalendarFeedPath } from '@/lib/ics';
import type { Vibe } from '@/lib/vibes';
import type { Community } from '@/lib/communities';

interface Props {
  favouriteIds: number[];
  venueIds: number[];
  vibe: Vibe | null;
  community: Community | null;
}

type Scope = 'all' | 'fav' | 'view';

/**
 * "Add Berlin to your calendar" — subscribe so events land in the calendar the
 * user already lives in, updating automatically. Personalized feeds (favourites
 * / current filters) are the retention hook and the natural Premium upgrade seam.
 */
export function CalendarSubscribe({ favouriteIds, venueIds, vibe, community }: Props) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<Scope>('all');
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => { setOrigin(window.location.origin); }, []);

  const hasFavourites = favouriteIds.length > 0;
  const hasFilters = venueIds.length > 0 || !!vibe || !!community;

  // Keep the chosen scope valid as filters/favourites change.
  useEffect(() => {
    if (scope === 'fav' && !hasFavourites) setScope('all');
    if (scope === 'view' && !hasFilters) setScope('all');
  }, [scope, hasFavourites, hasFilters]);

  const path = buildCalendarFeedPath(
    scope === 'fav' ? { favouriteIds }
    : scope === 'view' ? { venueIds, vibe, community }
    : {},
  );

  const httpsUrl = origin ? `${origin}${path}` : '';
  const webcalUrl = origin ? `${origin.replace(/^https?/, 'webcal')}${path}` : '';
  const googleUrl = httpsUrl
    ? `https://calendar.google.com/calendar/r/settings/addbyurl?cid=${encodeURIComponent(httpsUrl)}`
    : '';

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(httpsUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked — ignore */ }
  }

  const scopeOptions: { id: Scope; label: string; show: boolean }[] = [
    { id: 'all', label: 'Everything', show: true },
    { id: 'fav', label: `My favourites${hasFavourites ? ` (${favouriteIds.length})` : ''}`, show: hasFavourites },
    { id: 'view', label: 'My current filters', show: hasFilters },
  ];

  return (
    <div className="rounded-2xl border border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 to-pink-50 p-5 dark:border-fuchsia-900/40 dark:from-fuchsia-950/30 dark:to-purple-950/20">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">&#128197;</span>
          <div>
            <h3 className="font-heading text-sm font-bold text-stone-900 dark:text-stone-100">
              Add Berlin to your calendar
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Events show up where you already plan your week &mdash; updated automatically.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="shrink-0 rounded-full bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-fuchsia-700 active:scale-95 dark:bg-fuchsia-500 dark:hover:bg-fuchsia-600"
        >
          {open ? 'Close' : 'Subscribe'}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-4">
          {/* Scope picker */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              What to subscribe to
            </p>
            <div className="flex flex-wrap gap-2">
              {scopeOptions.filter(o => o.show).map(o => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setScope(o.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                    scope === o.id
                      ? 'border-fuchsia-400 bg-fuchsia-600 text-white dark:border-fuchsia-500 dark:bg-fuchsia-500'
                      : 'border-stone-200 bg-white text-stone-600 hover:border-fuchsia-300 dark:border-purple-900/40 dark:bg-[#16101e] dark:text-stone-300'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <a
              href={webcalUrl || '#'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 transition-all hover:border-fuchsia-300 hover:bg-fuchsia-50 active:scale-95 dark:border-purple-900/40 dark:bg-[#16101e] dark:text-stone-300 dark:hover:bg-fuchsia-950/40"
            >
              Apple / Outlook
            </a>
            <a
              href={googleUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 transition-all hover:border-fuchsia-300 hover:bg-fuchsia-50 active:scale-95 dark:border-purple-900/40 dark:bg-[#16101e] dark:text-stone-300 dark:hover:bg-fuchsia-950/40"
            >
              Google Calendar
            </a>
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 transition-all hover:border-fuchsia-300 hover:bg-fuchsia-50 active:scale-95 dark:border-purple-900/40 dark:bg-[#16101e] dark:text-stone-300 dark:hover:bg-fuchsia-950/40"
            >
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>

          <p className="text-[11px] leading-relaxed text-stone-400 dark:text-stone-500">
            Subscribing keeps your calendar in sync as new events are added &mdash; unlike a one-off
            download, you never have to come back and re-add anything.
          </p>
        </div>
      )}
    </div>
  );
}
