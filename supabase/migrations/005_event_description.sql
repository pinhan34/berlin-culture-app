-- ============================================================
-- Migration 005: add a free-text description to events
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================
--
-- Why: community/vibe classification only had the event TITLE and venue name
-- to work with. Titles like "Messy Salon #1" never contain words like "queer"
-- or "neurodivergent", so keyword-based lanes silently missed most events at
-- general venues. Storing the source description (Telegram post text, MeetUp
-- event blurb, Festsaal sub-title, …) gives the classifier real text to match.
--
-- Backfill note: the scraper upserts with ignoreDuplicates, so existing rows
-- keep description = NULL until they are re-scraped as new events. New events
-- get a description immediately. No data is lost either way.

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS description text;
