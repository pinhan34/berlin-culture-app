'use client';

interface Props {
  value: string;
  onChange: (range: string) => void;
}

const OPTIONS = [
  { label: 'This week', value: 'week' },
  { label: 'This month', value: 'month' },
  { label: 'All upcoming', value: 'all' },
];

export function DateFilter({ value, onChange }: Props) {
  return (
    <div className="flex gap-1 rounded-lg border border-stone-200 p-0.5 dark:border-purple-900/40">
      {OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
            value === opt.value
              ? 'bg-fuchsia-600 text-white dark:bg-fuchsia-500 dark:text-white'
              : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
