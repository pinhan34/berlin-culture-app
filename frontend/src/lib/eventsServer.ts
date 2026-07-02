/**
 * Server-side event queries shared by pages and API routes (e.g. the share-image
 * generator). Uses the public anon key — read-only, RLS-safe.
 */

import { createClient } from '@supabase/supabase-js';
import type { Event } from './types';

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
