import { createClient } from '@supabase/supabase-js';
import { EventFeed } from '@/components/EventFeed';
import type { Event, Venue } from '@/lib/types';

export const revalidate = 300; // ISR: refresh data every 5 minutes

async function getData(): Promise<{ events: Event[]; venues: Venue[] }> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const now = new Date().toISOString();

  const [eventsRes, venuesRes] = await Promise.all([
    supabase
      .from('events')
      .select('*, venue:venues(*)')
      .gte('start_time', now)
      .order('start_time', { ascending: true })
      .limit(500),
    supabase
      .from('venues')
      .select('*')
      .order('name', { ascending: true }),
  ]);

  const events: Event[] = (eventsRes.data ?? []).map((row: any) => ({
    ...row,
    venue: row.venue ?? undefined,
  }));

  const venues: Venue[] = venuesRes.data ?? [];

  return { events, venues };
}

export default async function Home() {
  const { events, venues } = await getData();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Upcoming Events
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Curated from {venues.length} venues across Berlin
        </p>
      </div>

      <EventFeed events={events} venues={venues} />
    </div>
  );
}
