CREATE SEQUENCE IF NOT EXISTS public.public_entry_number_seq START 1;

CREATE TABLE IF NOT EXISTS public.public_entry_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number TEXT UNIQUE NOT NULL DEFAULT ('TF-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('public.public_entry_number_seq')::text, 6, '0')),
  participant_name TEXT NOT NULL,
  event_name TEXT NOT NULL DEFAULT 'Talent Fest Live 2026',
  status TEXT NOT NULL DEFAULT 'generated',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.public_entry_passes TO service_role;
GRANT USAGE ON SEQUENCE public.public_entry_number_seq TO service_role;

ALTER TABLE public.public_entry_passes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.public_entry_passes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS public_entry_passes_entry_number_idx
  ON public.public_entry_passes(entry_number);
