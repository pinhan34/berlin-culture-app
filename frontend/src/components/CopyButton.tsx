'use client';

import { useState } from 'react';

/**
 * Copy-to-clipboard button used by the share generator to grab the caption text.
 */
export function CopyButton({ text, label = 'Copy caption' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked — no-op
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-full bg-fuchsia-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-fuchsia-700 active:scale-95 dark:bg-fuchsia-500 dark:hover:bg-fuchsia-600"
    >
      {copied ? 'Copied \u2713' : label}
    </button>
  );
}
