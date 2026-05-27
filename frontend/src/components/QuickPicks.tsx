'use client';

import type { Event } from '@/lib/types';
import { EventCard } from './EventCard';

interface Props {
  events: Event[];
}

function getTonight(events: Event[]): Event[] {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  return events.filter(e => {
    const start = new Date(e.start_time);
    return start >= now && start <= endOfDay;
  }).slice(0, 3);
}

function getThisWeekend(events: Event[]): Event[] {
  const now = new Date();
  const day = now.getDay();

  // Find next Saturday 00:00
  const saturdayOffset = day === 0 ? 6 : 6 - day;
  const saturday = new Date(now);
  saturday.setDate(saturday.getDate() + saturdayOffset);
  saturday.setHours(0, 0, 0, 0);

  // Sunday 23:59
  const sundayEnd = new Date(saturday);
  sundayEnd.setDate(sundayEnd.getDate() + 1);
  sundayEnd.setHours(23, 59, 59, 999);

  // If it's already the weekend, start from now
  const start = (day === 6 || day === 0) ? now : saturday;

  return events.filter(e => {
    const s = new Date(e.start_time);
    return s >= start && s <= sundayEnd;
  }).slice(0, 4);
}

export function QuickPicks({ events }: Props) {
  const tonight = getTonight(events);
  const weekend = getThisWeekend(events);

  if (tonight.length === 0 && weekend.length === 0) return null;

  return (
    <div className="space-y-6">
      {tonight.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-pink-500 animate-pulse dark:bg-pink-400" />
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400">
                Tonight
              </h2>
              <p className="text-xs text-stone-400 dark:text-stone-500">Still time to make plans</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tonight.map(e => (
              <EventCard key={e.id} event={e} highlight />
            ))}
          </div>
        </section>
      )}

      {weekend.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-lg">&#9734;</span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-fuchsia-600 dark:text-fuchsia-400">
              Your weekend lineup
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {weekend.map(e => (
              <EventCard key={e.id} event={e} highlight />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
