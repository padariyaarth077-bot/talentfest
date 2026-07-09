
-- 1) Move has_role to private schema (not exposed via PostgREST)
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;

-- Recreate entry_passes admin policies to use private.has_role
DROP POLICY IF EXISTS "Admin reads all passes" ON public.entry_passes;
DROP POLICY IF EXISTS "Admin updates passes" ON public.entry_passes;
DROP POLICY IF EXISTS "Admin deletes passes" ON public.entry_passes;

CREATE POLICY "Admin reads all passes" ON public.entry_passes
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admin updates passes" ON public.entry_passes
  FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admin deletes passes" ON public.entry_passes
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- Drop public.has_role now that policies no longer reference it
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- 2) Lock down handle_new_user (trigger function only)
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;

-- 3) Remove overly-permissive anon SELECT policy on entry_passes.
-- Public verification is handled server-side via a trusted server function.
DROP POLICY IF EXISTS "Public verify by id" ON public.entry_passes;
