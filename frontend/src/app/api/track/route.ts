import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Personalization Tier 2a — anonymous interaction ingestion.
 * Records clicks / calendar saves / favourites / hides into the `interactions`
 * table using the service role (bypasses RLS). No PII; keyed by anonymous id.
 *
 * Designed to be called via navigator.sendBeacon / fetch(keepalive) so it
 * survives the outbound navigation that follows a click.
 */

const VALID_ACTIONS = new Set(['click', 'calendar', 'favourite', 'hide']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { anonId, eventId, venueId, action, domain } = body ?? {};

    if (!anonId || typeof anonId !== 'string' || !UUID_RE.test(anonId)) {
      return NextResponse.json({ error: 'Invalid anonId' }, { status: 400 });
    }
    if (!Number.isInteger(eventId)) {
      return NextResponse.json({ error: 'Invalid eventId' }, { status: 400 });
    }
    if (typeof action !== 'string' || !VALID_ACTIONS.has(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      // Tracking is best-effort; don't surface infra errors to the client.
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    const supabase = createClient(url, serviceKey);
    const { error } = await supabase.from('interactions').insert({
      anon_id: anonId,
      event_id: eventId,
      venue_id: Number.isInteger(venueId) ? venueId : null,
      action,
      domain: typeof domain === 'string' && domain.length > 0 ? domain.slice(0, 255) : null,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    // Best-effort: never break the UX over a tracking failure.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
