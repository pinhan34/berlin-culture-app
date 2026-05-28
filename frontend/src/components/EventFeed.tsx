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
        <div className="h-px flex-1 bg-stone-200 dark:bg-purple-900/40" />
        <span className="font-heading text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">
          Browse everything
        </span>
        <div className="h-px flex-1 bg-stone-200 dark:bg-purple-900/40" />
      </div>

      {/* Collapsible filters */}
      <div>
        <button
          onClick={() => setShowFilters(f => !f)}
          className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all active:scale-95 ${
            showFilters || selectedVenues.size > 0 || dateRange !== 'all'
              ? 'bg-fuchsia-600 text-white shadow-sm hover:bg-fuchsia-700 dark:bg-fuchsia-500 dark:hover:bg-fuchsia-600'
              : 'border border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100 hover:shadow-sm dark:border-fuchsia-700 dark:bg-fuchsia-950/30 dark:text-fuchsia-300 dark:hover:bg-fuchsia-950/50'
          }`}
        >
          <svg className={`h-3 w-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
          Filter &amp; explore
          {(selectedVenues.size > 0 || dateRange !== 'all') && (
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-white dark:bg-fuchsia-200" />
          )}
        </button>

        {showFilters && (
          <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50/50 p-4 dark:border-purple-900/40 dark:bg-[#16101e]/50">
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

      <p className="animate-fade-up font-heading text-lg font-bold text-stone-700 dark:text-stone-200">
        <span className="bg-gradient-to-r from-fuchsia-600 to-pink-500 bg-clip-text text-transparent dark:from-fuchsia-400 dark:to-pink-400">
          {filtered.length}
        </span>
        {' '}{filtered.length !== 1 ? 'things' : 'thing'} to do
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 py-16 text-center dark:border-purple-900/40">
          <p className="text-stone-400 dark:text-stone-500">Nothing matches that vibe right now &mdash; try widening your dates or mood?</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([date, dayEvents]) => (
            <section key={date}>
              <h2 className="font-heading mb-3 text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                {date}
              </h2>
              <div className={`grid gap-3 ${
                dayEvents.length === 1
                  ? 'sm:grid-cols-1 lg:max-w-md'
                  : dayEvents.length === 2
                    ? 'sm:grid-cols-2 lg:grid-cols-2'
                    : 'sm:grid-cols-2 lg:grid-cols-3'
              }`}>
                {dayEvents.map((event, i) => (
                  <div key={event.id} className={`animate-fade-up stagger-${Math.min(i + 1, 9)}`}>
                    <EventCard event={event} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
