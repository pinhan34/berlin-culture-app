'use client';

import type { Event } from '@/lib/types';
import { EventCard } from './EventCard';

interface Props {
  events: Event[];
  isFavourited: (id: number) => boolean;
  onFavouriteToggle: (id: number) => void;
}

/**
 * Personalized row — events ranked by the user's local taste profile
 * (clicks, calendar saves, favourites). Only rendered once there's enough
 * signal to make the picks meaningful.
 */
export function ForYou({ events, isFavourited, onFavouriteToggle }: Props) {
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
        {events.map(e => (
          <EventCard
            key={e.id}
            event={e}
            highlight
            isFavourited={isFavourited(e.id)}
            onFavouriteToggle={onFavouriteToggle}
          />
        ))}
      </div>
    </section>
  );
}
