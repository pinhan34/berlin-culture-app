'use client';

import { useEffect, useState } from 'react';
import {
  getClicksByDomain,
  getClicksByVenue,
  getTotalClicks,
  type StatRow,
} from '@/lib/interactions';
import { getVenueDisplayName } from '@/lib/venueCategories';

/**
 * Phase 0 (monetization) — owner-only traffic panel.
 * Shows where outbound clicks go, so we know which affiliate programs /
 * venue partnerships are worth pursuing (see docs/MONETIZATION_AND_GROWTH.md §16).
 *
 * Hidden by default. Reveal by adding ?stats=1 to the URL.
 * localStorage is per-browser, so this reflects THIS browser's clicks only.
 */
export function ClickStats() {
  const [visible, setVisible] = useState(false);
  const [domains, setDomains] = useState<StatRow<string>[]>([]);
  const [venues, setVenues] = useState<StatRow<number>[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('stats') !== '1') return;
    setVisible(true);
    refresh();
  }, []);

  function refresh() {
    setDomains(getClicksByDomain());
    setVenues(getClicksByVenue());
    setTotal(getTotalClicks());
  }

  if (!visible) return null;

  const withDomain = domains.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="mb-8 rounded-xl border border-dashed border-fuchsia-300 bg-fuchsia-50/40 p-5 dark:border-fuchsia-800 dark:bg-fuchsia-950/20">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-heading text-sm font-bold uppercase tracking-wide text-fuchsia-700 dark:text-fuchsia-400">
          Traffic insights · owner view
        </h3>
        <button
          onClick={refresh}
          className="rounded-md border border-fuchsia-300 bg-white px-2 py-1 text-[11px] font-medium text-fuchsia-700 hover:bg-fuchsia-50 dark:border-fuchsia-700 dark:bg-transparent dark:text-fuchsia-300"
        >
          Refresh
        </button>
      </div>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
        {total} outbound click{total === 1 ? '' : 's'} tracked in this browser.
        Use this to decide which affiliate programs &amp; venue partnerships to pursue.
      </p>

      {total === 0 ? (
        <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">
          No clicks yet — open a few events, then hit Refresh.
        </p>
      ) : (
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <StatList
            title="By destination (where ticket revenue lives)"
            rows={domains.map((d) => ({ label: d.key, count: d.count }))}
            total={withDomain}
            empty="No outbound domains captured yet."
          />
          <StatList
            title="By venue / source (who to partner with)"
            rows={venues.map((v) => ({
              label: getVenueDisplayName(v.key, `Venue #${v.key}`),
              count: v.count,
            }))}
            total={venues.reduce((s, v) => s + v.count, 0)}
            empty="No venue clicks captured yet."
          />
        </div>
      )}
    </div>
  );
}

function StatList({
  title,
  rows,
  total,
  empty,
}: {
  title: string;
  rows: { label: string; count: number }[];
  total: number;
  empty: string;
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-stone-600 dark:text-stone-300">{title}</h4>
      {rows.length === 0 ? (
        <p className="mt-2 text-xs text-stone-400">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {rows.map((r) => {
            const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
            return (
              <li key={r.label} className="text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-stone-700 dark:text-stone-200">{r.label}</span>
                  <span className="shrink-0 tabular-nums text-stone-400">
                    {r.count} · {pct}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
                  <div
                    className="h-full rounded-full bg-fuchsia-500 dark:bg-fuchsia-400"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
