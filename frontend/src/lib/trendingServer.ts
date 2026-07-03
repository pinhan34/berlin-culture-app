/**
 * Trending aggregation (Personalization Tier 2b) — the first payoff of the anonymous
 * `interactions` data collected in Tier 2a. Reads with the SERVICE ROLE key (RLS blocks
 * the client), aggregates a weighted engagement score per event over a recent window,
 * and returns the top events. No PII leaves the server — only event ids + scores.
 */

import { createClient } from '@supabase/supabase-js';

// Engagement weights: saving/favouriting signals stronger intent than a click; a hide
// is a strong negative so heavily-hidden events don't "trend".
const ACTION_WEIGHTS: Record<string, number> = {
  click: 1,
  calendar: 3,
  favourite: 4,
  hide: -3,
};

export interface TrendingScore {
  eventId: number;
  score: number;
}

interface Options {
  windowDays?: number; // how far back to look
  limit?: number; // max events returned
  maxRows?: number; // cap rows scanned (safety)
}

export async function getTrendingScores(opts: Options = {}): Promise<TrendingScore[]> {
  const windowDays = opts.windowDays ?? 14;
  const limit = opts.limit ?? 12;
  const maxRows = opts.maxRows ?? 10_000;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return [];

  const supabase = createClient(url, serviceKey);
  const since = new Date(Date.now() - windowDays * 86_400_000).toISOString();

  const { data, error } = await supabase
    .from('interactions')
    .select('event_id, action')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(maxRows);

  if (error || !data) return [];

  const scores = new Map<number, number>();
  for (const row of data as { event_id: number; action: string }[]) {
    const weight = ACTION_WEIGHTS[row.action] ?? 0;
    if (!weight) continue;
    scores.set(row.event_id, (scores.get(row.event_id) ?? 0) + weight);
  }

  return [...scores.entries()]
    .filter(([, score]) => score > 0)
    .map(([eventId, score]) => ({ eventId, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
