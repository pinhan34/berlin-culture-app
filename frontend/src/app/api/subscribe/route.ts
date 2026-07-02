import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Newsletter signup — stores an opt-in email into the `subscribers` table using the
 * service role (bypasses RLS). The owned-audience funnel (docs/DISTRIBUTION.md §18.2).
 * Email is personal data, so this is the only write path and the list is never exposed
 * to the client.
 */

// Pragmatic email check — good enough to reject typos/garbage without being strict.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let email: unknown;
  let source: unknown;
  try {
    const body = await req.json();
    email = body?.email;
    source = body?.source;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (typeof email !== 'string' || !EMAIL_RE.test(email) || email.length > 320) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }
  const normalized = email.trim().toLowerCase();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Signups are temporarily unavailable.' }, { status: 503 });
  }

  const supabase = createClient(url, serviceKey);
  const { error } = await supabase.from('subscribers').upsert(
    {
      email: normalized,
      source: typeof source === 'string' && source.length > 0 ? source.slice(0, 100) : 'homepage',
    },
    { onConflict: 'email', ignoreDuplicates: true },
  );

  if (error) {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }

  // Same response whether new or already-subscribed (don't leak list membership).
  return NextResponse.json({ ok: true });
}
