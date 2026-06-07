'use client';

import { useState, useCallback, useMemo } from 'react';
import type { Event } from '@/lib/types';
import { getVenueCategory, type VenueCategory } from '@/lib/venueCategories';
import { getInteractions } from '@/lib/interactions';
import { EventCard } from './EventCard';
import { Confetti } from './Confetti';

interface Props {
  events: Event[];
}

type SpinMode = 'random' | 'vibe';

const SEGMENTS: { category: VenueCategory; label: string; color: string; darkColor: string }[] = [
  { category: 'art',       label: 'Art',       color: '#0d9488', darkColor: '#2dd4bf' },
  { category: 'music',     label: 'Music',     color: '#9333ea', darkColor: '#c084fc' },
  { category: 'community', label: 'Community', color: '#ea580c', darkColor: '#fb923c' },
  { category: 'personal',  label: 'My Feeds',  color: '#d97706', darkColor: '#fbbf24' },
];

const SEGMENT_ANGLE = 360 / SEGMENTS.length;

/** Build a taste profile: how much the user engages with each category. */
function getCategoryAffinity(events: Event[]): Record<VenueCategory, number> {
  const eventCat = new Map<number, VenueCategory>();
  for (const e of events) eventCat.set(e.id, getVenueCategory(e.venue_id));

  const score: Record<VenueCategory, number> = { art: 0, music: 0, community: 0, personal: 0 };
  for (const it of getInteractions()) {
    const cat = eventCat.get(it.eventId);
    if (cat) score[cat] += it.action === 'calendar' ? 2 : 1; // saves weigh more than clicks
  }
  return score;
}

/** Weighted random pick of a category, biased by affinity (base 1 each). */
function weightedPick(available: VenueCategory[], affinity: Record<VenueCategory, number>): VenueCategory {
  const weights = available.map(c => 1 + affinity[c]);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < available.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return available[i]!;
  }
  return available[available.length - 1]!;
}

export function SurpriseMe({ events }: Props) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [picked, setPicked] = useState<Event | null>(null);
  const [landedCategory, setLandedCategory] = useState<VenueCategory | null>(null);
  const [mode, setMode] = useState<SpinMode>('random');
  const [shownIds, setShownIds] = useState<Set<number>>(new Set());
  const [fire, setFire] = useState(0);

  // Categories that currently have at least one event — used to dim empty wheel segments.
  const categoriesWithEvents = useMemo(() => {
    const set = new Set<VenueCategory>();
    for (const e of events) set.add(getVenueCategory(e.venue_id));
    return set;
  }, [events]);

  const spin = useCallback(() => {
    if (spinning || events.length === 0) return;

    setPicked(null);
    setLandedCategory(null);
    setSpinning(true);

    // A — only consider categories that have not-yet-shown events.
    let pool = shownIds;
    let available = SEGMENTS
      .map(s => s.category)
      .filter(cat => events.some(e => getVenueCategory(e.venue_id) === cat && !pool.has(e.id)));

    // B — if we've shown everything, reset the "seen" set and start fresh.
    if (available.length === 0) {
      pool = new Set();
      setShownIds(pool);
      available = SEGMENTS
        .map(s => s.category)
        .filter(cat => categoriesWithEvents.has(cat));
    }
    if (available.length === 0) { setSpinning(false); return; }

    // C — taste-aware pick in "My vibe" mode, uniform otherwise.
    const targetCat = mode === 'vibe'
      ? weightedPick(available, getCategoryAffinity(events))
      : available[Math.floor(Math.random() * available.length)]!;

    const targetIdx = SEGMENTS.findIndex(s => s.category === targetCat);
    const extraSpins = 4 + Math.floor(Math.random() * 3);
    const targetAngle = extraSpins * 360 + targetIdx * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
    setRotation(prev => prev + targetAngle);

    setTimeout(() => {
      setSpinning(false);
      setLandedCategory(targetCat);

      // B — pick an event we haven't shown yet in this category.
      const candidates = events.filter(
        e => getVenueCategory(e.venue_id) === targetCat && !pool.has(e.id),
      );
      const chosen = candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]!
        : null;

      if (chosen) {
        setPicked(chosen);
        setShownIds(prev => new Set(prev).add(chosen.id));
        setFire(f => f + 1); // E — celebrate
      }
    }, 3000);
  }, [spinning, events, mode, shownIds, categoriesWithEvents]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-stone-300 bg-stone-50/50 p-6 dark:border-purple-900/40 dark:bg-[#16101e]/50">
      <Confetti fire={fire} />
      <div className="text-center">
        <p className="mb-1 font-heading text-lg font-bold text-stone-700 dark:text-stone-200">
          Can&apos;t decide?
        </p>
        <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
          Spin the wheel and let Berlin surprise you
        </p>

        {/* Mode toggle */}
        <div className="mb-5 inline-flex rounded-full border border-stone-200 bg-white p-0.5 text-xs font-semibold dark:border-purple-900/40 dark:bg-[#16101e]">
          {([['random', 'Surprise me'], ['vibe', 'My vibe']] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => { if (!spinning) setMode(value); }}
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
      </div>

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-10">
        {/* Wheel */}
        <div className="relative h-48 w-48 flex-shrink-0">
          {/* Pointer triangle */}
          <div className="absolute -top-2 left-1/2 z-10 -translate-x-1/2">
            <div className="h-0 w-0 border-l-[10px] border-r-[10px] border-t-[14px] border-l-transparent border-r-transparent border-t-fuchsia-600 dark:border-t-fuchsia-400" />
          </div>

          {/* Spinning disc */}
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

        {/* Result / CTA area */}
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
    </div>
  );
}
