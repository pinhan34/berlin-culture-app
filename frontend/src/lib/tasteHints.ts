/**
 * Soft taste hints — remembers which vibe/community filters a user picks, so
 * their explicit choices gently shape recommendations even after the filter is
 * cleared. Stored in localStorage only (no backend), capped per key so a single
 * dimension can't dominate forever.
 *
 * Key used:
 *   bca_taste_hints — { vibes: {...}, communities: {...} }
 */

import type { Vibe } from './vibes';
import type { Community } from './communities';

const HINTS_KEY = 'bca_taste_hints';
const MAX_PER_KEY = 10;

export interface StoredHints {
  vibes: Partial<Record<Vibe, number>>;
  communities: Partial<Record<Community, number>>;
}

function read(): StoredHints {
  try {
    const raw = localStorage.getItem(HINTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredHints>;
      return { vibes: parsed.vibes ?? {}, communities: parsed.communities ?? {} };
    }
  } catch {
    // ignore
  }
  return { vibes: {}, communities: {} };
}

function write(hints: StoredHints): void {
  try {
    localStorage.setItem(HINTS_KEY, JSON.stringify(hints));
  } catch {
    // storage unavailable — silently skip
  }
}

export function getTasteHints(): StoredHints {
  return read();
}

export function recordVibeHint(vibe: Vibe): StoredHints {
  const hints = read();
  hints.vibes[vibe] = Math.min((hints.vibes[vibe] ?? 0) + 1, MAX_PER_KEY);
  write(hints);
  return hints;
}

export function recordCommunityHint(community: Community): StoredHints {
  const hints = read();
  hints.communities[community] = Math.min((hints.communities[community] ?? 0) + 1, MAX_PER_KEY);
  write(hints);
  return hints;
}
