import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Visit / attribution ingestion (UTM landing capture). Records which channel sent a
 * visitor (utm_source/medium/campaign + external referrer) into the `visits` table
 * using the service role. Best-effort, consent-gated on the client. No PII.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function clean(v: unknown, max: number): string | null {
  return typeof v === 'string' && v.length > 0 ? v.slice(0, max) : null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { anonId, source, medium, campaign, referrer, path } = body ?? {};

    const src = clean(source, 100);
    const ref = clean(referrer, 255);
    // Nothing worth recording (no channel + no referrer) — silently accept.
    if (!src && !ref) return NextResponse.json({ ok: false }, { status: 200 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return NextResponse.json({ ok: false }, { status: 200 });

    const supabase = createClient(url, serviceKey);
    const { error } = await supabase.from('visits').insert({
      anon_id: typeof anonId === 'string' && UUID_RE.test(anonId) ? anonId : null,
      utm_source: src,
      utm_medium: clean(medium, 100),
      utm_campaign: clean(campaign, 100),
      referrer: ref,
      path: clean(path, 255),
    });

    if (error) return NextResponse.json({ ok: false }, { status: 200 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
