import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { fetchEventsInRange } from '@/lib/eventsServer';
import {
  getShareRange,
  isShareRangeKey,
  toShareEvents,
  type ShareEvent,
} from '@/lib/shareContent';

/**
 * Auto-generated "what's on in Berlin" share graphic, built from our own event data.
 * This is the distribution engine's content factory — drop the URL into an <img> (or
 * download it) and post it to Instagram / Telegram / a newsletter. No design work.
 *
 * Query params:
 *   range  = today | tomorrow | weekend (default) | week
 *   format = post (1080×1350, default) | story (1080×1920) | square (1080×1080)
 *   limit  = number of events (1–8)
 */

export const revalidate = 900; // regenerate at most every 15 min

const FORMATS = {
  post: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
} as const;

type FormatKey = keyof typeof FORMATS;

const BG = 'linear-gradient(150deg, #0d0b11 0%, #3b0764 55%, #a21caf 100%)';
const RAINBOW =
  'linear-gradient(90deg, #ec4899, #d946ef, #a855f7, #60a5fa, #2dd4bf, #4ade80, #fbbf24)';

function clampTitle(s: string, max: number): string {
  const t = s.trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}\u2026` : t;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const rangeKey = isShareRangeKey(searchParams.get('range'))
    ? (searchParams.get('range') as 'today' | 'tomorrow' | 'weekend' | 'week')
    : 'weekend';

  const formatParam = (searchParams.get('format') || 'post') as FormatKey;
  const format = FORMATS[formatParam] ? formatParam : 'post';
  const { width, height } = FORMATS[format];

  const limitRaw = Number(searchParams.get('limit'));
  const isStory = format === 'story';
  const defaultLimit = isStory ? 6 : 5;
  const limit = Number.isFinite(limitRaw)
    ? Math.max(1, Math.min(8, Math.trunc(limitRaw)))
    : defaultLimit;

  const range = getShareRange(rangeKey);
  const events = await fetchEventsInRange(
    range.start.toISOString(),
    range.end.toISOString(),
    limit,
  );
  const shareEvents: ShareEvent[] = toShareEvents(events);

  // Sizing tuned per format.
  const pad = isStory ? 90 : 80;
  const kickerSize = isStory ? 30 : 30;
  const headlineSize = isStory ? 104 : 92;
  const rowTitleSize = isStory ? 44 : 40;
  const rowMetaSize = isStory ? 30 : 28;
  const titleMax = 40;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: BG,
          padding: `${pad}px`,
          fontFamily: 'sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              color: '#f5d0fe',
              fontSize: kickerSize,
              fontWeight: 600,
              letterSpacing: 3,
            }}
          >
            WHAT&apos;S ON IN BERLIN
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: headlineSize,
              fontWeight: 800,
              color: 'white',
              lineHeight: 1,
              marginTop: 12,
            }}
          >
            {range.headline}
          </div>
        </div>

        {/* Event list */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', gap: 26 }}>
          {shareEvents.length === 0 ? (
            <div style={{ display: 'flex', fontSize: rowTitleSize, color: '#f0abfc' }}>
              {'Fresh picks landing soon \u2014 check the app.'}
            </div>
          ) : (
            shareEvents.map((e) => (
              <div key={e.id} style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'baseline' }}>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: rowMetaSize,
                      fontWeight: 700,
                      color: '#f0abfc',
                      minWidth: isStory ? 180 : 165,
                    }}
                  >
                    {e.when}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: rowTitleSize,
                      fontWeight: 700,
                      color: 'white',
                    }}
                  >
                    {clampTitle(e.title, titleMax)}
                  </div>
                </div>
                {e.venue ? (
                  <div
                    style={{
                      display: 'flex',
                      marginLeft: isStory ? 180 : 165,
                      marginTop: 4,
                      fontSize: rowMetaSize,
                      color: '#d8b4fe',
                    }}
                  >
                    {clampTitle(e.venue, 44)}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              height: 12,
              borderRadius: 9999,
              background: RAINBOW,
              marginBottom: 22,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, color: 'white' }}>
              {SITE_NAME}
            </div>
            <div style={{ display: 'flex', fontSize: 26, color: '#f0abfc' }}>
              {SITE_URL.replace(/^https?:\/\//, '')}
            </div>
          </div>
        </div>
      </div>
    ),
    { width, height },
  );
}
