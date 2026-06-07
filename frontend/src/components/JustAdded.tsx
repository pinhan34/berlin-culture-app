'use client';

import type { Event } from '@/lib/types';
import { EventCard } from './EventCard';

interface Props {
  events: Event[];
}

/**
 * Surfaces the most recently-scraped events at the top of the feed,
 * regardless of how far in the future they are. Without this, a freshly
 * added event happening weeks from now lands at the bottom of the
 * chronological list and feels invisible.
 */
export function JustAdded({ events }: Props) {
  if (events.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-fuchsia-500 animate-pulse dark:bg-fuchsia-400" />
        <div>
          <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-fuchsia-600 dark:text-fuchsia-400">
            Just added
          </h2>
          <p className="text-xs text-fuchsia-400/80 dark:text-fuchsia-400/60">Fresh finds since the last update</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {events.map(e => (
          <EventCard key={e.id} event={e} isNew highlight />
        ))}
      </div>
    </section>
  );
}
