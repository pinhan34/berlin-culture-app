'use client';

import { CATEGORY_STYLES, type VenueCategory } from '@/lib/venueCategories';

interface Props {
  onSelect: (category: VenueCategory | null) => void;
  active: VenueCategory | null;
}

const MOODS: { category: VenueCategory; emoji: string; question: string }[] = [
  { category: 'art', emoji: '\u{1F3A8}', question: 'See some art' },
  { category: 'music', emoji: '\u{1F3B6}', question: 'Go out dancing' },
  { category: 'community', emoji: '\u{1F91D}', question: 'Meet people' },
];

export function MoodTiles({ onSelect, active }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-center text-sm font-medium text-zinc-500 dark:text-zinc-400">
        What are you in the mood for?
      </p>
      <div className="grid grid-cols-3 gap-3">
        {MOODS.map(({ category, emoji, question }) => {
          const style = CATEGORY_STYLES[category];
          const isActive = active === category;
          return (
            <button
              key={category}
              onClick={() => onSelect(isActive ? null : category)}
              className={`rounded-xl border-2 p-4 text-center transition-all hover:shadow-md active:scale-[0.97] ${
                isActive
                  ? `${style.bg} ${style.border} shadow-sm`
                  : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600'
              }`}
            >
              <span className="block text-2xl mb-1">{emoji}</span>
              <span className={`block text-sm font-semibold ${isActive ? style.text : 'text-zinc-700 dark:text-zinc-300'}`}>
                {question}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
