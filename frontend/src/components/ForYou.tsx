'use client';

import type { Event } from '@/lib/types';
import { EventCard } from './EventCard';

interface Props {
  events: Event[];
  isFavourited: (id: number) => boolean;
  onFavouriteToggle: (id: number) => void;
  /** Returns short "why you're seeing this" reasons for an event. */
  reasonsOf?: (event: Event) => string[];
}

/**
 * Personalized row — events ranked by the user's local taste profile
 * (clicks, calendar saves, favourites, vibe/community affinity). Only rendered
 * once there's enough signal to make the picks meaningful.
 */
export function ForYou({ events, isFavourited, onFavouriteToggle, reasonsOf }: Props) {
  if (events.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg" aria-hidden="true">&#10024;</span>
        <div>
          <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-fuchsia-600 dark:text-fuchsia-400">
            For you
          </h2>
          <p className="text-xs text-fuchsia-400/80 dark:text-fuchsia-400/60">Tuned to what you tap and save</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {events.map(e => {
          const reasons = reasonsOf?.(e) ?? [];
          return (
            <div key={e.id} className="space-y-1.5">
              {reasons.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-1">
                  {reasons.map(r => (
                    <span
                      key={r}
                      className="inline-flex items-center gap-1 rounded-full bg-fuchsia-50 px-2 py-0.5 text-[10px] font-medium text-fuchsia-600 dark:bg-fuchsia-950/40 dark:text-fuchsia-300"
                    >
                      <span aria-hidden="true">&#10024;</span>
                      {r}
                    </span>
                  ))}
                </div>
              )}
              <EventCard
                event={e}
                highlight
                isFavourited={isFavourited(e.id)}
                onFavouriteToggle={onFavouriteToggle}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
