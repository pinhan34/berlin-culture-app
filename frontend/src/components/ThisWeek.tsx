'use client';

import { useState } from 'react';
import type { Event } from '@/lib/types';
import { berlinDayLabel } from '@/lib/thisWeek';
import { EventCard } from './EventCard';

/** Events shown before the "See all" button expands the list in place. */
const INITIAL_VISIBLE = 8;

interface Props {
  events: Event[];
  /** 'week' = normal window; 'next' = sparse week, widened to the next 14 days. */
  mode: 'week' | 'next';
  totalCount: number;
  isFavourited: (id: number) => boolean;
  onFavouriteToggle: (id: number) => void;
  onHide: (id: number) => void;
  isNew: (id: number) => boolean;
  /** Optional short "why you'd like this" tag. Display only — never affects the list. */
  reasonOf?: (event: Event) => string | undefined;
  /** When events were hidden by the user, offers to bring them back from the empty state. */
  hiddenCount?: number;
  onShowHidden?: () => void;
}

/**
 * Shared, unfiltered "This week" list — same events in the same order for every
 * visitor. Stored filters and taste never change what is listed here.
 */
export function ThisWeek({
  events,
  mode,
  totalCount,
  isFavourited,
  onFavouriteToggle,
  onHide,
  isNew,
  reasonOf,
  hiddenCount = 0,
  onShowHidden,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? events : events.slice(0, INITIAL_VISIBLE);

  const days = new Map<string, Event[]>();
  for (const e of visible) {
    const label = berlinDayLabel(new Date(e.start_time));
    const list = days.get(label);
    if (list) list.push(e);
    else days.set(label, [e]);
  }

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg" aria-hidden="true">&#128197;</span>
        <div>
          <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-fuchsia-600 dark:text-fuchsia-400">
            {mode === 'next' ? 'Coming up next' : 'This week'}
          </h2>
          <p className="text-xs text-fuchsia-400/80 dark:text-fuchsia-400/60">
            {mode === 'next' ? 'A quiet week — here is what is next' : 'Everything happening in the next 7 days'}
          </p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 py-10 text-center dark:border-purple-900/40">
          <p className="text-stone-400 dark:text-stone-500">Nothing coming up right now.</p>
          {hiddenCount > 0 && onShowHidden && (
            <button
              type="button"
              onClick={onShowHidden}
              className="mt-2 text-xs font-semibold text-fuchsia-600 underline-offset-2 hover:underline dark:text-fuchsia-400"
            >
              Show {hiddenCount} hidden event{hiddenCount !== 1 ? 's' : ''} again
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(days.entries()).map(([label, dayEvents]) => (
            <div key={label}>
              <h3 className="font-heading mb-3 text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                {label}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {dayEvents.map(e => {
                  const reason = reasonOf?.(e);
                  return (
                    <div key={e.id} className="space-y-1.5">
                      {reason && (
                        <div className="flex flex-wrap gap-1.5 px-1">
                          <span className="inline-flex items-center gap-1 rounded-full bg-fuchsia-50 px-2 py-0.5 text-[10px] font-medium text-fuchsia-600 dark:bg-fuchsia-950/40 dark:text-fuchsia-300">
                            <span aria-hidden="true">&#10024;</span>
                            {reason}
                          </span>
                        </div>
                      )}
                      <EventCard
                        event={e}
                        isNew={isNew(e.id)}
                        isFavourited={isFavourited(e.id)}
                        onFavouriteToggle={onFavouriteToggle}
                        onHide={onHide}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {!expanded && totalCount > INITIAL_VISIBLE && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mx-auto block rounded-full border border-fuchsia-300 px-4 py-1.5 text-xs font-semibold text-fuchsia-600 hover:bg-fuchsia-50 dark:border-fuchsia-800 dark:text-fuchsia-300 dark:hover:bg-fuchsia-950/40"
            >
              See all {totalCount}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
