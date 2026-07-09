ALTER TABLE public.entry_passes
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS company_address TEXT,
  ADD COLUMN IF NOT EXISTS coordinator_name TEXT,
  ADD COLUMN IF NOT EXISTS company_contact_number TEXT,
  ADD COLUMN IF NOT EXISTS company_email TEXT,
  ADD COLUMN IF NOT EXISTS employee_full_name TEXT,
  ADD COLUMN IF NOT EXISTS designation TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS employee_mobile_number TEXT,
  ADD COLUMN IF NOT EXISTS employee_email TEXT,
  ADD COLUMN IF NOT EXISTS award_category TEXT,
  ADD COLUMN IF NOT EXISTS other_award_category TEXT,
  ADD COLUMN IF NOT EXISTS working_since DATE,
  ADD COLUMN IF NOT EXISTS total_experience TEXT,
  ADD COLUMN IF NOT EXISTS major_achievements TEXT,
  ADD COLUMN IF NOT EXISTS participation_type TEXT,
  ADD COLUMN IF NOT EXISTS number_of_participants INTEGER,
  ADD COLUMN IF NOT EXISTS registration_fees NUMERIC,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS transaction_reference TEXT,
  ADD COLUMN IF NOT EXISTS employee_signature_url TEXT,
  ADD COLUMN IF NOT EXISTS company_authorized_signature_url TEXT,
  ADD COLUMN IF NOT EXISTS declaration_accepted BOOLEAN,
  ADD COLUMN IF NOT EXISTS registration_date DATE;

CREATE INDEX IF NOT EXISTS entry_passes_award_category_idx
  ON public.entry_passes(award_category);

CREATE INDEX IF NOT EXISTS entry_passes_company_name_idx
  ON public.entry_passes(company_name);
