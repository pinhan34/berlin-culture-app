'use client';

import { useLocalStorage } from '@/lib/useLocalStorage';

const POINTS: { icon: string; title: string; body: string }[] = [
  {
    icon: '🎯',
    title: 'Hand-picked, not a firehose',
    body: 'We follow Berlin\u2019s best indie, queer and neurodivergent-friendly venues and communities \u2014 from SO36 to Sinema Transtopia \u2014 so you skip the noise.',
  },
  {
    icon: '🕸️',
    title: 'Beyond the usual listings',
    body: 'We surface gems from underground Telegram channels and grassroots groups that never make it to the big ticketing sites.',
  },
  {
    icon: '🔄',
    title: 'Refreshed through the day',
    body: 'New events are pulled in several times a day, so the feed keeps up with the city. Look for the \u201cNew\u201d tags.',
  },
  {
    icon: '💜',
    title: 'Make it yours',
    body: 'Save favourites, subscribe to your calendar, and spin \u201cMy vibe\u201d to get picks tuned to what you click.',
  },
];

export function HowItWorks() {
  const [collapsed, setCollapsed] = useLocalStorage<boolean>('bca_howto_collapsed', false);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="group flex w-full items-center justify-between rounded-xl border border-stone-200 bg-white/60 px-4 py-2.5 text-left text-sm text-stone-500 transition-all hover:border-fuchsia-300 hover:text-fuchsia-600 dark:border-purple-900/40 dark:bg-[#16101e]/60 dark:text-stone-400 dark:hover:border-fuchsia-700 dark:hover:text-fuchsia-400"
      >
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true">✨</span>
          How Berlin Culture works
        </span>
        <svg className="h-4 w-4 transition-transform group-hover:translate-y-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 via-white to-pink-50 p-6 dark:border-fuchsia-900/40 dark:from-fuchsia-950/30 dark:via-[#16101e] dark:to-purple-950/20">
      <button
        type="button"
        onClick={() => setCollapsed(true)}
        aria-label="Collapse"
        className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-white/60 hover:text-stone-600 dark:text-stone-500 dark:hover:bg-white/5 dark:hover:text-stone-300"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
        </svg>
      </button>

      <h2 className="font-heading text-lg font-bold text-stone-900 dark:text-stone-100">
        Your shortcut to the Berlin worth showing up for
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-stone-600 dark:text-stone-400">
        A curated guide to the city&apos;s independent, queer and community scene &mdash; here&apos;s how it works.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {POINTS.map(p => (
          <div key={p.title} className="flex gap-3">
            <span className="text-xl leading-none" aria-hidden="true">{p.icon}</span>
            <div>
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">{p.title}</h3>
              <p className="mt-0.5 text-[13px] leading-relaxed text-stone-600 dark:text-stone-400">{p.body}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setCollapsed(true)}
        className="mt-5 rounded-full bg-fuchsia-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-fuchsia-700 active:scale-95 dark:bg-fuchsia-500 dark:hover:bg-fuchsia-600"
      >
        Got it &mdash; show me events
      </button>
    </section>
  );
}
