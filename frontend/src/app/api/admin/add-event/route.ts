import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, start_time, event_url, venue_id, password } = body;

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword || password !== adminPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!title || !start_time || !venue_id) {
      return NextResponse.json(
        { error: 'Missing required fields: title, start_time, venue_id' },
        { status: 400 },
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data, error } = await supabase.from('events').upsert(
      {
        venue_id: Number(venue_id),
        title: title.trim(),
        start_time: new Date(start_time).toISOString(),
        duration: body.duration?.trim() || null,
        event_url: event_url?.trim() || null,
      },
      {
        onConflict: 'venue_id,title,start_time',
        ignoreDuplicates: true,
      },
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Unknown error' }, { status: 500 });
  }
}
