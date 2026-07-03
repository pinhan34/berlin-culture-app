import { NextResponse } from 'next/server';
import { getTrendingScores } from '@/lib/trendingServer';

/**
 * Aggregate trending events (event ids + engagement scores) from the anonymous
 * `interactions` data. Returns only grouped/aggregated data — no per-user rows.
 * Reusable by the homepage and future surfaces (e.g. an MCP/ChatGPT app).
 */
export const revalidate = 300; // cache 5 min

export async function GET() {
  const trending = await getTrendingScores({ limit: 12 });
  return NextResponse.json({ trending });
}
