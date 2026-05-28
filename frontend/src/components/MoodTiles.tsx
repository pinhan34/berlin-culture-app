'use client';

import { CATEGORY_STYLES, type VenueCategory } from '@/lib/venueCategories';

interface Props {
  onSelect: (category: VenueCategory | null) => void;
  active: VenueCategory | null;
}

const MOODS: { category: VenueCategory; emoji: string; question: string }[] = [
  { category: 'art', emoji: '\u{1F3A8}', question: 'Gallery hop' },
  { category: 'music', emoji: '\u{1F3B6}', question: 'Hit the dance floor' },
  { category: 'community', emoji: '\u{1F91D}', question: 'Find your crowd' },
  { category: 'personal', emoji: '\u{1F4F1}', question: 'My feeds' },
];

export function MoodTiles({ onSelect, active }: Props) {
  return (
    <div className="space-y-3">
      <p className="font-heading text-center text-sm font-bold text-stone-600 dark:text-stone-300">
        What are you in the mood for?
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {MOODS.map(({ category, emoji, question }, i) => {
          const style = CATEGORY_STYLES[category];
          const isActive = active === category;
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
            </button>
          );
        })}
      </div>
    </div>
  );
}
