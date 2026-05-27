-- ============================================================
-- Migration 001: Align schema with all 11 adapters
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1A. Deduplication constraint for upsert support
-- runner.ts uses onConflict: 'venue_id,title,start_time'
ALTER TABLE public.events
ADD CONSTRAINT events_venue_title_start_unique
UNIQUE (venue_id, title, start_time);

-- 1B. Enhance venues table with metadata columns
ALTER TABLE public.venues
ADD COLUMN website_url text,
ADD COLUMN source_type text DEFAULT 'public'
  CHECK (source_type IN ('public', 'personal'));

-- 1C. Populate all 11 venues with explicit IDs matching adapter code
INSERT INTO public.venues (id, name, address, website_url, source_type)
OVERRIDING SYSTEM VALUE
VALUES
  (1,  'Sinema Transtopia',     'Lindower Str. 20, 13347 Berlin',    'https://sinematranstopia.de',      'public'),
  (2,  'MeetUp Groups',          NULL,                                'https://www.meetup.com',           'personal'),
  (3,  'Village Berlin',         NULL,                                'https://wearevillage.org',         'public'),
  (4,  'Neurodivergent Berlin',  NULL,                                'https://neurodivergent.community', 'public'),
  (5,  'SO36',                   'Oranienstraße 190, 10999 Berlin',   'https://so36.com',                 'public'),
  (6,  'Flutgraben',             'Am Flutgraben 3, 12435 Berlin',     'https://flutgraben.org',           'public'),
  (7,  'Telegram Groups',        NULL,                                 NULL,                              'personal'),
  (8,  'ART at Berlin',          NULL,                                'https://www.artatberlin.com',      'public'),
  (9,  'Festsaal Kreuzberg',     'Skalitzer Str. 130, 10999 Berlin',  'https://festsaal-kreuzberg.de',   'public'),
  (10, 'OYA Bar',                'Mariannenstraße 6, 10997 Berlin',   'https://oya-kollektiv.org',        'public'),
  (11, 'Gelegenheiten',          NULL,                                 NULL,                              'public');

-- 1D. Reset identity sequence so next auto-generated ID is 12
SELECT setval(pg_get_serial_sequence('public.venues', 'id'), 11);
