'use client';

import { useState } from 'react';
import type { Venue } from '@/lib/types';
import type { VenueSummary } from '@/lib/eventsServer';
import { getVenueDisplayName, isAggregatorVenue } from '@/lib/venueCategories';

const MAX_REAL_VENUES = 15;

interface Props {
  venues: Venue[];
  selected: Set<number>;
  onToggle: (id: number) => void;
  counts: Record<number, number>;
  realVenues: VenueSummary[];
  selectedKeys: Set<string>;
  onToggleKey: (key: string) => void;
  onClear: () => void;
}

function pillClass(active: boolean): string {
  return `rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
    active
      ? 'border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-400 dark:bg-fuchsia-950/40 dark:text-fuchsia-300'
      : 'border-stone-200 text-stone-500 hover:border-stone-400 dark:border-purple-900/40 dark:text-stone-400 dark:hover:border-purple-700/60'
  }`;
}

export function VenueFilter({ venues, selected, onToggle, counts, realVenues, selectedKeys, onToggleKey, onClear }: Props) {
  const [expanded, setExpanded] = useState(false);
  const allSelected = selected.size === 0 && selectedKeys.size === 0;

  const brickAndMortar = venues.filter(v => !isAggregatorVenue(v.id));
  const feeds = venues.filter(v => isAggregatorVenue(v.id));
  const collapsedRealVenues = realVenues.filter(
    (v, i) => i < MAX_REAL_VENUES || selectedKeys.has(v.venue_key),
  );
  const shownRealVenues = expanded ? realVenues : collapsedRealVenues;
  const hiddenCount = realVenues.length - collapsedRealVenues.length;

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
              <span className="ml-1.5 text-xs opacity-60">{counts[v.id] ?? 0}</span>
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
      {renderGroup('Venues', brickAndMortar)}
      {renderGroup('Community groups&pages', feeds)}
      {shownRealVenues.length > 0 && (
        <div className="space-y-0.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
            Places from community listings
          </p>
          <p className="text-[11px] text-stone-400/70 dark:text-stone-500/70">
            Where events from the groups above actually take place, including online.
          </p>
          <div className="flex flex-wrap gap-2">
            {shownRealVenues.map(v => (
              <button
                key={v.venue_key}
                onClick={() => onToggleKey(v.venue_key)}
                className={pillClass(selectedKeys.has(v.venue_key))}
              >
                {v.venue_name}
                <span className="ml-1.5 text-xs opacity-60">{v.count}</span>
              </button>
            ))}
            {hiddenCount > 0 && (
              <button
                onClick={() => setExpanded(e => !e)}
                aria-expanded={expanded}
                className={pillClass(false)}
              >
                {expanded ? 'Show less' : `+${hiddenCount} more`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
