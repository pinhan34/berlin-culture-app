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
    <div className="flex gap-1 rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-700">
      {OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
            value === opt.value
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
              : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
