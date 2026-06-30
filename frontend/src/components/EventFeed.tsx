'use client';

import { useState, useMemo, useEffect, useCallback, type ReactNode } from 'react';
import type { Event, Venue } from '@/lib/types';
import { getVenueDisplayName } from '@/lib/venueCategories';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { getInteractions, type Interaction } from '@/lib/interactions';
import { buildTasteProfile, scoreEvent } from '@/lib/recommendations';
import { getEventVibes, VIBE_DEFS, getVibeDef, type Vibe } from '@/lib/vibes';
import { getEventCommunities, getCommunityDef, type Community } from '@/lib/communities';
import { EventCard } from './EventCard';
import { VenueFilter } from './VenueFilter';
import { DateFilter } from './DateFilter';
import { QuickPicks } from './QuickPicks';
import { SurpriseMe } from './SurpriseMe';
import { JustAdded } from './JustAdded';
import { ForYou } from './ForYou';
import { MoodTiles } from './MoodTiles';
import { CommunityLanes } from './CommunityLanes';
import { CalendarSubscribe } from './CalendarSubscribe';
import { ActiveFilters, type ActiveFilterChip } from './ActiveFilters';

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

/** Valid vibe keys — used to discard a persisted vibe that has since been retired. */
const VALID_VIBES = new Set<Vibe>(VIBE_DEFS.map(d => d.vibe));

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

function startOfDay(d: Date): Date { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date): Date { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

/**
 * Resolve a date filter value into a [start, end] window (ms). Supports presets
 * (today / tomorrow / weekend / week / month / all) plus a specific YYYY-MM-DD.
 */
function getDateWindow(range: string): { start: number; end: number } {
  const now = new Date();
  const FAR = new Date(9999, 11, 31).getTime();
  switch (range) {
    case 'today':
      return { start: now.getTime(), end: endOfDay(now).getTime() };
    case 'tomorrow': {
      const t = startOfDay(now); t.setDate(t.getDate() + 1);
      return { start: t.getTime(), end: endOfDay(t).getTime() };
    }
    case 'weekend': {
      const day = now.getDay(); // 0 Sun .. 6 Sat
      const sat = startOfDay(now);
      sat.setDate(sat.getDate() + ((6 - day + 7) % 7));
      const sun = new Date(sat); sun.setDate(sun.getDate() + 1);
      const start = (day === 0 || day === 6) ? now.getTime() : sat.getTime();
      return { start, end: endOfDay(sun).getTime() };
    }
    case 'week': {
      const end = endOfDay(now); end.setDate(end.getDate() + (7 - now.getDay()));
      return { start: now.getTime(), end: end.getTime() };
    }
    case 'month':
      return { start: now.getTime(), end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime() };
    case 'all':
      return { start: 0, end: FAR };
    default: {
      const d = new Date(`${range}T00:00:00`);
      if (!Number.isNaN(d.getTime())) return { start: startOfDay(d).getTime(), end: endOfDay(d).getTime() };
      return { start: 0, end: FAR };
    }
  }
}

function dateRangeLabel(range: string): string {
  switch (range) {
    case 'today': return 'Today';
    case 'tomorrow': return 'Tomorrow';
    case 'weekend': return 'This weekend';
    case 'week': return 'This week';
    case 'month': return 'This month';
    case 'all': return 'All upcoming';
    default: {
      const d = new Date(`${range}T00:00:00`);
      return Number.isNaN(d.getTime())
        ? 'All upcoming'
        : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    }
  }
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
 * Round-robin across *venues* within a single day so no single high-volume
 * source (Village Berlin, Telegram) dominates the top of the list.
 */
function interleaveByVenue(dayEvents: Event[]): Event[] {
  const buckets = new Map<number, Event[]>();
  for (const e of dayEvents) {
    const arr = buckets.get(e.venue_id) ?? [];
    arr.push(e);
    buckets.set(e.venue_id, arr);
  }
  const queues = [...buckets.values()];
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
  const [venueArray, setVenueArray] = useLocalStorage<number[]>('bca_venues', []);
  const [dateRange, setDateRange] = useLocalStorage<string>('bca_date', 'all');
  const [favouriteIds, setFavouriteIds] = useLocalStorage<number[]>('bca_favourites', []);
  const [selectedVibe, setSelectedVibe] = useLocalStorage<Vibe | null>('bca_vibe', null);
  const [selectedCommunity, setSelectedCommunity] = useLocalStorage<Community | null>('bca_community', null);

  // Session-only UI state
  const [showFavourites, setShowFavourites] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const selectedVenues = useMemo(() => new Set(venueArray), [venueArray]);
  const favouriteSet = useMemo(() => new Set(favouriteIds), [favouriteIds]);

  const dateWindow = useMemo(() => getDateWindow(dateRange), [dateRange]);

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

  // Discard a persisted vibe that no longer exists (e.g. the retired "queer"
  // vibe, now a Community lane) so it can't get stuck as an invisible filter.
  useEffect(() => {
    if (selectedVibe && !VALID_VIBES.has(selectedVibe)) setSelectedVibe(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVibe]);

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

  // Single source of truth for filtering. `skip` lets us compute each filter
  // dimension's badge count as if that one dimension were not yet applied, so
  // the counts always reflect the *combined* active filters (no misleading
  // standalone numbers that resolve to zero results).
  const passes = useCallback(
    (
      e: Event,
      skip?: { vibe?: boolean; community?: boolean; venue?: boolean },
    ): boolean => {
      if (showFavourites) {
        if (!favouriteSet.has(e.id)) return false;
      } else if (!skip?.venue && selectedVenues.size > 0 && !selectedVenues.has(e.venue_id)) {
        return false;
      }
      if (!skip?.vibe && selectedVibe && !(vibesByEvent.get(e.id) ?? []).includes(selectedVibe)) return false;
      if (!skip?.community && selectedCommunity && !(communitiesByEvent.get(e.id) ?? []).includes(selectedCommunity)) return false;
      const t = new Date(e.start_time).getTime();
      if (t < dateWindow.start || t > dateWindow.end) return false;
      return true;
    },
    [showFavourites, favouriteSet, selectedVenues, selectedVibe, vibesByEvent, selectedCommunity, communitiesByEvent, dateWindow],
  );

  const filtered = useMemo(() => cappedEvents.filter(e => passes(e)), [cappedEvents, passes]);

  // Combined-aware badge counts (each excludes only its own dimension).
  const vibeCounts = useMemo(() => {
    const counts: Partial<Record<Vibe, number>> = {};
    for (const e of cappedEvents) {
      if (!passes(e, { vibe: true })) continue;
      for (const v of vibesByEvent.get(e.id) ?? []) counts[v] = (counts[v] ?? 0) + 1;
    }
    return counts;
  }, [cappedEvents, passes, vibesByEvent]);

  const communityCounts = useMemo(() => {
    const counts: Partial<Record<Community, number>> = {};
    for (const e of cappedEvents) {
      if (!passes(e, { community: true })) continue;
      for (const c of communitiesByEvent.get(e.id) ?? []) counts[c] = (counts[c] ?? 0) + 1;
    }
    return counts;
  }, [cappedEvents, passes, communitiesByEvent]);

  const isDefaultView = selectedVenues.size === 0 && !showFavourites;

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
          groups.set(date, interleaveByVenue(dayEvents));
        }
      }
    }
    return groups;
  }, [filtered, isDefaultView, hasTaste, profile]);

  function toggleVenue(id: number) {
    setVenueArray(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  }

  function handleFavouriteToggle(eventId: number) {
    setFavouriteIds(prev =>
      prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId],
    );
  }

  function handleShowFavourites() {
    setShowFavourites(prev => !prev);
  }

  function clearAllFilters() {
    setVenueArray([]);
    setSelectedVibe(null);
    setSelectedCommunity(null);
    setDateRange('all');
    setShowFavourites(false);
  }

  // Build the explicit "active filters" chips shown above the feed.
  const venueNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const v of venues) m.set(v.id, getVenueDisplayName(v.id, v.name));
    return m;
  }, [venues]);

  const activeChips: ActiveFilterChip[] = [];
  if (showFavourites) {
    activeChips.push({ id: 'fav', label: 'Saved', emoji: '\u2764\uFE0F', onRemove: () => setShowFavourites(false) });
  }
  if (selectedCommunity) {
    const def = getCommunityDef(selectedCommunity);
    activeChips.push({ id: 'community', label: def.title, emoji: def.emoji, onRemove: () => setSelectedCommunity(null) });
  }
  if (selectedVibe) {
    const def = getVibeDef(selectedVibe);
    activeChips.push({ id: 'vibe', label: def.label, emoji: def.emoji, onRemove: () => setSelectedVibe(null) });
  }
  if (dateRange !== 'all') {
    activeChips.push({
      id: 'date',
      label: dateRangeLabel(dateRange),
      emoji: '\u{1F4C5}',
      onRemove: () => setDateRange('all'),
    });
  }
  for (const id of venueArray) {
    activeChips.push({
      id: `venue-${id}`,
      label: venueNameById.get(id) ?? `Venue #${id}`,
      emoji: '\u{1F4CD}',
      onRemove: () => toggleVenue(id),
    });
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

      {/* ───────── Unified filter panel: 4 distinct, numbered filters ───────── */}
      <div className="space-y-4 rounded-2xl border border-stone-200 bg-gradient-to-b from-stone-50 to-stone-100/40 p-3 dark:border-purple-900/40 dark:from-[#16101e]/70 dark:to-[#120c1a]/40 sm:p-4">
        <FilterSection step={1} emoji={'\u{1F3AD}'} title="Find your scene" accent="fuchsia">
          <CommunityLanes active={selectedCommunity} onSelect={setSelectedCommunity} counts={communityCounts} />
        </FilterSection>

        <FilterSection step={2} emoji={'\u2728'} title="What are you in the mood for?" accent="amber">
          <MoodTiles active={selectedVibe} onSelect={setSelectedVibe} counts={vibeCounts} />
        </FilterSection>

        <FilterSection step={3} emoji={'\u{1F4CD}'} title="Find your venue" accent="violet">
          <VenueFilter
            venues={venues}
            selected={selectedVenues}
            onToggle={toggleVenue}
            onClear={() => setVenueArray([])}
          />
        </FilterSection>

        <FilterSection step={4} emoji={'\u{1F5D3}\uFE0F'} title="When are you free?" accent="emerald">
          <DateFilter value={dateRange} onChange={setDateRange} />
        </FilterSection>

        {favouriteIds.length > 0 && (
          <div className="flex justify-center pt-1">
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
      </div>

      {/* Active filters summary — explicit reminder of current view */}
      {mounted && (
        <ActiveFilters count={filtered.length} chips={activeChips} onClearAll={clearAllFilters} />
      )}

      {/* Surprise me — eye-catching animated reveal of the wheel */}
      <div>
        <button
          type="button"
          onClick={() => setShowMore(p => !p)}
          className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-fuchsia-600 via-pink-500 to-amber-400 px-6 py-4 shadow-lg transition-all hover:shadow-xl hover:brightness-110 active:scale-[0.99]"
        >
          <span className="animate-bounce text-2xl" aria-hidden="true">{'\u{1F3B2}'}</span>
          <span className="font-heading text-base font-extrabold tracking-tight text-white drop-shadow sm:text-lg">
            {showMore ? 'Hide the surprise' : 'Still not decided? Spin for a surprise!'}
          </span>
          <span className="animate-bounce text-2xl [animation-delay:150ms]" aria-hidden="true">{'\u2728'}</span>
          <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/30 blur-md transition-all duration-700 group-hover:left-[120%]" />
        </button>

        {showMore && (
          <div className="mt-5 space-y-8">
            <SurpriseMe events={filtered} favouriteIds={favouriteIds} />
            <QuickPicks events={filtered} />
            <CalendarSubscribe
              favouriteIds={favouriteIds}
              venueIds={venueArray}
              vibe={selectedVibe}
              community={selectedCommunity}
            />
          </div>
        )}
      </div>

      {/* For you */}
      <ForYou
        events={forYou}
        isFavourited={(id) => favouriteSet.has(id)}
        onFavouriteToggle={handleFavouriteToggle}
      />

      {/* Just added */}
      <JustAdded events={justAdded} />

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-stone-200 dark:bg-purple-900/40" />
        <span className="font-heading text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">
          Browse everything
        </span>
        <div className="h-px flex-1 bg-stone-200 dark:bg-purple-900/40" />
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

type Accent = 'fuchsia' | 'amber' | 'violet' | 'emerald';

const SECTION_ACCENTS: Record<Accent, { badge: string; title: string; ring: string }> = {
  fuchsia: {
    badge: 'from-fuchsia-500 to-pink-500',
    title: 'from-fuchsia-600 to-pink-500 dark:from-fuchsia-400 dark:to-pink-400',
    ring: 'border-fuchsia-200/80 dark:border-fuchsia-900/40',
  },
  amber: {
    badge: 'from-amber-500 to-orange-500',
    title: 'from-amber-600 to-orange-500 dark:from-amber-400 dark:to-orange-400',
    ring: 'border-amber-200/80 dark:border-amber-900/40',
  },
  violet: {
    badge: 'from-violet-500 to-purple-500',
    title: 'from-violet-600 to-purple-500 dark:from-violet-400 dark:to-purple-400',
    ring: 'border-violet-200/80 dark:border-violet-900/40',
  },
  emerald: {
    badge: 'from-emerald-500 to-teal-500',
    title: 'from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-400',
    ring: 'border-emerald-200/80 dark:border-emerald-900/40',
  },
};

function FilterSection({
  step,
  emoji,
  title,
  accent,
  children,
}: {
  step: number;
  emoji: string;
  title: string;
  accent: Accent;
  children: ReactNode;
}) {
  const a = SECTION_ACCENTS[accent];
  return (
    <section className={`rounded-xl border bg-white/70 p-4 shadow-sm dark:bg-[#1a1326]/40 ${a.ring}`}>
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-extrabold text-white shadow-sm ${a.badge}`}
        >
          {step}
        </span>
        <h3 className="font-heading flex items-center gap-1.5 text-base font-extrabold tracking-tight sm:text-lg">
          <span aria-hidden="true">{emoji}</span>
          <span className={`bg-gradient-to-r bg-clip-text text-transparent ${a.title}`}>{title}</span>
        </h3>
      </div>
      {children}
    </section>
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
