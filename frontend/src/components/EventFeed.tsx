'use client';

import { useState, useMemo } from 'react';
import type { Event, Venue } from '@/lib/types';
import { getVenueCategory, type VenueCategory } from '@/lib/venueCategories';
import { EventCard } from './EventCard';
import { VenueFilter } from './VenueFilter';
import { DateFilter } from './DateFilter';
import { QuickPicks } from './QuickPicks';
import { SurpriseMe } from './SurpriseMe';
import { MoodTiles } from './MoodTiles';

interface Props {
  events: Event[];
  venues: Venue[];
}

function getDateCutoff(range: string): Date {
  const now = new Date();
  if (range === 'week') {
    const end = new Date(now);
    end.setDate(end.getDate() + (7 - end.getDay()));
    end.setHours(23, 59, 59, 999);
    return end;
  }
  if (range === 'month') {
    return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }
  return new Date(9999, 11, 31);
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatDateHeading(d: Date): string {
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function groupByDate(events: Event[]): Map<string, Event[]> {
  const groups = new Map<string, Event[]>();
  for (const event of events) {
    const key = formatDateHeading(new Date(event.start_time));
    const arr = groups.get(key) ?? [];
    arr.push(event);
    groups.set(key, arr);
  }
  return groups;
}

export function EventFeed({ events, venues }: Props) {
  const [selectedVenues, setSelectedVenues] = useState<Set<number>>(new Set());
  const [dateRange, setDateRange] = useState('all');
  const [moodCategory, setMoodCategory] = useState<VenueCategory | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const cutoff = useMemo(() => getDateCutoff(dateRange), [dateRange]);

  const filtered = useMemo(() => {
    return events.filter(e => {
      if (selectedVenues.size > 0 && !selectedVenues.has(e.venue_id)) return false;
      if (moodCategory && getVenueCategory(e.venue_id) !== moodCategory) return false;
      if (new Date(e.start_time) > cutoff) return false;
      return true;
    });
  }, [events, selectedVenues, moodCategory, cutoff]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  function toggleVenue(id: number) {
    setSelectedVenues(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleMoodSelect(cat: VenueCategory | null) {
    setMoodCategory(cat);
    setSelectedVenues(new Set());
  }

  return (
    <div className="space-y-8">
      {/* Mood tiles */}
      <MoodTiles active={moodCategory} onSelect={handleMoodSelect} />

      {/* Quick picks */}
      <QuickPicks events={filtered} />

      {/* Surprise me */}
      <SurpriseMe events={filtered} />

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          All Events
        </span>
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      </div>

      {/* Collapsible filters */}
      <div>
        <button
          onClick={() => setShowFilters(f => !f)}
          className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500"
        >
          <svg className={`h-3 w-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
          Filters
          {(selectedVenues.size > 0 || dateRange !== 'all') && (
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500" />
          )}
        </button>

        {showFilters && (
          <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-700/60 dark:bg-zinc-900/50">
            <VenueFilter
              venues={venues}
              selected={selectedVenues}
              onToggle={toggleVenue}
              onClear={() => setSelectedVenues(new Set())}
            />
            <DateFilter value={dateRange} onChange={setDateRange} />
          </div>
        )}
      </div>

      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {filtered.length} event{filtered.length !== 1 ? 's' : ''} found
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="text-zinc-400 dark:text-zinc-500">No events match your filters.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([date, dayEvents]) => (
            <section key={date}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                {date}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {dayEvents.map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
