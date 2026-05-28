import { createClient } from '@supabase/supabase-js';
import { VenueCard } from '@/components/VenueCard';
import type { Venue } from '@/lib/types';
import type { Metadata } from 'next';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Venues — Berlin Culture',
  description: 'The queer, indie, and ND-friendly spaces and communities we follow across Berlin',
};

interface VenueWithCount extends Venue {
  eventCount: number;
}

async function getVenuesWithCounts(): Promise<VenueWithCount[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const now = new Date().toISOString();

  const [venuesRes, eventsRes] = await Promise.all([
    supabase
      .from('venues')
      .select('*')
      .order('name', { ascending: true }),
    supabase
      .from('events')
      .select('venue_id')
      .gte('start_time', now),
  ]);

  const venues: Venue[] = venuesRes.data ?? [];
  const events = eventsRes.data ?? [];

  const countMap = new Map<number, number>();
  for (const e of events) {
    countMap.set(e.venue_id, (countMap.get(e.venue_id) ?? 0) + 1);
  }

  return venues.map(v => ({
    ...v,
    eventCount: countMap.get(v.id) ?? 0,
  }));
}

export default async function VenuesPage() {
  const venues = await getVenuesWithCounts();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          Our sources
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          The queer, indie, and ND-friendly spaces we follow across Berlin
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {venues.map(v => (
          <VenueCard key={v.id} venue={v} eventCount={v.eventCount} />
        ))}
      </div>
    </div>
  );
}
