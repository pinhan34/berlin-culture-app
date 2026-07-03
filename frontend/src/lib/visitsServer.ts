/**
 * Owner analytics — aggregate reads over the anonymous `visits` (and `subscribers`)
 * data for the private /stats view. Service-role only (RLS blocks the client);
 * returns grouped counts, never raw rows or PII (emails are counted, never returned).
 */

import { createClient } from '@supabase/supabase-js';

export interface CountRow {
  key: string;
  count: number;
}

export interface VisitStats {
  windowDays: number;
  totalVisits: number;
  bySource: CountRow[];
  byReferrer: CountRow[];
  byCampaign: CountRow[];
  subscribersBySource: CountRow[];
  subscriberTotal: number;
}

function tally(values: (string | null | undefined)[], fallback?: string): CountRow[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    const key = v && v.length > 0 ? v : fallback;
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getVisitStats(opts: { windowDays?: number } = {}): Promise<VisitStats | null> {
  const windowDays = opts.windowDays ?? 30;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  const supabase = createClient(url, serviceKey);
  const since = new Date(Date.now() - windowDays * 86_400_000).toISOString();

  const [visitsRes, subsRes] = await Promise.all([
    supabase
      .from('visits')
      .select('utm_source, utm_campaign, referrer, created_at')
      .gte('created_at', since)
      .limit(20_000),
    supabase.from('subscribers').select('source'),
  ]);

  const visits = (visitsRes.data ?? []) as {
    utm_source: string | null;
    utm_campaign: string | null;
    referrer: string | null;
  }[];
  const subs = (subsRes.data ?? []) as { source: string | null }[];

  return {
    windowDays,
    totalVisits: visits.length,
    bySource: tally(visits.map(v => v.utm_source)),
    byReferrer: tally(visits.map(v => v.referrer)),
    byCampaign: tally(visits.map(v => v.utm_campaign)),
    subscribersBySource: tally(subs.map(s => s.source), 'unknown'),
    subscriberTotal: subs.length,
  };
}
