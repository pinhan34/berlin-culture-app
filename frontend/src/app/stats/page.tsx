import type { Metadata } from 'next';
import { getVisitStats, type CountRow } from '@/lib/visitsServer';

/**
 * Owner-only "traffic by channel" view. Reads aggregate visit/subscriber counts
 * (service role) and shows where traffic comes from. Gated by a secret token
 * (?key=…) matching the STATS_TOKEN env var — not real auth, just hidden from the
 * public. noindex. No PII is shown (emails are counted, never listed).
 */
export const metadata: Metadata = {
  title: 'Traffic stats',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

function StatTable({ title, rows, empty }: { title: string; rows: CountRow[]; empty: string }) {
  const max = rows.reduce((m, r) => Math.max(m, r.count), 0);
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-purple-900/50 dark:bg-[#16101e]">
      <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-stone-400 dark:text-stone-500">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map(r => (
            <li key={r.key}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="truncate font-medium text-stone-700 dark:text-stone-200">{r.key}</span>
                <span className="ml-2 shrink-0 font-mono text-stone-500 dark:text-stone-400">{r.count}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-purple-950/40">
                <div
                  className="h-full rounded-full bg-fuchsia-500"
                  style={{ width: `${max > 0 ? Math.round((r.count / max) * 100) : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const sp = await searchParams;
  const token = process.env.STATS_TOKEN;
  const authed = !!token && sp.key === token;

  if (!authed) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <h1 className="font-heading text-xl font-bold text-stone-900 dark:text-stone-100">
          Not available
        </h1>
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
          {token
            ? 'This page is private.'
            : 'Set a STATS_TOKEN environment variable, then open /stats?key=YOUR_TOKEN.'}
        </p>
      </div>
    );
  }

  const stats = await getVisitStats({ windowDays: 30 });

  if (!stats) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <h1 className="font-heading text-xl font-bold text-stone-900 dark:text-stone-100">
          Stats unavailable
        </h1>
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
          Supabase isn&apos;t configured, or the migrations haven&apos;t been run yet.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="font-heading text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
        Traffic by channel
      </h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        Last {stats.windowDays} days · {stats.totalVisits} attributed visits ·{' '}
        {stats.subscriberTotal} subscribers total
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <StatTable
          title="Visits by source (UTM)"
          rows={stats.bySource}
          empty="No UTM-tagged visits yet — share links that carry ?utm_source=…"
        />
        <StatTable
          title="Visits by referrer"
          rows={stats.byReferrer}
          empty="No external referrers recorded yet."
        />
        <StatTable
          title="Visits by campaign"
          rows={stats.byCampaign}
          empty="No campaigns recorded yet."
        />
        <StatTable
          title="Subscribers by source"
          rows={stats.subscribersBySource}
          empty="No subscribers yet."
        />
      </div>

      <p className="mt-6 text-xs text-stone-400 dark:text-stone-500">
        Anonymous, aggregate counts only. Requires analytics consent to be granted by
        visitors (see the consent banner / privacy policy).
      </p>
    </div>
  );
}
