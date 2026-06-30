/**
 * Anonymous, per-browser identity for server-side interaction tracking
 * (Personalization Tier 2a). This is a random UUID — it contains no PII and is
 * not linked to any account. It lets us group a single browser's signals
 * server-side to power aggregate features (Trending, collaborative filtering).
 *
 * Key used:
 *   bca_anon_id — a v4 UUID
 */

const ANON_ID_KEY = 'bca_anon_id';

function generateId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // fall through
  }
  // Fallback for environments without crypto.randomUUID.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Returns the stable anonymous id for this browser, creating one if needed. */
export function getAnonId(): string | null {
  try {
    let id = localStorage.getItem(ANON_ID_KEY);
    if (!id) {
      id = generateId();
      localStorage.setItem(ANON_ID_KEY, id);
    }
    return id;
  } catch {
    return null; // storage unavailable (e.g. SSR / privacy mode)
  }
}
