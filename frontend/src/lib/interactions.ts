/**
 * Interaction tracker — writes to localStorage only, no backend.
 * Step 3 (AI recommendations) will read this history to find patterns.
 *
 * Keys used:
 *   bca_interactions  — last 200 raw interaction events
 */

const INTERACTIONS_KEY = 'bca_interactions';
const MAX_INTERACTIONS = 200;

export type InteractionAction = 'click' | 'calendar';

export interface Interaction {
  eventId: number;
  timestamp: number;
  action: InteractionAction;
}

function safeRead(): Interaction[] {
  try {
    const raw = localStorage.getItem(INTERACTIONS_KEY);
    return raw ? (JSON.parse(raw) as Interaction[]) : [];
  } catch {
    return [];
  }
}

export function trackInteraction(eventId: number, action: InteractionAction): void {
  try {
    const history = safeRead();
    const next = [...history, { eventId, timestamp: Date.now(), action }].slice(
      -MAX_INTERACTIONS,
    );
    localStorage.setItem(INTERACTIONS_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable — silently skip
  }
}

/** Returns the full interaction history. Used by the Step 3 AI layer. */
export function getInteractions(): Interaction[] {
  return safeRead();
}
