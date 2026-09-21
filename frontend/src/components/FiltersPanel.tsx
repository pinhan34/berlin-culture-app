'use client';

import { useState, type ReactNode } from 'react';

interface Props {
  /** Number of active filters, shown as a badge on the button (hidden at 0). */
  activeCount: number;
  children: ReactNode;
}

/**
 * Collapsible wrapper for the filter groups. Collapsed on every visit (state is
 * session-only). Children stay mounted and are hidden with the `hidden` attribute,
 * so their state survives toggling and entry animations (e.g. MoodTiles) don't replay.
 */
export function FiltersPanel({ activeCount, children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-controls="filters-panel"
        className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm transition-all hover:bg-stone-50 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-500dark:border-purple-900/50 dark:bg-[#16101e] dark:text-stone-200 dark:hover:bg-[#1a1326]"
      >
        <span aria-hidden="true">&#9881;&#65039;</span>
        Filters
        {activeCount > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-fuchsia-600 px-1.5 text-[11px] font-bold text-white dark:bg-fuchsia-500">
            {activeCount}
          </span>
        )}
        <span aria-hidden="true" className={`text-xs transition-transform ${open ? 'rotate-180' : ''}`}>
          &#9662;
        </span>
      </button>

      <div
        id="filters-panel"
        hidden={!open}
        className="mt-3 space-y-4 rounded-2xl border border-stone-200 bg-gradient-to-b from-stone-50 to-stone-100/40 p-3 dark:border-purple-900/40 dark:from-[#16101e]/70 dark:to-[#120c1a]/40 sm:p-4"
      >
        {children}
      </div>
    </div>
  );
}
