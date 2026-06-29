'use client';

import { COMMUNITY_DEFS, type Community } from '@/lib/communities';

interface Props {
  active: Community | null;
  onSelect: (community: Community | null) => void;
  counts?: Partial<Record<Community, number>>;
}

/**
 * Prominent entry points for the two communities this app is built to serve.
 * Tapping a lane filters the whole feed to that community.
 */
export function CommunityLanes({ active, onSelect, counts }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {COMMUNITY_DEFS.map(def => {
        const isActive = active === def.community;
        const count = counts?.[def.community] ?? 0;
        return (
          <button
            key={def.community}
            type="button"
            onClick={() => onSelect(isActive ? null : def.community)}
            className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-all hover:shadow-md active:scale-[0.98] ${def.bg} ${def.border} ${
              isActive ? `ring-2 ${def.ring} shadow-sm` : ''
            }`}
          >
            <span className="text-3xl leading-none" aria-hidden="true">{def.emoji}</span>
            <span className="min-w-0 flex-1">
              <span className={`block font-heading text-sm font-bold ${def.text}`}>
                {def.title}
              </span>
              <span className="block truncate text-xs text-stone-500 dark:text-stone-400">
                {def.tagline}
              </span>
            </span>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${def.text} ${isActive ? '' : 'opacity-70'}`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
