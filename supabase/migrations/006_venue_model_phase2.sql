-- ============================================================
-- Migration 006: Venue model Phase 2 — structured source + venue
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================
--
-- Why: `venue_id` conflates *where we scraped an event* (the source) with
-- *where the event actually happens* (the venue). For aggregator sources
-- (Telegram, MeetUp, Village Berlin, ART at Berlin) one venue_id stands in
-- for many independent real-world places, which today is only recoverable
-- by string-parsing "Event name @ Venue" out of the title (see
-- frontend/src/lib/venueCategories.ts parseTitleVenue(), Phase 1).
--
-- This migration adds structured columns so the real venue can be written
-- at scrape time instead of parsed at render time. `venue_id` keeps meaning
-- "source" — it is never repurposed to mean "venue". See
-- .claude/specs/VENUE_MODEL.md, section "Phase 2" for the full design.
--
-- Backfill note: the scraper upserts with ignoreDuplicates: false, so
-- existing rows keep these columns NULL until either (a) they are
-- re-scraped as part of the normal cron run, or (b) the one-off backfill
-- script (src/scrapers/backfillVenueNames.ts) is run by hand.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS source     text,             -- e.g. 'telegram:queer-events-berlin', 'meetup:berlin-neurodivergent-community'
  ADD COLUMN IF NOT EXISTS venue_name text,              -- real venue, parsed/fetched at scrape time
  ADD COLUMN IF NOT EXISTS venue_key  text,              -- normalised key for dedup (lowercased, no accents)
  ADD COLUMN IF NOT EXISTS city       text,               -- future multi-city
  ADD COLUMN IF NOT EXISTS lat        double precision,
  ADD COLUMN IF NOT EXISTS lng        double precision;

CREATE INDEX IF NOT EXISTS events_venue_key_idx ON public.events (venue_key);
