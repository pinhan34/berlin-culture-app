'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { Event } from '@/lib/types';
import { getVenueCategory, type VenueCategory } from '@/lib/venueCategories';
import { getInteractions, type Interaction } from '@/lib/interactions';
import { buildTasteProfile, scoreEvent } from '@/lib/recommendations';
import { EventCard } from './EventCard';
import { Confetti } from './Confetti';

interface Props {
  events: Event[];
  favouriteIds?: number[];
}

type SpinMode = 'random' | 'vibe';

const SEGMENTS: { category: VenueCategory; label: string; color: string; darkColor: string }[] = [
  { category: 'art',       label: 'Art',       color: '#0d9488', darkColor: '#2dd4bf' },
  { category: 'music',     label: 'Music',     color: '#9333ea', darkColor: '#c084fc' },
  { category: 'community', label: 'Community', color: '#ea580c', darkColor: '#fb923c' },
  { category: 'personal',  label: 'My Feeds',  color: '#d97706', darkColor: '#fbbf24' },
];

const CATEGORY_LABEL: Record<VenueCategory, string> = {
  art: 'Art & film',
  music: 'Music',
  community: 'Community',
  personal: 'your feeds',
};

const SEGMENT_ANGLE = 360 / SEGMENTS.length;

/** Min taste signals (clicks/saves/favourites) before My Vibe can curate. */
const TASTE_THRESHOLD = 3;

export function SurpriseMe({ events, favouriteIds = [] }: Props) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [picked, setPicked] = useState<Event | null>(null);
  const [landedCategory, setLandedCategory] = useState<VenueCategory | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [mode, setMode] = useState<SpinMode>('random');
  const [shownIds, setShownIds] = useState<Set<number>>(new Set());
  const [fire, setFire] = useState(0);

  // Local taste signals (loaded after mount to stay client-only).
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  useEffect(() => { setInteractions(getInteractions()); }, []);

  const profile = useMemo(
    () => buildTasteProfile(events, interactions, favouriteIds),
    [events, interactions, favouriteIds],
  );
  const hasTaste = profile.totalSignals >= TASTE_THRESHOLD;

  const topCategory = useMemo<VenueCategory | null>(() => {
    let best: VenueCategory | null = null;
    let bestScore = 0;
    for (const [cat, score] of Object.entries(profile.categoryScores) as [VenueCategory, number][]) {
      if (score > bestScore) { best = cat; bestScore = score; }
    }
    return best;
  }, [profile]);

  // Categories that currently have at least one event — used to dim empty wheel segments.
  const categoriesWithEvents = useMemo(() => {
    const set = new Set<VenueCategory>();
    for (const e of events) set.add(getVenueCategory(e.venue_id));
    return set;
  }, [events]);

  function resetResult() {
    setPicked(null);
    setLandedCategory(null);
    setReason(null);
  }

  function switchMode(m: SpinMode) {
    if (spinning || m === mode) return;
    setMode(m);
    resetResult();
  }

  // ───────── Surprise me: pure-random wheel spin ─────────
  const spin = useCallback(() => {
    if (spinning || events.length === 0) return;

    resetResult();
    setSpinning(true);

    let pool = shownIds;
    let available = SEGMENTS
      .map(s => s.category)
      .filter(cat => events.some(e => getVenueCategory(e.venue_id) === cat && !pool.has(e.id)));

    if (available.length === 0) {
      pool = new Set();
      setShownIds(pool);
      available = SEGMENTS.map(s => s.category).filter(cat => categoriesWithEvents.has(cat));
    }
    if (available.length === 0) { setSpinning(false); return; }

    const targetCat = available[Math.floor(Math.random() * available.length)]!;
    const targetIdx = SEGMENTS.findIndex(s => s.category === targetCat);
    const extraSpins = 4 + Math.floor(Math.random() * 3);
    const targetAngle = extraSpins * 360 + targetIdx * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
    setRotation(prev => prev + targetAngle);

    setTimeout(() => {
      setSpinning(false);
      setLandedCategory(targetCat);

      const candidates = events.filter(
        e => getVenueCategory(e.venue_id) === targetCat && !pool.has(e.id),
      );
      const chosen = candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]!
        : null;

      if (chosen) {
        setPicked(chosen);
        setShownIds(prev => new Set(prev).add(chosen.id));
        setFire(f => f + 1);
      }
    }, 3000);
  }, [spinning, events, shownIds, categoriesWithEvents]);

  // ───────── My vibe: curated pick from the taste profile ─────────
  const pickForVibe = useCallback(() => {
    if (events.length === 0) return;
    resetResult();

    let pool = shownIds;
    const scoreAll = (skipShown: boolean) =>
      events
        .filter(e => !skipShown || !pool.has(e.id))
        .map(e => ({ e, s: scoreEvent(e, profile) }))
        .filter(x => x.s > 0)
        .sort((a, b) => b.s - a.s);

    let scored = scoreAll(true);
    if (scored.length === 0) {
      // Seen everything that matches — start the taste cycle over.
      pool = new Set();
      setShownIds(pool);
      scored = scoreAll(false);
    }

    // No taste matches in the current feed — fall back to a random event.
    if (scored.length === 0) {
      const e = events[Math.floor(Math.random() * events.length)]!;
      setPicked(e);
      setReason(null);
      setShownIds(prev => new Set(prev).add(e.id));
      setFire(f => f + 1);
      return;
    }

    // Pick among the top matches for a little variety run-to-run.
    const topK = scored.slice(0, Math.min(5, scored.length));
    const chosen = topK[Math.floor(Math.random() * topK.length)]!.e;
    const cat = getVenueCategory(chosen.venue_id);
    const venueAffinity = profile.venueScores.get(chosen.venue_id) ?? 0;

    setReason(
      venueAffinity > 0
        ? 'A venue you keep coming back to'
        : `More ${CATEGORY_LABEL[cat]} — your most-tapped scene lately`,
    );
    setPicked(chosen);
    setShownIds(prev => new Set(prev).add(chosen.id));
    setFire(f => f + 1);
  }, [events, profile, shownIds]);

  const subtitle = mode === 'random'
    ? 'Spin the wheel and let Berlin surprise you'
    : hasTaste
      ? 'Hand-picked from what you tap and save'
      : 'Learning your taste as you browse';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-stone-300 bg-stone-50/50 p-6 dark:border-purple-900/40 dark:bg-[#16101e]/50">
      <Confetti fire={fire} />
      <div className="text-center">
        <p className="mb-1 font-heading text-lg font-bold text-stone-700 dark:text-stone-200">
          Can&apos;t decide?
        </p>
        <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">{subtitle}</p>

        {/* Mode toggle */}
        <div className="mb-2 inline-flex rounded-full border border-stone-200 bg-white p-0.5 text-xs font-semibold dark:border-purple-900/40 dark:bg-[#16101e]">
          {([['random', '\u{1F3B2} Surprise me'], ['vibe', '\u2728 My vibe']] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => switchMode(value)}
              className={`rounded-full px-3.5 py-1.5 transition-all ${
                mode === value
                  ? 'bg-fuchsia-600 text-white shadow-sm dark:bg-fuchsia-500'
                  : 'text-stone-500 hover:text-fuchsia-600 dark:text-stone-400 dark:hover:text-fuchsia-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mx-auto mb-5 max-w-xs text-xs text-stone-400 dark:text-stone-500">
          {mode === 'random'
            ? 'Totally random across every Berlin scene.'
            : 'Curated from your taste — no two people get the same pick.'}
        </p>
      </div>

      {/* ───────── Surprise me (wheel) ───────── */}
      {mode === 'random' && (
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-10">
          <div className="relative h-48 w-48 flex-shrink-0">
            <div className="absolute -top-2 left-1/2 z-10 -translate-x-1/2">
              <div className="h-0 w-0 border-l-[10px] border-r-[10px] border-t-[14px] border-l-transparent border-r-transparent border-t-fuchsia-600 dark:border-t-fuchsia-400" />
            </div>

            <div
              className="h-full w-full rounded-full border-4 border-stone-200 shadow-lg dark:border-purple-800"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
              }}
            >
              <svg viewBox="0 0 200 200" className="h-full w-full">
                {SEGMENTS.map((seg, i) => {
                  const startAngle = i * SEGMENT_ANGLE;
                  const endAngle = startAngle + SEGMENT_ANGLE;
                  const startRad = (startAngle - 90) * (Math.PI / 180);
                  const endRad = (endAngle - 90) * (Math.PI / 180);
                  const x1 = 100 + 96 * Math.cos(startRad);
                  const y1 = 100 + 96 * Math.sin(startRad);
                  const x2 = 100 + 96 * Math.cos(endRad);
                  const y2 = 100 + 96 * Math.sin(endRad);
                  const largeArc = SEGMENT_ANGLE > 180 ? 1 : 0;

                  const midRad = ((startAngle + endAngle) / 2 - 90) * (Math.PI / 180);
                  const labelX = 100 + 58 * Math.cos(midRad);
                  const labelY = 100 + 58 * Math.sin(midRad);
                  const labelRotation = (startAngle + endAngle) / 2;

                  const hasEvents = categoriesWithEvents.has(seg.category);
                  return (
                    <g key={seg.category} opacity={hasEvents ? 1 : 0.3}>
                      <path
                        d={`M100,100 L${x1},${y1} A96,96 0 ${largeArc},1 ${x2},${y2} Z`}
                        fill={seg.color}
                        stroke="white"
                        strokeWidth="1.5"
                        className="dark:opacity-90"
                      />
                      <text
                        x={labelX}
                        y={labelY}
                        fill="white"
                        fontSize="12"
                        fontWeight="600"
                        textAnchor="middle"
                        dominantBaseline="central"
                        transform={`rotate(${labelRotation}, ${labelX}, ${labelY})`}
                      >
                        {seg.label}
                      </text>
                    </g>
                  );
                })}
                <circle cx="100" cy="100" r="18" fill="white" className="dark:fill-[#16101e]" />
                <text x="100" y="100" fill="currentColor" fontSize="16" textAnchor="middle" dominantBaseline="central" className="text-stone-600 dark:text-stone-300">
                  ?
                </text>
              </svg>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 text-center sm:items-start sm:text-left">
            {!picked && !spinning && !landedCategory && (
              <button
                onClick={spin}
                className="hover-wiggle rounded-full bg-fuchsia-600 px-8 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-fuchsia-700 hover:shadow-lg active:scale-95 dark:bg-fuchsia-500 dark:hover:bg-fuchsia-600"
              >
                Spin the wheel
              </button>
            )}

            {spinning && (
              <p className="animate-pulse font-heading text-sm font-semibold text-fuchsia-600 dark:text-fuchsia-400">
                Spinning...
              </p>
            )}

            {picked && !spinning && (
              <div key={picked.id} className="w-full max-w-sm space-y-3 animate-scale-pop">
                <p className="font-heading text-sm font-bold text-fuchsia-600 dark:text-fuchsia-400">
                  We found a gem in {SEGMENTS.find(s => s.category === landedCategory)?.label}
                </p>
                <EventCard event={picked} highlight />
                <button
                  onClick={spin}
                  className="hover-wiggle rounded-full border border-fuchsia-300 bg-fuchsia-50 px-5 py-2 text-sm font-medium text-fuchsia-700 transition-all hover:bg-fuchsia-100 active:scale-95 dark:border-fuchsia-700 dark:bg-fuchsia-950/30 dark:text-fuchsia-300 dark:hover:bg-fuchsia-950/50"
                >
                  Spin again
                </button>
              </div>
            )}

            {landedCategory && !picked && !spinning && (
              <div className="space-y-3 animate-scale-pop">
                <p className="text-sm font-medium text-stone-500 dark:text-stone-400">
                  No events in {SEGMENTS.find(s => s.category === landedCategory)?.label} right now
                </p>
                <button
                  onClick={spin}
                  className="hover-wiggle rounded-full border border-fuchsia-300 bg-fuchsia-50 px-5 py-2 text-sm font-medium text-fuchsia-700 transition-all hover:bg-fuchsia-100 active:scale-95 dark:border-fuchsia-700 dark:bg-fuchsia-950/30 dark:text-fuchsia-300 dark:hover:bg-fuchsia-950/50"
                >
                  Spin again
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────── My vibe (curated) ───────── */}
      {mode === 'vibe' && (
        <div className="mx-auto flex max-w-sm flex-col items-center gap-4 text-center">
          {!hasTaste ? (
            <div className="space-y-3 animate-scale-pop">
              <span className="block text-4xl" aria-hidden="true">{'\u{1F331}'}</span>
              <p className="font-heading text-sm font-bold text-stone-700 dark:text-stone-200">
                My Vibe is still learning
              </p>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Tap into events and save the ones you love. After a few signals
                ({profile.totalSignals}/{TASTE_THRESHOLD}), I&apos;ll start hand-picking
                events that match your taste.
              </p>
              <button
                onClick={() => switchMode('random')}
                className="hover-wiggle rounded-full border border-fuchsia-300 bg-fuchsia-50 px-5 py-2 text-sm font-medium text-fuchsia-700 transition-all hover:bg-fuchsia-100 active:scale-95 dark:border-fuchsia-700 dark:bg-fuchsia-950/30 dark:text-fuchsia-300 dark:hover:bg-fuchsia-950/50"
              >
                {'\u{1F3B2}'} Spin randomly instead
              </button>
            </div>
          ) : !picked ? (
            <div className="space-y-4 animate-scale-pop">
              <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50/60 px-4 py-3 text-sm dark:border-fuchsia-900/40 dark:bg-fuchsia-950/20">
                <p className="text-stone-600 dark:text-stone-300">
                  Based on <span className="font-bold text-fuchsia-700 dark:text-fuchsia-300">{profile.totalSignals}</span> signals,
                  {topCategory ? (
                    <> you&apos;re into <span className="font-bold text-fuchsia-700 dark:text-fuchsia-300">{CATEGORY_LABEL[topCategory]}</span> right now.</>
                  ) : (
                    <> I&apos;ve got a read on your taste.</>
                  )}
                </p>
              </div>
              <button
                onClick={pickForVibe}
                className="hover-wiggle rounded-full bg-gradient-to-r from-fuchsia-600 to-pink-500 px-8 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg active:scale-95"
              >
                {'\u2728'} Pick my kind of event
              </button>
            </div>
          ) : (
            <div key={picked.id} className="w-full space-y-3 animate-scale-pop">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-fuchsia-100 px-3 py-1 font-heading text-xs font-bold text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300">
                {'\u2728'} {reason ?? 'A fresh pick for you'}
              </p>
              <EventCard event={picked} highlight />
              <button
                onClick={pickForVibe}
                className="hover-wiggle rounded-full border border-fuchsia-300 bg-fuchsia-50 px-5 py-2 text-sm font-medium text-fuchsia-700 transition-all hover:bg-fuchsia-100 active:scale-95 dark:border-fuchsia-700 dark:bg-fuchsia-950/30 dark:text-fuchsia-300 dark:hover:bg-fuchsia-950/50"
              >
                Show me another
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
