'use client';

import { useState, useMemo } from 'react';
import type { Event, Venue } from '@/lib/types';
import { getVenueCategory, type VenueCategory } from '@/lib/venueCategories';
import { useLocalStorage } from '@/lib/useLocalStorage';
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
  // Persisted filter preferences — survive page reload
  const [moodCategory, setMoodCategoryRaw] = useLocalStorage<VenueCategory | null>('bca_mood', null);
  const [venueArray, setVenueArray] = useLocalStorage<number[]>('bca_venues', []);
  const [dateRange, setDateRange] = useLocalStorage<string>('bca_date', 'all');
  const [favouriteIds, setFavouriteIds] = useLocalStorage<number[]>('bca_favourites', []);

  // Session-only UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showFavourites, setShowFavourites] = useState(false);

  const selectedVenues = useMemo(() => new Set(venueArray), [venueArray]);
  const favouriteSet = useMemo(() => new Set(favouriteIds), [favouriteIds]);

  const cutoff = useMemo(() => getDateCutoff(dateRange), [dateRange]);

  const filtered = useMemo(() => {
    return events.filter(e => {
      if (showFavourites && !favouriteSet.has(e.id)) return false;
      if (!showFavourites) {
        if (selectedVenues.size > 0 && !selectedVenues.has(e.venue_id)) return false;
        if (moodCategory && getVenueCategory(e.venue_id) !== moodCategory) return false;
      }
      if (new Date(e.start_time) > cutoff) return false;
      return true;
    });
  }, [events, selectedVenues, moodCategory, cutoff, showFavourites, favouriteSet]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  function toggleVenue(id: number) {
    setVenueArray(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  }

  function handleMoodSelect(cat: VenueCategory | null) {
    setMoodCategoryRaw(cat);
    setVenueArray([]);
    setShowFavourites(false);
  }

  function handleFavouriteToggle(eventId: number) {
    setFavouriteIds(prev =>
      prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId],
    );
  }

  function handleShowFavourites() {
    setShowFavourites(prev => !prev);
    if (!showFavourites) setMoodCategoryRaw(null);
  }

  return (
    <div className="space-y-8">
      {/* Mood tiles */}
      <MoodTiles active={moodCategory} onSelect={handleMoodSelect} />

      {/* Saved events toggle */}
      {favouriteIds.length > 0 && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleShowFavourites}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition-all active:scale-95 ${
              showFavourites
                ? 'bg-pink-500 text-white shadow-md hover:bg-pink-600 dark:bg-pink-600 dark:hover:bg-pink-500'
                : 'border-2 border-pink-300 bg-pink-50 text-pink-600 hover:bg-pink-100 dark:border-pink-700 dark:bg-pink-950/30 dark:text-pink-400 dark:hover:bg-pink-950/50'
            }`}
          >
            <HeartButtonIcon filled={showFavourites} />
            {showFavourites ? 'All events' : `Saved (${favouriteIds.length})`}
          </button>
        </div>
      )}

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
          type="button"
          onClick={() => { setShowFilters(prev => !prev); }}
          className={`mb-3 inline-flex cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold uppercase tracking-wide transition-all active:scale-95 ${
            showFilters || selectedVenues.size > 0 || dateRange !== 'all'
              ? 'bg-fuchsia-600 text-white shadow-md hover:bg-fuchsia-700 dark:bg-fuchsia-500 dark:hover:bg-fuchsia-600'
              : 'border-2 border-fuchsia-400 bg-fuchsia-50 text-fuchsia-700 shadow-sm hover:bg-fuchsia-100 hover:shadow-md dark:border-fuchsia-600 dark:bg-fuchsia-950/30 dark:text-fuchsia-300 dark:hover:bg-fuchsia-950/50'
          }`}
        >
          <svg className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
          Filter &amp; Explore
          {(selectedVenues.size > 0 || dateRange !== 'all') && (
            <span className="inline-block h-2 w-2 rounded-full bg-white dark:bg-fuchsia-200" />
          )}
        </button>

        {showFilters && (
          <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50/50 p-4 dark:border-purple-900/40 dark:bg-[#16101e]/50">
            <VenueFilter
              venues={venues}
              selected={selectedVenues}
              onToggle={toggleVenue}
              onClear={() => setVenueArray([])}
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
                    <EventCard
                      event={event}
                      isFavourited={favouriteSet.has(event.id)}
                      onFavouriteToggle={handleFavouriteToggle}
                    />
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

function HeartButtonIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
    </svg>
  ) : (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  );
}
