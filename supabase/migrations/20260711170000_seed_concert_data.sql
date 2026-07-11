-- Seed: Set correct concert data and insert real artists
-- Safe to run multiple times (idempotent)
-- Finds the active concert dynamically — no hardcoded IDs

-- 1. Update the existing active concert record (or create one if missing)
--    Dynamically picks the most recent published record.
WITH
upsert AS (
  INSERT INTO public.concert_settings (
    id, eyebrow, title, subtitle,
    event_label, event_title,
    venue, city,
    event_date, start_time, end_time,
    price_text, button_text, button_url,
    map_url, map_embed_url,
    latitude, longitude,
    is_published, updated_at
  )
  SELECT
    COALESCE(
      (SELECT id FROM public.concert_settings WHERE is_published = true ORDER BY updated_at DESC LIMIT 1),
      gen_random_uuid()
    ),
    'Live Concert',
    'Concert Information',
    'The main stage lineup you do not want to miss.',
    'GRAND FINALE',
    'TelentFest Grand Finale',
    'Pramukh Swami Auditorium, Raiya Road, Rajkot, Gujarat',
    'Rajkot, Gujarat',
    '2026-07-26',
    '14:00',
    '19:00',
    'Registration Fee ₹1,500',
    'Registration Form',
    '/registration',
    'https://maps.app.goo.gl/4moYa5aYRXhbvgNK8',
    'https://www.google.com/maps?q=Pramukh+Swami+Auditorium,+Raiya+Road,+Rajkot,+Gujarat&z=14&output=embed',
    22.3039,
    70.8022,
    true,
    now()
  ON CONFLICT (id) DO UPDATE SET
    eyebrow = EXCLUDED.eyebrow,
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    event_label = EXCLUDED.event_label,
    event_title = EXCLUDED.event_title,
    venue = EXCLUDED.venue,
    city = EXCLUDED.city,
    event_date = EXCLUDED.event_date,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    price_text = EXCLUDED.price_text,
    button_text = EXCLUDED.button_text,
    button_url = EXCLUDED.button_url,
    map_url = EXCLUDED.map_url,
    map_embed_url = EXCLUDED.map_embed_url,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    is_published = EXCLUDED.is_published,
    updated_at = now()
  RETURNING id
)
-- 2. Using the active concert id, deactivate stale fake artists,
--    then insert or update the five real artists.
, active_id AS (SELECT id FROM upsert LIMIT 1)
, deactivate_fakes AS (
  UPDATE public.concert_artists
  SET is_active = false, updated_at = now()
  WHERE is_active = true
    AND concert_info_id = (SELECT id FROM active_id)
    AND LOWER(artist_name) IN ('aarav mehta', 'nritya collective', 'studio 47', 'neha kapoor')
)
, artists_data (artist_name, performance_type, display_order) AS (
  VALUES
    ('Dhamu Ahir',     'Influencer',         1),
    ('Sureshbhai Ahir','Singer',             2),
    ('Shiv Ravat',     'Singer',             3),
    ('Karan Odedara',  'Aadesh Music Event', 4),
    ('Sanjaydan Gadhvi','Singer',            5)
)
-- 3. Insert only artists that don't already exist for this concert
, insert_artists AS (
  INSERT INTO public.concert_artists (concert_info_id, artist_name, performance_type, display_order, is_active, created_at, updated_at)
  SELECT
    (SELECT id FROM active_id),
    ad.artist_name,
    ad.performance_type,
    ad.display_order,
    true,
    now(),
    now()
  FROM artists_data ad
  WHERE NOT EXISTS (
    SELECT 1 FROM public.concert_artists ca
    WHERE ca.concert_info_id = (SELECT id FROM active_id)
      AND LOWER(ca.artist_name) = LOWER(ad.artist_name)
  )
)
-- 4. Update existing matching artists (ensure correct type/order/active)
UPDATE public.concert_artists ca
SET
  performance_type = ad.performance_type,
  display_order = ad.display_order,
  is_active = true,
  updated_at = now()
FROM artists_data ad
WHERE ca.concert_info_id = (SELECT id FROM active_id)
  AND LOWER(ca.artist_name) = LOWER(ad.artist_name);
