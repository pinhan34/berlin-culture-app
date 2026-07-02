/**
 * Analytics consent (TTDSG / GDPR-friendly).
 *
 * Splits storage into two buckets:
 *  - **Functional** (always on): on-device personalization — favourites, taste
 *    profile, UI state. Never leaves the browser, so no consent is required.
 *  - **Analytics** (consent-gated): sending anonymous interaction signals to our
 *    server (`/api/track`). Off-device, so we ask first.
 *
 * Until the user chooses, analytics is treated as **not granted** (opt-in), so we
 * don't send anything server-side before consent.
 *
 * Key: bca_analytics_consent = 'granted' | 'denied'
 */

const CONSENT_KEY = 'bca_analytics_consent';

export type ConsentValue = 'granted' | 'denied';

/** Fires whenever consent changes, so listeners (e.g. the banner) can react. */
export const CONSENT_EVENT = 'bca:consent-changed';

export function getConsent(): ConsentValue | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw === 'granted' || raw === 'denied' ? raw : null;
  } catch {
    return null;
  }
}

/** True only if the user has explicitly allowed analytics. Opt-in by default. */
export function hasAnalyticsConsent(): boolean {
  return getConsent() === 'granted';
}

export function setConsent(value: ConsentValue): void {
  try {
    localStorage.setItem(CONSENT_KEY, value);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
    }
  } catch {
    // storage unavailable — silently skip
  }
}
