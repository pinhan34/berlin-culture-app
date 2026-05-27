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
            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-300'
            : 'border-zinc-200 text-zinc-500 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500'
        }`}
      >
        All
      </button>
      {venues.map(v => {
        const active = selected.has(v.id);
        return (
          <button
            key={v.id}
            onClick={() => onToggle(v.id)}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
              active
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-300'
                : 'border-zinc-200 text-zinc-500 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500'
            }`}
          >
            {v.name}
            {v.source_type === 'personal' && (
              <span className="ml-1 text-[10px] text-amber-500">*</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
