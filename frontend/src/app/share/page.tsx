import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';
import { fetchEventsInRange } from '@/lib/eventsServer';
import {
  buildShareCaption,
  buildShareLink,
  getShareRange,
  isShareChannelKey,
  isShareRangeKey,
  SHARE_CHANNELS,
  SHARE_RANGE_KEYS,
  toShareEvents,
  type ShareChannelKey,
  type ShareRangeKey,
} from '@/lib/shareContent';
import { CopyButton } from '@/components/CopyButton';

/**
 * Owner-facing "share generator" — turns this weekend's events into a ready-to-post
 * graphic (via /api/share) + a copyable caption. Not for end users; noindex.
 * See docs/DISTRIBUTION.md §19 (the content-marketing motion).
 */
export const metadata: Metadata = {
  title: 'Share generator',
  robots: { index: false, follow: false },
};

const FORMATS = [
  { key: 'post', label: 'Feed (4:5)', ratio: '4 / 5' },
  { key: 'story', label: 'Story (9:16)', ratio: '9 / 16' },
  { key: 'square', label: 'Square (1:1)', ratio: '1 / 1' },
] as const;

const RANGE_LABELS: Record<ShareRangeKey, string> = {
  today: 'Tonight',
  tomorrow: 'Tomorrow',
  weekend: 'This weekend',
  week: 'This week',
};

function pill(active: boolean): string {
  return `rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
    active
      ? 'border-fuchsia-500 bg-fuchsia-600 text-white dark:border-fuchsia-400 dark:bg-fuchsia-500'
      : 'border-stone-300 text-stone-600 hover:border-fuchsia-400 hover:text-fuchsia-600 dark:border-purple-900/50 dark:text-stone-300 dark:hover:border-fuchsia-600'
  }`;
}

type SP = { range?: string; format?: string; channel?: string };

// Channels where captions can't carry a clickable link → point to bio instead.
const BIO_LINK_CHANNELS = new Set<ShareChannelKey>(['instagram', 'tiktok']);

export default async function SharePage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;

  const rangeKey: ShareRangeKey = isShareRangeKey(sp.range) ? sp.range : 'weekend';
  const format = FORMATS.find(f => f.key === sp.format)?.key ?? 'post';
  const ratio = FORMATS.find(f => f.key === format)?.ratio ?? '4 / 5';
  const channel: ShareChannelKey = isShareChannelKey(sp.channel) ? sp.channel : 'instagram';

  const range = getShareRange(rangeKey);
  const events = await fetchEventsInRange(
    range.start.toISOString(),
    range.end.toISOString(),
    format === 'story' ? 6 : 5,
  );
  const shareEvents = toShareEvents(events);

  const link = buildShareLink(SITE_URL, channel, rangeKey);
  const caption = buildShareCaption(shareEvents, range, link, {
    linkInBio: BIO_LINK_CHANNELS.has(channel),
  });

  const imgSrc = `/api/share?range=${rangeKey}&format=${format}`;

  const buildHref = (next: Partial<SP>) =>
    `/share?range=${next.range ?? rangeKey}&format=${next.format ?? format}` +
    `&channel=${next.channel ?? channel}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="font-heading text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
        Share generator
      </h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        Auto-built from the live feed. Pick a range + format, download the image, copy the
        caption, and post. The link carries a UTM tag so you can see what works.
      </p>

      {/* Controls */}
      <div className="mt-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-bold uppercase tracking-wider text-stone-400">
            Range
          </span>
          {SHARE_RANGE_KEYS.map(k => (
            <a key={k} href={buildHref({ range: k })} className={pill(k === rangeKey)}>
              {RANGE_LABELS[k]}
            </a>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-bold uppercase tracking-wider text-stone-400">
            Format
          </span>
          {FORMATS.map(f => (
            <a key={f.key} href={buildHref({ format: f.key })} className={pill(f.key === format)}>
              {f.label}
            </a>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-bold uppercase tracking-wider text-stone-400">
            Channel
          </span>
          {SHARE_CHANNELS.map(c => (
            <a key={c.key} href={buildHref({ channel: c.key })} className={pill(c.key === channel)}>
              {c.label}
            </a>
          ))}
        </div>
        <p className="text-xs text-stone-400 dark:text-stone-500">
          Link ({channel}):{' '}
          <span className="break-all font-mono text-stone-500 dark:text-stone-400">{link}</span>
        </p>
      </div>

      {/* Preview + caption */}
      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <div className="space-y-3">
          <div
            className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-stone-200 shadow-sm dark:border-purple-900/50"
            style={{ aspectRatio: ratio }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgSrc} alt="Share preview" width={1080} className="h-full w-full object-cover" />
          </div>
          <div className="flex justify-center">
            <a
              href={imgSrc}
              download={`berlin-${rangeKey}-${format}.png`}
              className="rounded-full border border-stone-300 px-4 py-1.5 text-sm font-semibold text-stone-700 transition-colors hover:border-fuchsia-400 hover:text-fuchsia-600 dark:border-purple-900/50 dark:text-stone-200 dark:hover:border-fuchsia-600"
            >
              Download image
            </a>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400">Caption</h2>
            <CopyButton text={caption} />
          </div>
          <pre className="whitespace-pre-wrap rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm leading-relaxed text-stone-700 dark:border-purple-900/50 dark:bg-[#16101e] dark:text-stone-200">
{caption}
          </pre>
          {shareEvents.length === 0 ? (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              No events in this range yet — try a wider range.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
