import type { Venue } from '@/lib/types';
import { getVenueIdentity, IDENTITY_TAG_STYLES, IDENTITY_TAG_LABELS } from '@/lib/venueIdentity';
import { getVenueCategory, CATEGORY_STYLES, getVenueDisplayName } from '@/lib/venueCategories';

interface Props {
  venues: Venue[];
}

export function VenueStrip({ venues }: Props) {
  return (
    <section className="mb-8">
      <h3 className="font-heading text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-fuchsia-600 via-pink-500 to-fuchsia-600 bg-clip-text text-transparent dark:from-fuchsia-400 dark:via-pink-400 dark:to-fuchsia-400">
        Where we look
      </h3>
      <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
        The spaces and communities we follow
      </p>

      <div className="mt-3 flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
        {venues.map((v, i) => {
          const identity = getVenueIdentity(v.id);
          const topTags = identity.tags.slice(0, 2);
          const catStyle = CATEGORY_STYLES[getVenueCategory(v.id)];

          return (
            <a
              key={v.id}
              href={`/venues#venue-${v.id}`}
              title={identity.tagline}
              className={`animate-slide-in-left stagger-${Math.min(i + 1, 9)} flex flex-shrink-0 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 transition-all hover:border-fuchsia-300 hover:shadow-md dark:border-purple-900/40 dark:bg-[#16101e] dark:hover:border-fuchsia-600 border-l-[3px] ${catStyle.border.split(' ')[0]}`}
            >
              {identity.emoji && (
                <span className="text-base">{identity.emoji}</span>
              )}
              <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
                {getVenueDisplayName(v.id, v.name)}
              </span>
              {v.source_type === 'personal' && (
                <span className="rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                  you
                </span>
              )}
              {topTags.map(tag => {
                const s = IDENTITY_TAG_STYLES[tag];
                return (
                  <span
                    key={tag}
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${s.bg} ${s.text}`}
                  >
                    {IDENTITY_TAG_LABELS[tag]}
                  </span>
                );
              })}
            </a>
          );
        })}
      </div>
    </section>
  );
}
