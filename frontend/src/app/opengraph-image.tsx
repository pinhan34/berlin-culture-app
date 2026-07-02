import { ImageResponse } from 'next/og';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/site';

export const alt = 'Berlin Culture — your queer + indie guide to Berlin';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Branded share card (1200×630) shown when the link is pasted into
 * WhatsApp / Instagram / Reddit / Slack etc. Auto-generated — no image asset
 * needed. Used for both Open Graph and Twitter (see twitter-image.tsx).
 */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0d0b11 0%, #3b0764 55%, #a21caf 100%)',
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            color: '#f5d0fe',
            fontSize: 34,
            fontWeight: 600,
            letterSpacing: 2,
          }}
        >
          {"WHAT'S ON IN BERLIN"}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 128, fontWeight: 800, color: 'white', lineHeight: 1 }}>
            {SITE_NAME}
          </div>
          <div style={{ display: 'flex', marginTop: 28, fontSize: 46, color: '#f0abfc' }}>
            {SITE_TAGLINE}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            height: 16,
            borderRadius: 9999,
            background:
              'linear-gradient(90deg, #ec4899, #d946ef, #a855f7, #60a5fa, #2dd4bf, #4ade80, #fbbf24)',
          }}
        />
      </div>
    ),
    { ...size },
  );
}
