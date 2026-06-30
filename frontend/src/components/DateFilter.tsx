'use client';

import { useRef } from 'react';

interface Props {
  value: string;
  onChange: (range: string) => void;
}

const PRESETS: { label: string; value: string; emoji: string }[] = [
  { label: 'All upcoming', value: 'all', emoji: '\u2728' },
  { label: 'Today', value: 'today', emoji: '\u2600\uFE0F' },
  { label: 'Tomorrow', value: 'tomorrow', emoji: '\u{1F305}' },
  { label: 'This weekend', value: 'weekend', emoji: '\u{1F389}' },
  { label: 'This week', value: 'week', emoji: '\u{1F4C6}' },
  { label: 'This month', value: 'month', emoji: '\u{1F5D3}\uFE0F' },
];

const PRESET_VALUES = new Set(PRESETS.map(p => p.value));

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function pillClass(active: boolean): string {
  return `inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-all active:scale-95 ${
    active
      ? 'border-fuchsia-500 bg-fuchsia-600 text-white shadow-sm dark:border-fuchsia-400 dark:bg-fuchsia-500'
      : 'border-stone-200 bg-white text-stone-600 hover:border-fuchsia-300 hover:text-fuchsia-600 dark:border-purple-900/40 dark:bg-[#16101e] dark:text-stone-300 dark:hover:border-fuchsia-600'
  }`;
}

export function DateFilter({ value, onChange }: Props) {
  const dateRef = useRef<HTMLInputElement>(null);
  const customActive = !PRESET_VALUES.has(value);

  function openPicker() {
    const el = dateRef.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') el.showPicker();
    else el.focus();
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {PRESETS.map(p => (
        <button
          key={p.value}
          type="button"
          onClick={() => onChange(p.value)}
          className={pillClass(value === p.value)}
        >
          <span aria-hidden="true">{p.emoji}</span>
          {p.label}
        </button>
      ))}

      <button type="button" onClick={openPicker} className={`${pillClass(customActive)} cursor-pointer`}>
        <span aria-hidden="true">{'\u{1F4C5}'}</span>
        {customActive
          ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
          : 'Pick a date'}
      </button>

      <input
        ref={dateRef}
        type="date"
        min={todayISO()}
        value={customActive ? value : ''}
        onChange={e => onChange(e.target.value || 'all')}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
