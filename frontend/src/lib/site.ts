/**
 * Central site config — canonical URL + brand strings reused by metadata,
 * robots, sitemap and JSON-LD. Override the URL in production via the
 * NEXT_PUBLIC_SITE_URL env var (e.g. a custom domain).
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://berlin-culture-app.vercel.app'
).replace(/\/$/, '');

export const SITE_NAME = 'Berlin Culture';

export const SITE_TAGLINE = 'Your queer + indie guide to Berlin';

export const SITE_DESCRIPTION =
  'A curated guide to Berlin\u2019s independent, queer and neurodivergent-friendly ' +
  'events, exhibitions and community happenings \u2014 hand-picked from the city\u2019s ' +
  'best venues and grassroots communities, refreshed through the day.';
