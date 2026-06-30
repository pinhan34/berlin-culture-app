/**
 * Interaction tracker — writes to localStorage only, no backend.
 * Step 3 (AI recommendations) reads this history to find patterns.
 * Phase 0 (monetization) also records the click destination so we can see
 * which ticketing platforms / venues our outbound traffic actually goes to.
 *
 * Keys used:
 *   bca_interactions  — last 200 raw interaction events
 */

import { getAnonId } from './anonId';

const INTERACTIONS_KEY = 'bca_interactions';
const MAX_INTERACTIONS = 200;

export type InteractionAction = 'click' | 'calendar';

/** Actions sent to the server (superset of local InteractionAction). */
export type ServerAction = InteractionAction | 'favourite' | 'hide';

export interface Interaction {
  eventId: number;
  timestamp: number;
  action: InteractionAction;
  /** Destination host of the outbound link (e.g. "ra.co"), if known. */
  domain?: string;
  /** Venue the event belongs to, for per-venue traffic stats. */
  venueId?: number;
}

export interface InteractionMeta {
  domain?: string | null;
  venueId?: number;
}

/**
 * Maps alternate/short hostnames to a single canonical brand domain, so the
 * traffic panel groups e.g. meetu.ps + meetup.com, or de.ra.co + ra.co together.
 */
const DOMAIN_ALIASES: Record<string, string> = {
  'meetu.ps': 'meetup.com',
  'de.ra.co': 'ra.co',
  'eventbrite.de': 'eventbrite.com',
};

/** Extracts a clean, canonical hostname ("ra.co") from a URL, or null if unparseable. */
export function extractDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    return DOMAIN_ALIASES[host] ?? host;
  } catch {
    return null;
  }
}

function safeRead(): Interaction[] {
  try {
    const raw = localStorage.getItem(INTERACTIONS_KEY);
    return raw ? (JSON.parse(raw) as Interaction[]) : [];
  } catch {
    return [];
  }
}

export function trackInteraction(
  eventId: number,
  action: InteractionAction,
  meta?: InteractionMeta,
): void {
  try {
    const entry: Interaction = { eventId, timestamp: Date.now(), action };
    if (meta?.domain) entry.domain = meta.domain;
    if (typeof meta?.venueId === 'number') entry.venueId = meta.venueId;

    const history = safeRead();
    const next = [...history, entry].slice(-MAX_INTERACTIONS);
    localStorage.setItem(INTERACTIONS_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable — silently skip
  }

  // Tier 2a — also send to the server (best-effort, never blocks the UX).
  syncInteraction(eventId, action, meta);
}

/**
 * Best-effort server write (Personalization Tier 2a). Uses sendBeacon so the
 * request survives the outbound navigation that follows a click; falls back to
 * fetch(keepalive). Silently no-ops if there's no anon id or storage.
 */
export function syncInteraction(
  eventId: number,
  action: ServerAction,
  meta?: InteractionMeta,
): void {
  try {
    const anonId = getAnonId();
    if (!anonId) return;

    const payload = JSON.stringify({
      anonId,
      eventId,
      action,
      venueId: typeof meta?.venueId === 'number' ? meta.venueId : undefined,
      domain: meta?.domain ?? undefined,
    });

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }));
      return;
    }
    void fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // best-effort — ignore
  }
}

/** Returns the full interaction history. Used by the Step 3 AI layer. */
export function getInteractions(): Interaction[] {
  return safeRead();
}

export interface StatRow<T> {
  key: T;
  count: number;
}

/**
 * Phase 0 measurement: outbound clicks grouped by destination domain,
 * sorted most-clicked first. Note: localStorage is per-browser, so this
 * reflects THIS browser only — a backend table is the upgrade path for
 * true cross-user aggregate data.
 */
export function getClicksByDomain(): StatRow<string>[] {
  const counts = new Map<string, number>();
  for (const it of safeRead()) {
    if (it.action !== 'click' || !it.domain) continue;
    counts.set(it.domain, (counts.get(it.domain) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

/** Phase 0 measurement: outbound clicks grouped by venue id, most-clicked first. */
export function getClicksByVenue(): StatRow<number>[] {
  const counts = new Map<number, number>();
  for (const it of safeRead()) {
    if (it.action !== 'click' || typeof it.venueId !== 'number') continue;
    counts.set(it.venueId, (counts.get(it.venueId) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

/** Total number of tracked outbound clicks (with or without a known domain). */
export function getTotalClicks(): number {
  return safeRead().filter((it) => it.action === 'click').length;
}
