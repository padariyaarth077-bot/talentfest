-- Safe support for Admin pass/payment integration.
-- Non-destructive: adds missing metadata and widens status checks used by check-in.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_mode TEXT NOT NULL DEFAULT 'test';

ALTER TABLE public.payments
  ALTER COLUMN provider SET DEFAULT 'dummy';

CREATE INDEX IF NOT EXISTS idx_payments_provider_mode
  ON public.payments(provider, payment_mode);

CREATE INDEX IF NOT EXISTS idx_payments_transaction_id
  ON public.payments(transaction_id);

CREATE INDEX IF NOT EXISTS idx_passes_created_at
  ON public.passes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_passes_checked_in_status
  ON public.passes(checked_in, status);

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname
    INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.passes'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.passes DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.passes'::regclass
      AND conname = 'passes_status_check'
  ) THEN
    ALTER TABLE public.passes
      ADD CONSTRAINT passes_status_check
      CHECK (status IN ('pending', 'active', 'checked_in', 'revoked', 'expired', 'cancelled'));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'check_in_logs'
      AND column_name = 'admin_user_id'
      AND data_type = 'uuid'
  ) THEN
    -- Keep UUID admin IDs supported for current admin auth users.
    NULL;
  END IF;
END $$;
