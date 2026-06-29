'use client';

import { getVibeDef, type Vibe } from '@/lib/vibes';

interface Props {
  onSelect: (vibe: Vibe | null) => void;
  active: Vibe | null;
  counts?: Partial<Record<Vibe, number>>;
}

/**
 * Genuine mood selector — answers "what are you in the mood for?" with
 * intent-led tiles. Each maps to one content vibe, so this is the single,
 * prominent way to filter by feel (the old small vibe bar is retired).
 */
const MOODS: { vibe: Vibe; emoji: string; question: string }[] = [
  { vibe: 'party', emoji: '\u{1F525}', question: 'Going out' },
  { vibe: 'live', emoji: '\u{1F3B8}', question: 'Live music' },
  { vibe: 'arts', emoji: '\u{1F3A8}', question: 'Arts & film' },
  { vibe: 'wellness', emoji: '\u{1F9D8}', question: 'Chill & heal' },
  { vibe: 'community', emoji: '\u{1F91D}', question: 'Meet people' },
  { vibe: 'activist', emoji: '\u270A', question: 'Take action' },
];

export function MoodTiles({ onSelect, active, counts }: Props) {
  return (
    <div className="space-y-3">
      <p className="font-heading text-center text-sm font-bold text-stone-600 dark:text-stone-300">
        What are you in the mood for?
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {MOODS.map(({ vibe, emoji, question }, i) => {
          const def = getVibeDef(vibe);
          const isActive = active === vibe;
          const count = counts?.[vibe] ?? 0;
          return (
            <button
              key={vibe}
              type="button"
              onClick={() => onSelect(isActive ? null : vibe)}
              className={`animate-scale-pop stagger-${i + 1} rounded-xl border-2 p-3 text-center transition-all hover:shadow-md active:scale-[0.97] ${
                isActive
                  ? `${def.bg} ${def.border} shadow-sm`
                  : 'border-stone-200 bg-white hover:border-stone-300 dark:border-purple-900/40 dark:bg-[#16101e] dark:hover:border-purple-700/60'
              }`}
            >
              <span className="block text-2xl mb-1">{emoji}</span>
              <span className={`block text-sm font-semibold ${isActive ? def.text : 'text-stone-700 dark:text-stone-300'}`}>
                {question}
              </span>
              <span className={`mt-0.5 block text-xs font-normal ${isActive ? def.text : 'text-stone-400 dark:text-stone-500'}`}>
                {count} {count === 1 ? 'event' : 'events'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
