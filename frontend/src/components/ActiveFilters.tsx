'use client';

export interface ActiveFilterChip {
  id: string;
  label: string;
  emoji?: string;
  onRemove: () => void;
}

interface Props {
  count: number;
  chips: ActiveFilterChip[];
  onClearAll: () => void;
}

/**
 * Explicit, always-visible reminder of what the user is currently looking at:
 * a result count plus a removable chip per active filter. Keeps people oriented
 * so filters never feel like they "did nothing".
 */
export function ActiveFilters({ count, chips, onClearAll }: Props) {
  const hasFilters = chips.length > 0;

  return (
    <div className="rounded-xl border border-fuchsia-200 bg-gradient-to-r from-fuchsia-50 to-pink-50 px-4 py-3 dark:border-fuchsia-900/50 dark:from-fuchsia-950/30 dark:to-pink-950/20">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
        <span className="font-heading text-sm font-bold text-stone-700 dark:text-stone-200">
          {hasFilters ? 'Showing' : 'Showing all'}
        </span>
        <span className="rounded-full bg-fuchsia-600 px-2.5 py-0.5 text-sm font-bold text-white dark:bg-fuchsia-500">
          {count}
        </span>
        <span className="font-heading text-sm font-bold text-stone-700 dark:text-stone-200">
          {count === 1 ? 'event' : 'events'}
          {hasFilters ? ' matching:' : ''}
        </span>

        {chips.map(chip => (
          <button
            key={chip.id}
            type="button"
            onClick={chip.onRemove}
            title="Remove this filter"
            className="group inline-flex items-center gap-1 rounded-full border border-fuchsia-300 bg-white px-2.5 py-1 text-xs font-semibold text-fuchsia-700 transition-colors hover:border-fuchsia-500 hover:bg-fuchsia-100 dark:border-fuchsia-700 dark:bg-[#16101e] dark:text-fuchsia-300 dark:hover:bg-fuchsia-950/50"
          >
            {chip.emoji && <span aria-hidden="true">{chip.emoji}</span>}
            {chip.label}
            <svg className="h-3 w-3 text-fuchsia-400 group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-300" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        ))}

        {hasFilters && (
          <button
            type="button"
            onClick={onClearAll}
            className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-stone-500 underline-offset-2 hover:text-fuchsia-600 hover:underline dark:text-stone-400 dark:hover:text-fuchsia-400"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
