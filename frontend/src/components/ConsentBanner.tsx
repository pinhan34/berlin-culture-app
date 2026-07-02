'use client';

import { useEffect, useState } from 'react';
import { getConsent, setConsent } from '@/lib/consent';

/**
 * Lightweight, opt-in analytics consent banner. Shows only until the user makes a
 * choice. Functional/on-device personalization is unaffected — this only governs
 * whether anonymous interaction signals are sent to our server (see lib/consent.ts).
 */
export function ConsentBanner() {
  // Start hidden to avoid SSR/hydration mismatch; decide on the client.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getConsent() === null) setVisible(true);
  }, []);

  if (!visible) return null;

  const choose = (value: 'granted' | 'denied') => {
    setConsent(value);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Analytics consent"
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-4 sm:pb-4"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-stone-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between dark:border-purple-900/50 dark:bg-[#16101e]/95">
        <p className="text-[13px] leading-relaxed text-stone-600 dark:text-stone-300">
          <span aria-hidden="true">🔒</span>{' '}
          We&apos;d like to log <strong>anonymous</strong> usage signals (which events get
          clicked or saved) to improve recommendations. No account, no personal data.{' '}
          <a href="/privacy" className="underline hover:text-fuchsia-600 dark:hover:text-fuchsia-400">
            Learn more
          </a>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose('denied')}
            className="rounded-full border border-stone-300 px-4 py-1.5 text-sm font-semibold text-stone-600 transition-colors hover:border-stone-400 hover:text-stone-800 dark:border-purple-900/60 dark:text-stone-300 dark:hover:border-purple-700 dark:hover:text-stone-100"
          >
            No thanks
          </button>
          <button
            type="button"
            onClick={() => choose('granted')}
            className="rounded-full bg-fuchsia-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-fuchsia-700 active:scale-95 dark:bg-fuchsia-500 dark:hover:bg-fuchsia-600"
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  );
}
