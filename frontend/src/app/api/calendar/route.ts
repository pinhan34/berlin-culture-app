import { createClient } from '@supabase/supabase-js';
import { generateFeedICS } from '@/lib/ics';
import type { Event } from '@/lib/types';

// Refresh the feed every hour — calendar apps poll on their own schedule
export const revalidate = 3600;

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

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

  const events: Event[] = (data ?? []).map((row: any) => ({
    ...row,
    venue: row.venue ?? undefined,
  }));

  const ics = generateFeedICS(events);

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="berlin-culture.ics"',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
