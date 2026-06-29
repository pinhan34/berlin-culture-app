import { createClient } from '@supabase/supabase-js';
import { generateFeedICS } from '@/lib/ics';
import { getEventVibes, VIBE_DEFS, type Vibe } from '@/lib/vibes';
import { getEventCommunities, getCommunityDef, type Community } from '@/lib/communities';
import type { Event } from '@/lib/types';

// Refresh the feed every hour — calendar apps poll on their own schedule
export const revalidate = 3600;

const VIBE_KEYS = new Set<string>(VIBE_DEFS.map(d => d.vibe));
const COMMUNITY_KEYS = new Set<string>(['queer', 'neurodivergent']);

function parseIdList(raw: string | null): number[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map(s => Number(s.trim()))
    .filter(n => Number.isInteger(n) && n > 0);
}

export async function GET(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { searchParams } = new URL(request.url);
  const venueIds = parseIdList(searchParams.get('venues'));
  const favouriteIds = new Set(parseIdList(searchParams.get('fav')));
  const vibe = searchParams.get('vibe') as Vibe | null;
  const community = searchParams.get('community') as Community | null;

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('events')
    .select('*, venue:venues(*)')
    .gte('start_time', now)
    .not('venue_id', 'in', '(4)')
    .order('start_time', { ascending: true })
    .limit(500);

  if (error) {
    return new Response('Failed to fetch events', { status: 500 });
  }

  let events: Event[] = (data ?? []).map((row: any) => ({
    ...row,
    venue: row.venue ?? undefined,
  }));

  // Build a human-readable calendar name describing the filter.
  const nameParts: string[] = [];

  if (favouriteIds.size > 0) {
    events = events.filter(e => favouriteIds.has(e.id));
    nameParts.push('My favourites');
  }
  if (venueIds.length > 0) {
    const set = new Set(venueIds);
    events = events.filter(e => set.has(e.venue_id));
    nameParts.push('Selected venues');
  }
  if (vibe && VIBE_KEYS.has(vibe)) {
    events = events.filter(e => getEventVibes(e).includes(vibe));
    nameParts.push(VIBE_DEFS.find(d => d.vibe === vibe)!.label);
  }
  if (community && COMMUNITY_KEYS.has(community)) {
    events = events.filter(e => getEventCommunities(e).includes(community));
    nameParts.push(getCommunityDef(community).title);
  }

  const calendarName = nameParts.length > 0
    ? `Berlin Culture — ${nameParts.join(' · ')}`
    : 'Berlin Culture';

  const ics = generateFeedICS(events, calendarName);

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="berlin-culture.ics"',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
