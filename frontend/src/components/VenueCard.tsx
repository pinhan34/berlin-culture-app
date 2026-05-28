import type { Venue } from '@/lib/types';
import {
  getVenueIdentity,
  IDENTITY_TAG_STYLES,
  IDENTITY_TAG_LABELS,
} from '@/lib/venueIdentity';

interface Props {
  venue: Venue;
  eventCount: number;
}

export function VenueCard({ venue, eventCount }: Props) {
  const identity = getVenueIdentity(venue.id);

  return (
    <div
      id={`venue-${venue.id}`}
      className="rounded-xl border border-stone-200 bg-white p-5 dark:border-purple-900/40 dark:bg-[#16101e]"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-heading text-lg font-bold text-stone-900 dark:text-stone-100">
          {venue.name}
        </h2>
        {venue.source_type === 'personal' && (
          <span className="flex-shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
            your feed
          </span>
        )}
      </div>

      {identity.tagline && (
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          {identity.tagline}
        </p>
      )}

      {identity.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {identity.tags.map(tag => {
            const s = IDENTITY_TAG_STYLES[tag];
            return (
              <span
                key={tag}
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}
              >
                {IDENTITY_TAG_LABELS[tag]}
              </span>
            );
          })}
        </div>
      )}

      <div className="mt-4 space-y-1 text-sm text-stone-500 dark:text-stone-400">
        {venue.address && (
          <p className="flex items-center gap-1.5">
            <MapPinIcon />
            {venue.address}
          </p>
        )}
        {venue.website_url && (
          <p className="flex items-center gap-1.5">
            <LinkIcon />
            <a
              href={venue.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-stone-300 underline-offset-2 transition-colors hover:text-fuchsia-600 dark:decoration-purple-800 dark:hover:text-fuchsia-400"
            >
              {venue.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </a>
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm font-medium text-stone-600 dark:text-stone-300">
          {eventCount} upcoming {eventCount === 1 ? 'event' : 'events'}
        </span>
        <a
          href={`/?venue=${venue.id}`}
          className="rounded-full border border-stone-200 px-3 py-1 text-xs font-medium text-stone-600 transition-colors hover:border-fuchsia-300 hover:text-fuchsia-600 dark:border-purple-900/40 dark:text-stone-400 dark:hover:border-fuchsia-600 dark:hover:text-fuchsia-400"
        >
          Browse events
        </a>
      </div>
    </div>
  );
}

function MapPinIcon() {
  return (
    <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
    </svg>
  );
}
