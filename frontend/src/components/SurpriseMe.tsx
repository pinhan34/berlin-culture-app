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
    <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/50 p-6 text-center dark:border-purple-900/40 dark:bg-[#16101e]/50">
      {!picked ? (
        <>
          <p className="mb-1 text-lg font-semibold text-stone-700 dark:text-stone-200">
            Can&apos;t decide?
          </p>
          <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
            Let us pick something for you.
          </p>
          <button
            onClick={roll}
            className="rounded-full bg-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-fuchsia-700 hover:shadow-lg active:scale-95 dark:bg-fuchsia-500 dark:hover:bg-fuchsia-600"
          >
            Spin the wheel
          </button>
        </>
      ) : (
        <div className="mx-auto max-w-md space-y-4">
          <p className="text-sm font-medium text-fuchsia-600 dark:text-fuchsia-400">
            We found a gem
          </p>
          <EventCard event={picked} highlight />
          <button
            onClick={roll}
            className="rounded-full border border-stone-300 px-5 py-2 text-sm font-medium text-stone-600 transition-all hover:border-stone-400 hover:text-stone-900 active:scale-95 dark:border-purple-800 dark:text-stone-400 dark:hover:text-stone-100"
          >
            Try another
          </button>
        </div>
      )}
    </div>
  );
}
