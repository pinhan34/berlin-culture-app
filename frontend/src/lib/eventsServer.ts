/**
 * Server-side event queries shared by pages and API routes (e.g. the share-image
 * generator). Uses the public anon key — read-only, RLS-safe.
 */

import { createClient } from '@supabase/supabase-js';
import type { Event } from './types';
import { isAggregatorVenue } from './venueCategories';

// venue_id 4 (neurodivergent-berlin.com) is retired — MeetUp (id 2) covers it with
// better data. Kept in sync with the homepage query in app/page.tsx.
const RETIRED_VENUE_IDS = [4];

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

  return (data ?? []).map((row: any) => ({ ...row, venue: row.venue ?? undefined }));
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
    if (!isAggregatorVenue(row.venue_id)) continue;
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
