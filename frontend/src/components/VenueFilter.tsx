'use client';

import type { Venue } from '@/lib/types';

interface Props {
  venues: Venue[];
  selected: Set<number>;
  onToggle: (id: number) => void;
  onClear: () => void;
}

export function VenueFilter({ venues, selected, onToggle, onClear }: Props) {
  const allSelected = selected.size === 0;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={onClear}
        className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
          allSelected
            ? 'border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-400 dark:bg-fuchsia-950/40 dark:text-fuchsia-300'
            : 'border-stone-200 text-stone-500 hover:border-stone-400 dark:border-purple-900/40 dark:text-stone-400 dark:hover:border-purple-700/60'
        }`}
      >
        Everywhere
      </button>
      {venues.map(v => {
        const active = selected.has(v.id);
        return (
          <button
            key={v.id}
            onClick={() => onToggle(v.id)}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
              active
                ? 'border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-400 dark:bg-fuchsia-950/40 dark:text-fuchsia-300'
                : 'border-stone-200 text-stone-500 hover:border-stone-400 dark:border-purple-900/40 dark:text-stone-400 dark:hover:border-purple-700/60'
            }`}
          >
            {v.name}
            {v.source_type === 'personal' && (
              <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">you</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
