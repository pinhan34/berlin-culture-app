-- ============================================================
-- Migration 002: Interaction tracking (Personalization Tier 2a)
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
--
-- Stores anonymous engagement signals (clicks, calendar saves, favourites,
-- hides) keyed by a client-generated anonymous id. This is the server-side
-- data foundation for aggregate features (Trending, collaborative filtering)
-- and cross-user analytics. No PII is stored.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.interactions (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  anon_id     uuid NOT NULL,
  event_id    bigint NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  venue_id    integer,
  action      text NOT NULL CHECK (action IN ('click', 'calendar', 'favourite', 'hide')),
  domain      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS interactions_event_id_idx  ON public.interactions (event_id);
CREATE INDEX IF NOT EXISTS interactions_anon_id_idx   ON public.interactions (anon_id);
CREATE INDEX IF NOT EXISTS interactions_created_at_idx ON public.interactions (created_at);

-- ------------------------------------------------------------
-- Row Level Security
-- Writes happen via the API route using the SERVICE ROLE key, which bypasses
-- RLS. We still enable RLS and grant NO policies to anon/authenticated, so raw
-- per-user rows are never readable or writable directly from the client.
-- Aggregate reads (Trending, etc.) are served by API routes using the service
-- role, returning only grouped/aggregated data.
-- ------------------------------------------------------------
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

-- (Intentionally no SELECT/INSERT policies for anon/authenticated roles.)
