import { createClient } from '@supabase/supabase-js';
import { EventFeed } from '@/components/EventFeed';
import { VenueStrip } from '@/components/VenueStrip';
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
        <h2 className="font-heading text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          What&apos;s happening in Berlin
        </h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Hand-picked from {venues.length} of Berlin&apos;s best cultural spots
        </p>
      </div>

      <VenueStrip venues={venues} />

      <EventFeed events={events} venues={venues} />
    </div>
  );
}
