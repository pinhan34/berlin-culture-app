'use client';

import type { Venue } from '@/lib/types';
import { getVenueDisplayName, isAggregatorVenue } from '@/lib/venueCategories';

interface Props {
  venues: Venue[];
  selected: Set<number>;
  onToggle: (id: number) => void;
  onClear: () => void;
}

function pillClass(active: boolean): string {
  return `rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
    active
      ? 'border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-400 dark:bg-fuchsia-950/40 dark:text-fuchsia-300'
      : 'border-stone-200 text-stone-500 hover:border-stone-400 dark:border-purple-900/40 dark:text-stone-400 dark:hover:border-purple-700/60'
  }`;
}

export function VenueFilter({ venues, selected, onToggle, onClear }: Props) {
  const allSelected = selected.size === 0;

  const realVenues = venues.filter(v => !isAggregatorVenue(v.id));
  const feeds = venues.filter(v => isAggregatorVenue(v.id));

  const renderGroup = (label: string, list: Venue[]) =>
    list.length > 0 && (
      <div className="space-y-1.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
          {label}
        </p>
        <div className="flex flex-wrap gap-2">
          {list.map(v => (
            <button key={v.id} onClick={() => onToggle(v.id)} className={pillClass(selected.has(v.id))}>
              {getVenueDisplayName(v.id, v.name)}
            </button>
          ))}
        </div>
      </div>
    );

  return (
    <div className="space-y-3">
      <button onClick={onClear} className={pillClass(allSelected)}>
        Everywhere
      </button>
      {renderGroup('Venues', realVenues)}
      {renderGroup('Community feeds', feeds)}
    </div>
  );
}
