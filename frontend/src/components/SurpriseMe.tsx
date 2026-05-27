'use client';

import { useState } from 'react';
import type { Event } from '@/lib/types';
import { EventCard } from './EventCard';

interface Props {
  events: Event[];
}

export function SurpriseMe({ events }: Props) {
  const [picked, setPicked] = useState<Event | null>(null);

  function roll() {
    if (events.length === 0) return;
    const idx = Math.floor(Math.random() * events.length);
    setPicked(events[idx] ?? null);
  }

  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
      {!picked ? (
        <>
          <p className="mb-1 text-lg font-semibold text-zinc-700 dark:text-zinc-200">
            Can&apos;t decide?
          </p>
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            Let us pick something for you.
          </p>
          <button
            onClick={roll}
            className="rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-lg active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            Surprise me
          </button>
        </>
      ) : (
        <div className="mx-auto max-w-md space-y-4">
          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
            How about this?
          </p>
          <EventCard event={picked} highlight />
          <button
            onClick={roll}
            className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-600 transition-all hover:border-zinc-400 hover:text-zinc-900 active:scale-95 dark:border-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Try another
          </button>
        </div>
      )}
    </div>
  );
}
