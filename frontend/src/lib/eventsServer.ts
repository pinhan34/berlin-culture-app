/**
 * Server-side event queries shared by pages and API routes (e.g. the share-image
 * generator). Uses the public anon key — read-only, RLS-safe.
 */

import { createClient } from '@supabase/supabase-js';
import type { Event, Venue } from './types';
import { isAggregatorVenue, isSelfVenueKey } from './venueCategories';

// Every feed query in this file filters it out..
const RETIRED_VENUE_IDS = [4];

/** Rows per request. Supabase returns at most 1000 rows per request by default. */
const PAGE_SIZE = 1000;

/**
 * Every upcoming event, soonest first, with no cap. Fetched in chunks of PAGE_SIZE
 * so nothing is silently cut off (the old homepage query stopped at 500).
 * Filters and taste chips run on the visitor's device and need the whole pool.
 */
export async function fetchAllUpcomingEvents(): Promise<Event[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return [];

  const supabase = createClient(url, anon);
  const now = new Date().toISOString();
  const events: Event[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('events')
      .select('*, venue:venues(*)')
      .gte('start_time', now)
      .not('venue_id', 'in', `(${RETIRED_VENUE_IDS.join(',')})`)
      .order('start_time', { ascending: true })
      .order('id', { ascending: true }) // stable order, so chunks never overlap or skip
      .range(from, from + PAGE_SIZE - 1);

    if (error || !data) break;
    for (const row of data as Event[]) events.push({ ...row, venue: row.venue ?? undefined });
    if (data.length < PAGE_SIZE) break;
  }

  return events;
}

export async function fetchVenues(): Promise<Venue[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return [];

  const supabase = createClient(url, anon);
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .not('id', 'in', `(${RETIRED_VENUE_IDS.join(',')})`)
    .order('name', { ascending: true });

  if (error || !data) return [];
  return data as Venue[];
}

/** Upcoming events whose start falls within [startISO, endISO), soonest first. */
export async function fetchEventsInRange(
  startISO: string,
  endISO: string,
  limit = 6,
): Promise<Event[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return [];

  const supabase = createClient(url, anon);
  const { data, error } = await supabase
    .from('events')
    .select('*, venue:venues(*)')
    .gte('start_time', startISO)
    .lt('start_time', endISO)
    .not('venue_id', 'in', `(${RETIRED_VENUE_IDS.join(',')})`)
    .order('start_time', { ascending: true })
    .limit(limit);

  if (error) return [];

  return (data ?? []).map((row: Event) => ({ ...row, venue: row.venue ?? undefined }));
}

export interface VenueSummary {
  venue_key: string;
  venue_name: string;
  count: number;
}

/**
 * Distinct real venues discovered via the Phase 2 venue_key/venue_name columns,
 * most-frequent first, for the "Find your venue" strip/filter to consume.
 * Not wired into any UI yet — see step 9 of .claude/plans/database-setup.md.
 *
 * Only counts upcoming events with a populated venue_key. Rows without one
 * (unbackfilled aggregator rows, or a source with no venue data at all, e.g.
 * MeetUp) simply aren't represented here — see .claude/specs/VENUE_MODEL.md.
 * Supabase/PostgREST has no server-side GROUP BY, so this fetches the raw
 * (venue_key, venue_name) pairs and aggregates client-side.
 */
export async function fetchDedupedVenues(): Promise<VenueSummary[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return [];

  const supabase = createClient(url, anon);
  const { data, error } = await supabase
    .from('events')
    .select('venue_id, venue_key, venue_name')
    .gte('start_time', new Date().toISOString())
    .not('venue_id', 'in', `(${RETIRED_VENUE_IDS.join(',')})`)
    .not('venue_key', 'is', null);

  if (error || !data) return [];

  const counts = new Map<string, VenueSummary>();
  for (const row of data as { venue_id: number; venue_key: string; venue_name: string | null }[]) {
    if (!isAggregatorVenue(row.venue_id) || isSelfVenueKey(row.venue_id, row.venue_key)) continue;
    const existing = counts.get(row.venue_key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(row.venue_key, {
        venue_key: row.venue_key,
        venue_name: row.venue_name ?? row.venue_key,
        count: 1,
      });
    }
  }

  return [...counts.values()].sort((a, b) => b.count - a.count);
}
