
-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  city TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- roles
CREATE TYPE public.app_role AS ENUM ('admin', 'participant');
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;

-- auto create profile + participant role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'participant')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- entry pass status
CREATE TYPE public.pass_status AS ENUM ('pending','approved','rejected','checked_in','completed','cancelled','expired');

-- entry number sequence
CREATE SEQUENCE public.entry_number_seq START 1;

-- entry_passes
CREATE TABLE public.entry_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number TEXT UNIQUE NOT NULL DEFAULT ('TF2026-' || lpad(nextval('public.entry_number_seq')::text, 6, '0')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL,
  photo_url TEXT,
  competition TEXT NOT NULL,
  category TEXT NOT NULL,
  sub_category TEXT,
  city TEXT,
  venue TEXT DEFAULT 'Talent Fest Main Arena',
  hall TEXT DEFAULT 'Hall A',
  stage TEXT DEFAULT 'Stage 1',
  entry_gate TEXT DEFAULT 'Gate 3',
  event_date DATE DEFAULT '2026-03-15',
  reporting_time TEXT DEFAULT '10:00 AM',
  performance_time TEXT DEFAULT '11:30 AM',
  status public.pass_status NOT NULL DEFAULT 'pending',
  verification_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.entry_passes(user_id);
CREATE INDEX ON public.entry_passes(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.entry_passes TO authenticated;
GRANT SELECT ON public.entry_passes TO anon;
GRANT ALL ON public.entry_passes TO service_role;
ALTER TABLE public.entry_passes ENABLE ROW LEVEL SECURITY;

-- owner reads own
CREATE POLICY "Owner reads own passes" ON public.entry_passes
FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- owner inserts own
CREATE POLICY "Owner inserts own pass" ON public.entry_passes
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
-- admins full access
CREATE POLICY "Admin reads all passes" ON public.entry_passes
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin updates passes" ON public.entry_passes
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin deletes passes" ON public.entry_passes
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
-- public verification: anon can SELECT any row (safe cols exposed via server fn / narrow queries)
CREATE POLICY "Public verify by id" ON public.entry_passes
FOR SELECT TO anon USING (true);
