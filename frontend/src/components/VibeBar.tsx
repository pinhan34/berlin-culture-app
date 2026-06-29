'use client';

import { VIBE_DEFS, type Vibe } from '@/lib/vibes';

interface Props {
  active: Vibe | null;
  onSelect: (vibe: Vibe | null) => void;
  counts?: Partial<Record<Vibe, number>>;
}

/**
 * Horizontal scrollable row of vibe filter chips. Content-based discovery
 * (party, queer, wellness, ...) that complements the venue-based mood tiles.
 */
export function VibeBar({ active, onSelect, counts }: Props) {
  const visible = VIBE_DEFS.filter(d => (counts?.[d.vibe] ?? 0) > 0 || active === d.vibe);
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="font-heading text-center text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
        Filter by vibe
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {visible.map(def => {
          const isActive = active === def.vibe;
          const count = counts?.[def.vibe];
          return (
            <button
              key={def.vibe}
              type="button"
              onClick={() => onSelect(isActive ? null : def.vibe)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                isActive
                  ? `${def.bg} ${def.text} ${def.border} shadow-sm`
                  : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 dark:border-purple-900/40 dark:bg-[#16101e] dark:text-stone-300 dark:hover:border-purple-700/60'
              }`}
            >
              <span aria-hidden="true">{def.emoji}</span>
              {def.label}
              {count !== undefined && (
                <span className={isActive ? 'opacity-80' : 'text-stone-400 dark:text-stone-500'}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
