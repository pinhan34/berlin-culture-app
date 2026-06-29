import { createClient } from '@supabase/supabase-js';
import { EventFeed } from '@/components/EventFeed';
import { VenueStrip } from '@/components/VenueStrip';
import { HowItWorks } from '@/components/HowItWorks';
import { ClickStats } from '@/components/ClickStats';
import type { Event, Venue } from '@/lib/types';

export const revalidate = 60; // ISR: refresh data every 60 seconds

async function getData(): Promise<{ events: Event[]; venues: Venue[] }> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const now = new Date().toISOString();

  // venue_id 4 (neurodivergent-berlin.com) is retired — MeetUp (id 2) covers the same
  // community with better data quality. Old DB rows are excluded here until they expire.
  const RETIRED_VENUE_IDS = [4];

  const [eventsRes, venuesRes] = await Promise.all([
    supabase
      .from('events')
      .select('*, venue:venues(*)')
      .gte('start_time', now)
      .not('venue_id', 'in', `(${RETIRED_VENUE_IDS.join(',')})`)
      .order('start_time', { ascending: true })
      .limit(500),
    supabase
      .from('venues')
      .select('*')
      .not('id', 'in', `(${RETIRED_VENUE_IDS.join(',')})`)
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
          Hand-picked from Berlin's best indie + queer + ND-friendly spaces and communities
        </p>
        <a
          href="/api/calendar"
          className="mt-2 inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-fuchsia-600 dark:text-stone-500 dark:hover:text-fuchsia-400 transition-colors"
          title="Subscribe in Google Calendar, Apple Calendar, or Outlook"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
          Subscribe to all events
        </a>
      </div>

      <div className="mb-8">
        <HowItWorks />
      </div>

      <ClickStats />

      <VenueStrip venues={venues} />

      <EventFeed events={events} venues={venues} />
    </div>
  );
}
