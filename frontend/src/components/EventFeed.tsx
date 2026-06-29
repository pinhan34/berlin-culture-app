'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Event, Venue } from '@/lib/types';
import { getVenueCategory, type VenueCategory } from '@/lib/venueCategories';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { getInteractions, type Interaction } from '@/lib/interactions';
import { buildTasteProfile, scoreEvent } from '@/lib/recommendations';
import { getEventVibes, type Vibe } from '@/lib/vibes';
import { getEventCommunities, type Community } from '@/lib/communities';
import { EventCard } from './EventCard';
import { VenueFilter } from './VenueFilter';
import { DateFilter } from './DateFilter';
import { QuickPicks } from './QuickPicks';
import { SurpriseMe } from './SurpriseMe';
import { JustAdded } from './JustAdded';
import { ForYou } from './ForYou';
import { MoodTiles } from './MoodTiles';
import { VibeBar } from './VibeBar';
import { CommunityLanes } from './CommunityLanes';
import { CalendarSubscribe } from './CalendarSubscribe';

interface Props {
  events: Event[];
  venues: Venue[];
}

/** Events scraped within this window are considered "new". */
const NEW_WINDOW_HOURS = 48;
/** Max cards shown in the "Just added" strip. */
const JUST_ADDED_LIMIT = 6;
/**
 * If more than this fraction of all events are "new" (e.g. right after a full
 * DB wipe + re-scrape), the freshness UI is noise — suppress it.
 */
const FRESH_NOISE_THRESHOLD = 0.4;

/** Minimum taste signals (clicks/saves/favourites) before personalization kicks in. */
const TASTE_THRESHOLD = 3;
/** Max cards shown in the "For you" row. */
const FOR_YOU_LIMIT = 6;

function timeAgo(ms: number): string {
  const diffMin = Math.floor((Date.now() - ms) / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min${diffMin !== 1 ? 's' : ''} ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} hour${diffH !== 1 ? 's' : ''} ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD} day${diffD !== 1 ? 's' : ''} ago`;
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

/**
 * Fix 3 — round-robin through categories within a single day so no
 * single source (e.g. Telegram) dominates the top of any given day.
 * Art → Music → Community → Personal → Art → ...
 */
function interleaveByCategory(dayEvents: Event[]): Event[] {
  const buckets: Record<string, Event[]> = {};
  for (const e of dayEvents) {
    const cat = getVenueCategory(e.venue_id);
    (buckets[cat] ??= []).push(e);
  }
  const queues = Object.values(buckets);
  const result: Event[] = [];
  while (queues.some(q => q.length > 0)) {
    for (const queue of queues) {
      const item = queue.shift();
      if (item) result.push(item);
    }
  }
  return result;
}

/** Fix 2 — max events shown per venue in the default (unfiltered) view. */
const VENUE_DISPLAY_CAP = 30;

/** Telegram venue id — events without a real external URL are excluded. */
const TELEGRAM_VENUE_ID = 7;

/** Sinema Transtopia gets a lower cap so it doesn't crowd out Art at Berlin in the Art category. */
const VENUE_CAP_OVERRIDES: Record<number, number> = {
  1: 15, // Sinema Transtopia — many screenings, keep balanced with gallery events
};

function isQualityEvent(e: Event): boolean {
  // Block stale t.me fallback URLs left in the DB from before the enrichment fix
  if (e.event_url?.startsWith('https://t.me/')) return false;
  return true;
}

export function EventFeed({ events, venues }: Props) {
  // Persisted filter preferences — survive page reload
  const [moodCategory, setMoodCategoryRaw] = useLocalStorage<VenueCategory | null>('bca_mood', null);
  const [venueArray, setVenueArray] = useLocalStorage<number[]>('bca_venues', []);
  const [dateRange, setDateRange] = useLocalStorage<string>('bca_date', 'all');
  const [favouriteIds, setFavouriteIds] = useLocalStorage<number[]>('bca_favourites', []);
  const [selectedVibe, setSelectedVibe] = useLocalStorage<Vibe | null>('bca_vibe', null);
  const [selectedCommunity, setSelectedCommunity] = useLocalStorage<Community | null>('bca_community', null);

  // Session-only UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showFavourites, setShowFavourites] = useState(false);

  const selectedVenues = useMemo(() => new Set(venueArray), [venueArray]);
  const favouriteSet = useMemo(() => new Set(favouriteIds), [favouriteIds]);

  const cutoff = useMemo(() => getDateCutoff(dateRange), [dateRange]);

  // Quality filter + per-venue cap + URL-level dedup — applied before any user filtering.
  const cappedEvents = useMemo(() => {
    const countByVenue = new Map<number, number>();
    const seenUrls = new Set<string>();
    return events.filter(e => {
      if (!isQualityEvent(e)) return false;
      // Deduplicate by event_url: same URL from multiple scraper runs = same event
      if (e.event_url) {
        if (seenUrls.has(e.event_url)) return false;
        seenUrls.add(e.event_url);
      }
      const cap = VENUE_CAP_OVERRIDES[e.venue_id] ?? VENUE_DISPLAY_CAP;
      const n = countByVenue.get(e.venue_id) ?? 0;
      if (n >= cap) return false;
      countByVenue.set(e.venue_id, n + 1);
      return true;
    });
  }, [events]);

  // Freshness — which events were scraped recently, and when the data was last refreshed.
  const { newIds, lastUpdated, isFreshData } = useMemo(() => {
    const now = Date.now();
    const windowMs = NEW_WINDOW_HOURS * 3_600_000;
    const ids = new Set<number>();
    let maxCreated = 0;
    for (const e of cappedEvents) {
      const created = e.created_at ? new Date(e.created_at).getTime() : 0;
      if (created > maxCreated) maxCreated = created;
      if (created > 0 && now - created <= windowMs) ids.add(e.id);
    }
    // Suppress freshness UI when almost everything is "new" (e.g. after a wipe).
    const fresh =
      cappedEvents.length > 0 &&
      ids.size > 0 &&
      ids.size / cappedEvents.length < FRESH_NOISE_THRESHOLD;
    return { newIds: ids, lastUpdated: maxCreated, isFreshData: fresh };
  }, [cappedEvents]);

  // Avoid hydration mismatch: load client-only signals (timestamps, taste) after mount.
  const [mounted, setMounted] = useState(false);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  useEffect(() => {
    setMounted(true);
    setInteractions(getInteractions());
  }, []);

  // Taste profile from local signals (clicks, calendar saves, favourites).
  const profile = useMemo(
    () => buildTasteProfile(cappedEvents, interactions, favouriteIds),
    [cappedEvents, interactions, favouriteIds],
  );
  const hasTaste = mounted && profile.totalSignals >= TASTE_THRESHOLD;

  // Precompute vibe tags per event once.
  const vibesByEvent = useMemo(() => {
    const map = new Map<number, Vibe[]>();
    for (const e of cappedEvents) map.set(e.id, getEventVibes(e));
    return map;
  }, [cappedEvents]);

  // Precompute community membership per event once.
  const communitiesByEvent = useMemo(() => {
    const map = new Map<number, Community[]>();
    for (const e of cappedEvents) map.set(e.id, getEventCommunities(e));
    return map;
  }, [cappedEvents]);

  // Fix 1 — category counts for mood tile badges (based on capped, date-bounded set)
  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<VenueCategory, number>> = {};
    for (const e of cappedEvents) {
      if (new Date(e.start_time) > cutoff) continue;
      const cat = getVenueCategory(e.venue_id);
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
    return counts;
  }, [cappedEvents, cutoff]);

  // Vibe counts for the vibe filter bar (capped, date-bounded set).
  const vibeCounts = useMemo(() => {
    const counts: Partial<Record<Vibe, number>> = {};
    for (const e of cappedEvents) {
      if (new Date(e.start_time) > cutoff) continue;
      for (const v of vibesByEvent.get(e.id) ?? []) {
        counts[v] = (counts[v] ?? 0) + 1;
      }
    }
    return counts;
  }, [cappedEvents, cutoff, vibesByEvent]);

  // Community counts for the community lanes (capped, date-bounded set).
  const communityCounts = useMemo(() => {
    const counts: Partial<Record<Community, number>> = {};
    for (const e of cappedEvents) {
      if (new Date(e.start_time) > cutoff) continue;
      for (const c of communitiesByEvent.get(e.id) ?? []) {
        counts[c] = (counts[c] ?? 0) + 1;
      }
    }
    return counts;
  }, [cappedEvents, cutoff, communitiesByEvent]);

  const filtered = useMemo(() => {
    return cappedEvents.filter(e => {
      if (showFavourites && !favouriteSet.has(e.id)) return false;
      if (!showFavourites) {
        if (selectedVenues.size > 0 && !selectedVenues.has(e.venue_id)) return false;
        if (moodCategory && getVenueCategory(e.venue_id) !== moodCategory) return false;
      }
      if (selectedVibe && !(vibesByEvent.get(e.id) ?? []).includes(selectedVibe)) return false;
      if (selectedCommunity && !(communitiesByEvent.get(e.id) ?? []).includes(selectedCommunity)) return false;
      if (new Date(e.start_time) > cutoff) return false;
      return true;
    });
  }, [cappedEvents, selectedVenues, moodCategory, cutoff, showFavourites, favouriteSet, selectedVibe, vibesByEvent, selectedCommunity, communitiesByEvent]);

  const isDefaultView = !moodCategory && selectedVenues.size === 0 && !showFavourites;

  // "Just added" strip — most recently scraped events (by created_at), surfaced
  // at the top so new content isn't buried in the chronological list.
  const justAdded = useMemo(() => {
    if (!isFreshData) return [];
    return filtered
      .filter(e => newIds.has(e.id))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, JUST_ADDED_LIMIT);
  }, [filtered, newIds, isFreshData]);

  // "For you" row — top events ranked by the local taste profile. Only in the
  // default view, and only once there's enough signal to be meaningful.
  const forYou = useMemo(() => {
    if (!hasTaste || !isDefaultView) return [];
    return filtered
      .map(e => ({ e, score: scoreEvent(e, profile) }))
      .filter(x => x.score > 0)
      .sort((a, b) =>
        b.score - a.score ||
        new Date(a.e.start_time).getTime() - new Date(b.e.start_time).getTime())
      .slice(0, FOR_YOU_LIMIT)
      .map(x => x.e);
  }, [filtered, profile, hasTaste, isDefaultView]);

  // Default view: personalize within-day ordering once we know the user's taste;
  // otherwise interleave by category so no single source dominates a day.
  // A specific mood/venue/favourites filter keeps plain chronological order.
  const grouped = useMemo(() => {
    const groups = groupByDate(filtered);
    if (isDefaultView) {
      for (const [date, dayEvents] of groups) {
        if (hasTaste) {
          groups.set(date, [...dayEvents].sort((a, b) =>
            scoreEvent(b, profile) - scoreEvent(a, profile) ||
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime()));
        } else {
          groups.set(date, interleaveByCategory(dayEvents));
        }
      }
    }
    return groups;
  }, [filtered, isDefaultView, hasTaste, profile]);

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
      {/* Last updated */}
      {mounted && lastUpdated > 0 && (
        <div className="flex items-center justify-end gap-1.5 text-xs text-stone-400 dark:text-stone-500">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
          Updated {timeAgo(lastUpdated)}
        </div>
      )}

      {/* Community lanes */}
      <CommunityLanes active={selectedCommunity} onSelect={setSelectedCommunity} counts={communityCounts} />

      {/* Mood tiles */}
      <MoodTiles active={moodCategory} onSelect={handleMoodSelect} counts={categoryCounts} />

      {/* Vibe filter */}
      <VibeBar active={selectedVibe} onSelect={setSelectedVibe} counts={vibeCounts} />

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

      {/* For you */}
      <ForYou
        events={forYou}
        isFavourited={(id) => favouriteSet.has(id)}
        onFavouriteToggle={handleFavouriteToggle}
      />

      {/* Just added */}
      <JustAdded events={justAdded} />

      {/* Quick picks */}
      <QuickPicks events={filtered} />

      {/* Surprise me */}
      <SurpriseMe events={filtered} />

      {/* Subscribe to calendar */}
      <CalendarSubscribe
        favouriteIds={favouriteIds}
        venueIds={venueArray}
        vibe={selectedVibe}
        community={selectedCommunity}
      />

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
                      isNew={isFreshData && newIds.has(event.id)}
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
