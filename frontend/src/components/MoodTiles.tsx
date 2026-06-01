'use client';

import { CATEGORY_STYLES, type VenueCategory } from '@/lib/venueCategories';

interface Props {
  onSelect: (category: VenueCategory | null) => void;
  active: VenueCategory | null;
  counts?: Partial<Record<VenueCategory, number>>;
}

const MOODS: { category: VenueCategory; emoji: string; question: string }[] = [
  { category: 'art', emoji: '\u{1F3A8}', question: 'Gallery hop' },
  { category: 'music', emoji: '\u{1F3B6}', question: 'Hit the dance floor' },
  { category: 'community', emoji: '\u{1F91D}', question: 'Find your crowd' },
  { category: 'personal', emoji: '\u{1F4F1}', question: 'My feeds' },
];

export function MoodTiles({ onSelect, active, counts }: Props) {
  return (
    <div className="space-y-3">
      <p className="font-heading text-center text-sm font-bold text-stone-600 dark:text-stone-300">
        What are you in the mood for?
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {MOODS.map(({ category, emoji, question }, i) => {
          const style = CATEGORY_STYLES[category];
          const isActive = active === category;
          const count = counts?.[category];
          return (
            <button
              key={category}
              onClick={() => onSelect(isActive ? null : category)}
              className={`animate-scale-pop stagger-${i + 1} rounded-xl border-2 p-4 text-center transition-all hover:shadow-md active:scale-[0.97] ${isActive
                  ? `${style.bg} ${style.border} shadow-sm`
                  : 'border-stone-200 bg-white hover:border-stone-300 dark:border-purple-900/40 dark:bg-[#16101e] dark:hover:border-purple-700/60'
                }`}
            >
              <span className="block text-2xl mb-1">{emoji}</span>
              <span className={`block text-sm font-semibold ${isActive ? style.text : 'text-stone-700 dark:text-stone-300'}`}>
                {question}
              </span>
              {count !== undefined && (
                <span className={`mt-1 block text-xs font-normal ${isActive ? style.text : 'text-stone-400 dark:text-stone-500'}`}>
                  {count} {count === 1 ? 'event' : 'events'}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
