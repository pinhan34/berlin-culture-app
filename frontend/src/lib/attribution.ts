/**
 * Visit attribution — answers "which channel sent this visitor?" using the UTM tags
 * our share links carry (utm_source/medium/campaign) plus the external referrer.
 * See docs/DISTRIBUTION.md §19.
 *
 * Two layers:
 *  - **First-touch** (functional, on-device): the very first source is remembered in
 *    localStorage with no consent needed — it never leaves the browser and just lets
 *    us attribute a later signup/subscribe to how the visitor originally arrived.
 *  - **Visit log** (consent-gated): once analytics consent is granted, one row per
 *    session is sent to the server so we can count channel performance in aggregate.
 *
 * Keys:
 *   bca_first_touch  — first informative source seen (localStorage)
 *   bca_visit_logged — per-session guard so we log a visit once (sessionStorage)
 */

import { getAnonId } from './anonId';
import { hasAnalyticsConsent } from './consent';

const FIRST_TOUCH_KEY = 'bca_first_touch';
const SESSION_VISIT_KEY = 'bca_visit_logged';

export interface Attribution {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  referrer: string | null; // external host only
  landing: string;
  ts: number;
}

/** External referring host, or null for direct / same-site navigation. */
function externalReferrer(): string | null {
  try {
    const ref = document.referrer;
    if (!ref) return null;
    const host = new URL(ref).hostname.replace(/^www\./, '');
    if (!host || host === window.location.hostname.replace(/^www\./, '')) return null;
    return host;
  } catch {
    return null;
  }
}

function currentParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    source: p.get('utm_source'),
    medium: p.get('utm_medium'),
    campaign: p.get('utm_campaign'),
  };
}

/** Remember the first informative source on-device (no consent needed, no PII). */
export function captureFirstTouch(): void {
  try {
    if (localStorage.getItem(FIRST_TOUCH_KEY)) return; // keep the *first* touch only
    const { source, medium, campaign } = currentParams();
    const referrer = externalReferrer();
    if (!source && !referrer) return; // nothing informative (direct/internal)

    const attr: Attribution = {
      source,
      medium,
      campaign,
      referrer,
      landing: window.location.pathname,
      ts: Date.now(),
    };
    localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(attr));
  } catch {
    // storage unavailable — skip
  }
}

/** The stored first-touch attribution, if any (used e.g. by the newsletter signup). */
export function getFirstTouch(): Attribution | null {
  try {
    const raw = localStorage.getItem(FIRST_TOUCH_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}

/** Log one visit per session to the server — only with consent and something to attribute. */
export function trackVisit(): void {
  try {
    if (!hasAnalyticsConsent()) return;
    if (sessionStorage.getItem(SESSION_VISIT_KEY)) return; // once per session

    const { source, medium, campaign } = currentParams();
    const referrer = externalReferrer();
    if (!source && !referrer) return; // don't log uninformative direct hits

    // Mark first so consent-change re-fires don't double-send.
    sessionStorage.setItem(SESSION_VISIT_KEY, '1');

    const payload = JSON.stringify({
      anonId: getAnonId(),
      source: source ?? null,
      medium: medium ?? null,
      campaign: campaign ?? null,
      referrer,
      path: window.location.pathname,
    });

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon('/api/track-visit', new Blob([payload], { type: 'application/json' }));
      return;
    }
    void fetch('/api/track-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // best-effort — ignore
  }
}
