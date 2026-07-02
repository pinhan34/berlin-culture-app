-- ============================================================
-- Migration 003: Newsletter subscribers
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
--
-- Stores opt-in email subscribers for the weekly "Berlin this week" digest — the
-- owned-audience funnel (see docs/DISTRIBUTION.md §18.2). Email is personal data:
-- writes happen only via the /api/subscribe route using the SERVICE ROLE key, and
-- RLS grants NO policies to anon/authenticated, so the list is never readable or
-- writable directly from the client.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.subscribers (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email              text NOT NULL UNIQUE,
  source             text,                                   -- e.g. 'homepage', a UTM source
  confirmed          boolean NOT NULL DEFAULT false,         -- for optional double opt-in later
  unsubscribe_token  uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscribers_created_at_idx ON public.subscribers (created_at);

-- ------------------------------------------------------------
-- Row Level Security: no client access. Inserts go through the API route
-- (service role, bypasses RLS). Reads/exports are done server-side only.
-- ------------------------------------------------------------
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- (Intentionally no SELECT/INSERT policies for anon/authenticated roles.)
