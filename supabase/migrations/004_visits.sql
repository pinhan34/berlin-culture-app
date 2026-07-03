-- ============================================================
-- Migration 004: Visit / attribution tracking (UTM landing capture)
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
--
-- Records where visitors come from — the UTM tags our share links carry
-- (utm_source/medium/campaign) plus the external referrer — so we can see which
-- distribution channel actually delivers traffic (docs/DISTRIBUTION.md §19).
--
-- Consent-gated + anonymous: rows are written only after analytics consent, via
-- the /api/track-visit route using the SERVICE ROLE key. RLS grants NO policies
-- to anon/authenticated, so raw rows are never client-readable. No PII.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.visits (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  anon_id       uuid,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  referrer      text,        -- external referring host, if any (e.g. 'reddit.com')
  path          text,        -- landing path (e.g. '/')
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS visits_created_at_idx ON public.visits (created_at);
CREATE INDEX IF NOT EXISTS visits_utm_source_idx ON public.visits (utm_source);

-- ------------------------------------------------------------
-- Row Level Security: no client access; writes via service role only.
-- ------------------------------------------------------------
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

-- (Intentionally no SELECT/INSERT policies for anon/authenticated roles.)
