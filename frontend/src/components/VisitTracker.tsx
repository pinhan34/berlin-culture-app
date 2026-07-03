'use client';

import { useEffect } from 'react';
import { captureFirstTouch, trackVisit } from '@/lib/attribution';
import { CONSENT_EVENT } from '@/lib/consent';

/**
 * Fire-and-forget visit tracker (UTM landing capture). Records first-touch on-device
 * immediately, and — once analytics consent is granted — logs one visit per session.
 * Re-runs on consent change so a visitor who accepts after landing is still counted.
 * Renders nothing.
 */
export function VisitTracker() {
  useEffect(() => {
    captureFirstTouch();
    trackVisit();

    const onConsent = () => trackVisit();
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent);
  }, []);

  return null;
}
