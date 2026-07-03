'use client';

import type { Event } from '@/lib/types';
import { extractDomain, trackInteraction } from '@/lib/interactions';
import { affiliateUrl } from '@/lib/affiliate';
import { formatWhen } from '@/lib/shareContent';
import { getVenueDisplayName, isAggregatorVenue, parseTitleVenue } from '@/lib/venueCategories';

/**
 * "Trending in Berlin" — a compact horizontal strip of the most-engaged events,
 * ranked server-side from the anonymous interactions data (see lib/trendingServer.ts).
 * Independent of the personalized feed: this is what the whole crowd is clicking/saving.
 */
export function TrendingStrip({ events }: { events: Event[] }) {
  if (events.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="font-heading text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100">
        <span aria-hidden="true">{'\u{1F525}'}</span> Trending in Berlin
      </h2>
      <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
        What people are clicking and saving right now
      </p>

      <div className="mt-3 flex snap-x gap-3 overflow-x-auto pb-2">
        {events.map((e, i) => {
          const parsed = isAggregatorVenue(e.venue_id)
            ? parseTitleVenue(e.title)
            : { title: e.title, venue: null };
          const venue = parsed.venue ?? (e.venue ? getVenueDisplayName(e.venue_id, e.venue.name) : null);
          const when = formatWhen(new Date(e.start_time));

          const onClick = () =>
            trackInteraction(e.id, 'click', {
              domain: extractDomain(e.event_url),
              venueId: e.venue_id,
            });

          const body = (
            <>
              <span className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fuchsia-600 text-xs font-bold text-white dark:bg-fuchsia-500">
                  {i + 1}
                </span>
                <span className="truncate text-xs font-medium text-stone-400 dark:text-stone-500">
                  {when}
                </span>
              </span>
              <span className="mt-2 line-clamp-2 font-semibold text-stone-900 dark:text-stone-100">
                {parsed.title}
              </span>
              {venue ? (
                <span className="mt-1 truncate text-sm text-stone-500 dark:text-stone-400">
                  {venue}
                </span>
              ) : null}
            </>
          );

          const cardClass =
            'flex w-60 shrink-0 snap-start flex-col rounded-2xl border border-stone-200 bg-white p-4 transition-all hover:border-fuchsia-300 hover:shadow-md dark:border-purple-900/40 dark:bg-[#16101e] dark:hover:border-fuchsia-600';

          return e.event_url ? (
            <a
              key={e.id}
              href={affiliateUrl(e.event_url, { clickref: e.id })}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClick}
              className={cardClass}
            >
              {body}
            </a>
          ) : (
            <div key={e.id} className={cardClass}>
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}
