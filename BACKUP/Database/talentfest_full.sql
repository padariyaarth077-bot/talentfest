--
-- PostgreSQL database dump
--

\restrict 6Hntgi6S4Ocb02lt8UICONEmmL0rTDHaWPp1c1zd4JQShchRG5fX8iMPxFjQqkQ

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'participant'
);


--
-- Name: generate_pass_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_pass_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  event_city_code TEXT;
  year_code TEXT;
  seq_num INTEGER;
  prefix TEXT;
BEGIN
  SELECT e.city_code INTO event_city_code
  FROM public.registrations r
  JOIN public.events e ON e.id = r.event_id
  WHERE r.id = NEW.registration_id;

  year_code := to_char(CURRENT_DATE, 'YY');
  seq_num := nextval('public.pass_number_seq');

  prefix := CASE NEW.pass_type
    WHEN 'participant' THEN 'P'
    WHEN 'guest_1' THEN 'G1'
    WHEN 'guest_2' THEN 'G2'
    WHEN 'visitor' THEN 'V'
  END;

  NEW.pass_number := 'TF' || year_code || '-' || event_city_code || '-' || prefix || '-' || lpad(seq_num::text, 6, '0');
  NEW.generated_at := now();
  NEW.status := 'active';
  RETURN NEW;
END;
$$;


--
-- Name: generate_registration_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_registration_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  event_city_code TEXT;
  year_code TEXT;
  seq_num INTEGER;
BEGIN
  SELECT city_code INTO event_city_code FROM public.events WHERE id = NEW.event_id;
  year_code := to_char(CURRENT_DATE, 'YY');
  seq_num := nextval('public.registration_number_seq');
  NEW.registration_number := 'TF' || year_code || '-' || event_city_code || '-REG-' || lpad(seq_num::text, 6, '0');
  RETURN NEW;
END;
$$;


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;


--
-- Name: set_employee_award_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_employee_award_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: check_in_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.check_in_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pass_id uuid NOT NULL,
    admin_user_id text,
    previous_status text,
    new_status text NOT NULL,
    action text NOT NULL,
    checked_in_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: concert_artists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.concert_artists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    concert_info_id uuid,
    artist_name text NOT NULL,
    performance_type text DEFAULT ''::text NOT NULL,
    description text,
    image_url text,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: concert_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.concert_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    eyebrow text DEFAULT 'Live Concert'::text NOT NULL,
    title text DEFAULT 'Concert Information'::text NOT NULL,
    subtitle text DEFAULT ''::text NOT NULL,
    event_label text DEFAULT 'Grand Finale'::text NOT NULL,
    event_title text DEFAULT 'TelentFest Grand Finale'::text NOT NULL,
    venue text DEFAULT ''::text NOT NULL,
    city text DEFAULT ''::text NOT NULL,
    event_date text,
    start_time text,
    end_time text,
    price_text text DEFAULT ''::text NOT NULL,
    button_text text DEFAULT 'Registration Form'::text NOT NULL,
    button_url text DEFAULT '/registration'::text NOT NULL,
    map_url text DEFAULT ''::text NOT NULL,
    map_embed_url text DEFAULT ''::text NOT NULL,
    latitude double precision,
    longitude double precision,
    is_published boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: contact_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contact_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name text NOT NULL,
    phone text NOT NULL,
    email text NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    status text DEFAULT 'new'::text NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: employee_award_application_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_award_application_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_award_registrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_award_registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_number text DEFAULT ('EAC26-'::text || lpad((nextval('public.employee_award_application_seq'::regclass))::text, 6, '0'::text)) NOT NULL,
    company_name text NOT NULL,
    company_address text NOT NULL,
    coordinator_name text NOT NULL,
    contact_number text NOT NULL,
    company_email text NOT NULL,
    employee_full_name text NOT NULL,
    designation text NOT NULL,
    department text NOT NULL,
    gender text NOT NULL,
    mobile_number text NOT NULL,
    employee_email text NOT NULL,
    award_categories text[] DEFAULT '{}'::text[] NOT NULL,
    other_award_category text,
    working_since date,
    total_experience text NOT NULL,
    major_achievements text NOT NULL,
    event_participation text NOT NULL,
    number_of_participants integer DEFAULT 1 NOT NULL,
    declaration_accepted boolean DEFAULT false NOT NULL,
    employee_signature_name text NOT NULL,
    authorized_company_signature_name text NOT NULL,
    declaration_date date NOT NULL,
    status text DEFAULT 'submitted'::text NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT employee_award_registrations_event_participation_check CHECK ((event_participation = ANY (ARRAY['employee_only'::text, 'employee_family'::text, 'company_team'::text]))),
    CONSTRAINT employee_award_registrations_gender_check CHECK ((gender = ANY (ARRAY['male'::text, 'female'::text, 'other'::text]))),
    CONSTRAINT employee_award_registrations_number_of_participants_check CHECK ((number_of_participants > 0)),
    CONSTRAINT employee_award_registrations_status_check CHECK ((status = ANY (ARRAY['submitted'::text, 'reviewing'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: event_activity_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_activity_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    activity_category_id uuid NOT NULL,
    capacity integer,
    registration_status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT event_activity_categories_registration_status_check CHECK ((registration_status = ANY (ARRAY['active'::text, 'closed'::text, 'full'::text])))
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    city text NOT NULL,
    city_code text NOT NULL,
    event_image_url text,
    event_date date,
    start_time time without time zone,
    venue text,
    participant_price numeric(10,2) DEFAULT 0 NOT NULL,
    visitor_price numeric(10,2) DEFAULT 0 NOT NULL,
    guest_price numeric(10,2) DEFAULT 0 NOT NULL,
    participant_capacity integer DEFAULT 0 NOT NULL,
    visitor_capacity integer DEFAULT 0 NOT NULL,
    guest_capacity integer DEFAULT 0 NOT NULL,
    maximum_guests_per_participant integer DEFAULT 2 NOT NULL,
    registration_opens_at timestamp with time zone,
    registration_closes_at timestamp with time zone,
    registration_status text DEFAULT 'inactive'::text NOT NULL,
    visitor_registration_enabled boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT events_registration_status_check CHECK ((registration_status = ANY (ARRAY['inactive'::text, 'active'::text, 'closed'::text, 'full'::text])))
);


--
-- Name: guests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    registration_id uuid NOT NULL,
    guest_number integer NOT NULL,
    full_name text NOT NULL,
    phone text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT guests_guest_number_check CHECK ((guest_number = ANY (ARRAY[1, 2])))
);


--
-- Name: pass_download_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pass_download_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pass_id uuid NOT NULL,
    registration_id uuid NOT NULL,
    access_reference text,
    downloaded_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pass_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pass_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: passes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.passes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    registration_id uuid NOT NULL,
    guest_id uuid,
    pass_number text NOT NULL,
    pass_type text NOT NULL,
    secure_qr_token text DEFAULT encode(extensions.gen_random_bytes(32), 'hex'::text) NOT NULL,
    secure_qr_token_hash text,
    status text DEFAULT 'pending'::text NOT NULL,
    checked_in boolean DEFAULT false NOT NULL,
    checked_in_at timestamp with time zone,
    generated_at timestamp with time zone,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT passes_pass_type_check CHECK ((pass_type = ANY (ARRAY['participant'::text, 'guest_1'::text, 'guest_2'::text, 'visitor'::text]))),
    CONSTRAINT passes_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'checked_in'::text, 'revoked'::text, 'expired'::text, 'cancelled'::text])))
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    registration_id uuid NOT NULL,
    provider text DEFAULT 'dummy'::text NOT NULL,
    order_id text,
    transaction_id text,
    payment_signature_reference text,
    amount numeric(10,2) NOT NULL,
    currency text DEFAULT 'INR'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    payment_mode text DEFAULT 'test'::text NOT NULL,
    CONSTRAINT payments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'paid'::text, 'failed'::text, 'cancelled'::text, 'refunded'::text])))
);


--
-- Name: registration_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.registration_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: registrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    registration_number text,
    registration_type text NOT NULL,
    event_id uuid NOT NULL,
    first_name text NOT NULL,
    middle_name text,
    last_name text NOT NULL,
    full_name text NOT NULL,
    phone text NOT NULL,
    email text NOT NULL,
    encrypted_aadhaar text,
    aadhaar_last_four text,
    aadhaar_consent boolean DEFAULT false NOT NULL,
    activity_category_id uuid,
    payment_status text DEFAULT 'pending'::text NOT NULL,
    registration_status text DEFAULT 'pending'::text NOT NULL,
    reservation_expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT registrations_payment_status_check CHECK ((payment_status = ANY (ARRAY['pending'::text, 'processing'::text, 'paid'::text, 'failed'::text, 'cancelled'::text, 'refunded'::text]))),
    CONSTRAINT registrations_registration_status_check CHECK ((registration_status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'cancelled'::text, 'expired'::text]))),
    CONSTRAINT registrations_registration_type_check CHECK ((registration_type = ANY (ARRAY['participant'::text, 'visitor'::text])))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL
);


--
-- Data for Name: activity_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.activity_categories (id, name, slug, description, is_active, created_at, updated_at) FROM stdin;
69a535ab-b097-4dcb-a517-0393ff2017c0	Singing	singing	Vocal performance across all genres	t	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
d00cf143-8e87-4a1b-9e08-4defbdd49068	Dancing	dancing	Solo and group dance performances	t	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
8b421ac0-53b1-4725-b4f7-0b23c9860a4b	Music	music	Musical instrument performances	t	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
83f11913-6e6c-4c4d-a71f-140905ac6648	Instrumental Music	instrumental-music	Instrumental music performances	t	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
a2699a33-ca05-42ee-b3eb-3530f54e1928	Acting	acting	Dramatic acting performances	t	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
43b9988b-a43d-49cc-9e88-2e2bd8407653	Drama and Theatre	drama-theatre	Theatre and stage performances	t	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
72eb9c6c-ed04-414e-ad78-a7f1d5269bca	Painting	painting	Visual art and painting	t	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
04be9661-57ae-40b3-8aff-6320ff8d89a6	Drawing and Sketching	drawing-sketching	Drawing and sketching art	t	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
7bd102d7-f6ef-4433-88f2-9a7194d80370	Arts and Craft	arts-craft	Creative arts and crafts	t	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
f7fab1d0-3556-4787-befe-88f6385a1ff6	Creative Writing	creative-writing	Original writing and poetry	t	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
b2e417b5-4b6f-48c6-8168-bb6aa7e4ae53	Photography	photography	Photography competition	t	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
174710de-51ab-43f2-856e-15c39e5b8226	Solo Performance	solo-performance	Individual performance category	t	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
5b994d6c-3045-45a9-adbb-f273cc4c8257	Group Performance	group-performance	Group performance category	t	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
ffaea87c-c9f6-47ea-9884-f2982dc312b9	Other	other	Other approved creative categories	t	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
\.


--
-- Data for Name: check_in_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.check_in_logs (id, pass_id, admin_user_id, previous_status, new_status, action, checked_in_at, notes, created_at) FROM stdin;
799ded85-7903-45bd-962b-c798fe9b9ea8	b7756bdd-c0ae-4f0c-9535-db2df7ebbb8b	b9032677-6b3c-49a4-9aa9-136e79daac2e	active	checked_in	Checked in	2026-07-12 10:14:19.042+00	\N	2026-07-12 10:14:19.843073+00
3177042b-ea7e-40ce-b589-a972811ebbc8	b7756bdd-c0ae-4f0c-9535-db2df7ebbb8b	b9032677-6b3c-49a4-9aa9-136e79daac2e	active	checked_in	Checked in	2026-07-12 10:14:20.384+00	\N	2026-07-12 10:14:20.722964+00
\.


--
-- Data for Name: concert_artists; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.concert_artists (id, concert_info_id, artist_name, performance_type, description, image_url, display_order, is_active, created_at, updated_at) FROM stdin;
a9dd0752-1920-436d-b3c1-34cbdaaa4770	14f3ec14-8cc4-4859-8994-441bf0013833	Dhamu Ahir	Influencer	\N	\N	1	t	2026-07-11 09:40:35.937812+00	2026-07-11 09:40:35.937812+00
ae299cb6-4d82-461a-bb86-2d432aecc679	14f3ec14-8cc4-4859-8994-441bf0013833	Karan Odedara	Aadesh Music Event	\N	\N	4	t	2026-07-11 09:40:35.937812+00	2026-07-11 09:40:35.937812+00
bda215ed-b480-4c5c-9122-6ef294377ad0	14f3ec14-8cc4-4859-8994-441bf0013833	Shiv Ravat	Singer	\N	\N	3	t	2026-07-11 09:40:35.937812+00	2026-07-11 09:40:35.937812+00
e8bf5859-69a6-4b25-8a7e-7526af33d937	14f3ec14-8cc4-4859-8994-441bf0013833	Sureshbhai Ahir	Singer	\N	\N	2	t	2026-07-11 09:40:35.937812+00	2026-07-11 09:40:35.937812+00
f7287bd3-c640-4dee-b3e4-a418d9430228	14f3ec14-8cc4-4859-8994-441bf0013833	Sanjaydan Gadhvi	Singer	\N	\N	5	t	2026-07-11 09:40:35.937812+00	2026-07-11 09:40:35.937812+00
\.


--
-- Data for Name: concert_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.concert_settings (id, eyebrow, title, subtitle, event_label, event_title, venue, city, event_date, start_time, end_time, price_text, button_text, button_url, map_url, map_embed_url, latitude, longitude, is_published, created_at, updated_at) FROM stdin;
14f3ec14-8cc4-4859-8994-441bf0013833	Live Concert	Concert Information	The main stage lineup you do not want to miss.	GRAND FINALE	TelentFest Grand Finale	Pramukh Swami Auditorium, Raiya Road, Rajkot, Gujarat	Rajkot, Gujarat	2026-07-26	14:00	19:00	Registration Fee ₹1,500	Registration Form	/registration	https://maps.app.goo.gl/4moYa5aYRXhbvgNK8	https://www.google.com/maps?q=Pramukh+Swami+Auditorium,+Raiya+Road,+Rajkot,+Gujarat&z=14&output=embed	22.3039	70.8022	t	2026-07-11 09:03:16.66+00	2026-07-11 09:40:35.937812+00
\.


--
-- Data for Name: contact_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contact_messages (id, full_name, phone, email, subject, message, status, submitted_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: employee_award_registrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employee_award_registrations (id, application_number, company_name, company_address, coordinator_name, contact_number, company_email, employee_full_name, designation, department, gender, mobile_number, employee_email, award_categories, other_award_category, working_since, total_experience, major_achievements, event_participation, number_of_participants, declaration_accepted, employee_signature_name, authorized_company_signature_name, declaration_date, status, submitted_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: event_activity_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.event_activity_categories (id, event_id, activity_category_id, capacity, registration_status, created_at, updated_at) FROM stdin;
dbd1553e-4bea-4b9e-9d69-b0ab545f94e2	cc8846a4-502a-4f7d-8e26-f44a6d2fc38a	69a535ab-b097-4dcb-a517-0393ff2017c0	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
afd01ceb-4dda-41db-a549-f4afc21e4e24	cc8846a4-502a-4f7d-8e26-f44a6d2fc38a	d00cf143-8e87-4a1b-9e08-4defbdd49068	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
7af563ba-56ea-49f1-9bdc-6710c6ffb39f	cc8846a4-502a-4f7d-8e26-f44a6d2fc38a	8b421ac0-53b1-4725-b4f7-0b23c9860a4b	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
a51d11ac-cd03-46d9-9d47-46709703f422	cc8846a4-502a-4f7d-8e26-f44a6d2fc38a	83f11913-6e6c-4c4d-a71f-140905ac6648	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
a8a19e4a-9116-46a6-b28f-7a232f88d55d	cc8846a4-502a-4f7d-8e26-f44a6d2fc38a	a2699a33-ca05-42ee-b3eb-3530f54e1928	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
7835e2e4-4cd7-4173-ae6a-03d1f72a5db8	cc8846a4-502a-4f7d-8e26-f44a6d2fc38a	43b9988b-a43d-49cc-9e88-2e2bd8407653	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
b556a610-b548-4747-8996-0cf0b3ea69d4	cc8846a4-502a-4f7d-8e26-f44a6d2fc38a	72eb9c6c-ed04-414e-ad78-a7f1d5269bca	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
d51493a2-8465-488d-bcf4-65524dd139ea	cc8846a4-502a-4f7d-8e26-f44a6d2fc38a	04be9661-57ae-40b3-8aff-6320ff8d89a6	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
50997c01-71ee-473d-ba7d-ee173c383086	cc8846a4-502a-4f7d-8e26-f44a6d2fc38a	7bd102d7-f6ef-4433-88f2-9a7194d80370	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
811f076c-6e78-41c0-b6a0-0aec27d79eea	cc8846a4-502a-4f7d-8e26-f44a6d2fc38a	f7fab1d0-3556-4787-befe-88f6385a1ff6	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
233a3c7f-d27f-4ccb-a0f2-a89f76c99a4d	cc8846a4-502a-4f7d-8e26-f44a6d2fc38a	b2e417b5-4b6f-48c6-8168-bb6aa7e4ae53	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
b607f53c-7b43-4dc0-907f-4bdd9c10a18b	cc8846a4-502a-4f7d-8e26-f44a6d2fc38a	174710de-51ab-43f2-856e-15c39e5b8226	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
adc824b6-58da-418e-b92a-16eea9913025	cc8846a4-502a-4f7d-8e26-f44a6d2fc38a	5b994d6c-3045-45a9-adbb-f273cc4c8257	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
0dfcee78-dd73-40d7-b1e9-99728f3aa7c1	cc8846a4-502a-4f7d-8e26-f44a6d2fc38a	ffaea87c-c9f6-47ea-9884-f2982dc312b9	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
3f29d233-4832-44d5-a7ba-bc72ab081d4e	927fdb23-1b01-4c96-9efd-53e0e89cc8eb	69a535ab-b097-4dcb-a517-0393ff2017c0	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
9d3dba94-3c7c-44da-b05f-bbe224d2e8f5	927fdb23-1b01-4c96-9efd-53e0e89cc8eb	d00cf143-8e87-4a1b-9e08-4defbdd49068	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
94aa27a8-0801-4fbf-8b0b-84846b7a8d7f	927fdb23-1b01-4c96-9efd-53e0e89cc8eb	8b421ac0-53b1-4725-b4f7-0b23c9860a4b	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
f1e0bcf1-8e84-4931-af6a-3d47b17d1acd	927fdb23-1b01-4c96-9efd-53e0e89cc8eb	83f11913-6e6c-4c4d-a71f-140905ac6648	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
0f0f576f-25d1-4203-83c4-7d241a21a01d	927fdb23-1b01-4c96-9efd-53e0e89cc8eb	a2699a33-ca05-42ee-b3eb-3530f54e1928	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
e222a670-47b3-42d1-8f76-8ec892b8d590	927fdb23-1b01-4c96-9efd-53e0e89cc8eb	43b9988b-a43d-49cc-9e88-2e2bd8407653	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
ed43c5f8-705e-4397-953b-82e0c116da47	927fdb23-1b01-4c96-9efd-53e0e89cc8eb	72eb9c6c-ed04-414e-ad78-a7f1d5269bca	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
91526ffc-11d6-4daa-a6db-95ea4b121d91	927fdb23-1b01-4c96-9efd-53e0e89cc8eb	04be9661-57ae-40b3-8aff-6320ff8d89a6	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
5b959436-b44e-4a7f-a726-a4db78bc6297	927fdb23-1b01-4c96-9efd-53e0e89cc8eb	7bd102d7-f6ef-4433-88f2-9a7194d80370	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
c32b12f4-7654-42b9-b14b-8ddc14d9c32a	927fdb23-1b01-4c96-9efd-53e0e89cc8eb	f7fab1d0-3556-4787-befe-88f6385a1ff6	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
26a57f8f-38c4-4b92-a746-9847c174748e	927fdb23-1b01-4c96-9efd-53e0e89cc8eb	b2e417b5-4b6f-48c6-8168-bb6aa7e4ae53	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
65307c4e-c2ab-41b3-877b-b905f4c9a669	927fdb23-1b01-4c96-9efd-53e0e89cc8eb	174710de-51ab-43f2-856e-15c39e5b8226	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
b27e8ec3-c2d2-4f86-bdf2-d4a460ba2fb3	927fdb23-1b01-4c96-9efd-53e0e89cc8eb	5b994d6c-3045-45a9-adbb-f273cc4c8257	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
f5fd5ee1-a62a-4e2c-af57-38127bf45b54	927fdb23-1b01-4c96-9efd-53e0e89cc8eb	ffaea87c-c9f6-47ea-9884-f2982dc312b9	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
5b568802-f1ef-43f7-8a90-7f6cfc3bc98e	b3f0639f-a351-42e5-b560-91698facfd52	69a535ab-b097-4dcb-a517-0393ff2017c0	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
4a1b7a05-b233-4e43-8251-b99c166d4619	b3f0639f-a351-42e5-b560-91698facfd52	d00cf143-8e87-4a1b-9e08-4defbdd49068	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
f57763bf-945f-43e8-8805-514917b378e4	b3f0639f-a351-42e5-b560-91698facfd52	8b421ac0-53b1-4725-b4f7-0b23c9860a4b	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
3b1fc9d3-c66d-4c26-8c10-2c1ccf896e4c	b3f0639f-a351-42e5-b560-91698facfd52	83f11913-6e6c-4c4d-a71f-140905ac6648	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
5d37c282-9003-4d25-99e9-0d06e4f05262	b3f0639f-a351-42e5-b560-91698facfd52	a2699a33-ca05-42ee-b3eb-3530f54e1928	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
c064fa6b-aad2-45b9-a646-414590f90991	b3f0639f-a351-42e5-b560-91698facfd52	43b9988b-a43d-49cc-9e88-2e2bd8407653	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
cfb556ce-9fe9-4b2c-a503-dcd9facb6d09	b3f0639f-a351-42e5-b560-91698facfd52	72eb9c6c-ed04-414e-ad78-a7f1d5269bca	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
e49beb9c-f9dc-4922-9a86-df860183dcbe	b3f0639f-a351-42e5-b560-91698facfd52	04be9661-57ae-40b3-8aff-6320ff8d89a6	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
f007d5db-6041-45ec-8e4d-c4c9f6b874be	b3f0639f-a351-42e5-b560-91698facfd52	7bd102d7-f6ef-4433-88f2-9a7194d80370	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
8cc4d690-9548-49ba-8f3a-32488761f741	b3f0639f-a351-42e5-b560-91698facfd52	f7fab1d0-3556-4787-befe-88f6385a1ff6	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
da8f825d-0a9d-4893-8a94-56562c812e3a	b3f0639f-a351-42e5-b560-91698facfd52	b2e417b5-4b6f-48c6-8168-bb6aa7e4ae53	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
e3b317a4-ab43-4ede-a783-edc49e9553eb	b3f0639f-a351-42e5-b560-91698facfd52	174710de-51ab-43f2-856e-15c39e5b8226	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
84c4d14b-b538-43aa-940b-628403b4158b	b3f0639f-a351-42e5-b560-91698facfd52	5b994d6c-3045-45a9-adbb-f273cc4c8257	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
72f58b56-29fa-4e25-808d-10ec54718f32	b3f0639f-a351-42e5-b560-91698facfd52	ffaea87c-c9f6-47ea-9884-f2982dc312b9	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
0b3b6004-f798-4bb9-b417-8eca06a8b51d	89d32e86-e9a2-41bb-a88c-8ad2ca2204ee	69a535ab-b097-4dcb-a517-0393ff2017c0	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
b501b7a8-9671-4008-91e7-796c8ceef28c	89d32e86-e9a2-41bb-a88c-8ad2ca2204ee	d00cf143-8e87-4a1b-9e08-4defbdd49068	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
3b80ef26-f13e-4ac1-a77e-26c10896890f	89d32e86-e9a2-41bb-a88c-8ad2ca2204ee	8b421ac0-53b1-4725-b4f7-0b23c9860a4b	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
68cc0a77-a61a-449f-b91d-ed47ef579f36	89d32e86-e9a2-41bb-a88c-8ad2ca2204ee	83f11913-6e6c-4c4d-a71f-140905ac6648	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
969ea7d0-a320-4804-904b-e7a4bbc5f0ce	89d32e86-e9a2-41bb-a88c-8ad2ca2204ee	a2699a33-ca05-42ee-b3eb-3530f54e1928	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
9c3327b8-5d71-4019-8078-75372776ae4c	89d32e86-e9a2-41bb-a88c-8ad2ca2204ee	43b9988b-a43d-49cc-9e88-2e2bd8407653	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
3665333d-2911-40e2-8751-922bd34feda8	89d32e86-e9a2-41bb-a88c-8ad2ca2204ee	72eb9c6c-ed04-414e-ad78-a7f1d5269bca	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
eb0b01b0-1f2b-4385-ab60-2f9fe5610875	89d32e86-e9a2-41bb-a88c-8ad2ca2204ee	04be9661-57ae-40b3-8aff-6320ff8d89a6	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
483ef123-0712-45bb-955f-ce3fa1577abb	89d32e86-e9a2-41bb-a88c-8ad2ca2204ee	7bd102d7-f6ef-4433-88f2-9a7194d80370	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
7ac8ee1e-e710-4c35-9d84-cfb27f95db65	89d32e86-e9a2-41bb-a88c-8ad2ca2204ee	f7fab1d0-3556-4787-befe-88f6385a1ff6	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
123107ef-41e1-4603-9aeb-c5e5cd14a784	89d32e86-e9a2-41bb-a88c-8ad2ca2204ee	b2e417b5-4b6f-48c6-8168-bb6aa7e4ae53	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
66d44239-f966-4cb7-97bd-00523f7a4a96	89d32e86-e9a2-41bb-a88c-8ad2ca2204ee	174710de-51ab-43f2-856e-15c39e5b8226	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
fb78b8f7-4af5-4581-ad39-d059608e5875	89d32e86-e9a2-41bb-a88c-8ad2ca2204ee	5b994d6c-3045-45a9-adbb-f273cc4c8257	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
69232521-fff2-4dcc-bf4b-209470eebda0	89d32e86-e9a2-41bb-a88c-8ad2ca2204ee	ffaea87c-c9f6-47ea-9884-f2982dc312b9	\N	active	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.events (id, name, slug, city, city_code, event_image_url, event_date, start_time, venue, participant_price, visitor_price, guest_price, participant_capacity, visitor_capacity, guest_capacity, maximum_guests_per_participant, registration_opens_at, registration_closes_at, registration_status, visitor_registration_enabled, is_active, created_at, updated_at) FROM stdin;
cc8846a4-502a-4f7d-8e26-f44a6d2fc38a	Talent Fest Ahmedabad	talent-fest-ahmedabad	Ahmedabad	AMD	\N	\N	\N	\N	299.00	199.00	149.00	500	200	200	2	\N	\N	active	t	t	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
927fdb23-1b01-4c96-9efd-53e0e89cc8eb	Talent Fest Surat	talent-fest-surat	Surat	SUR	\N	\N	\N	\N	299.00	199.00	149.00	500	200	200	2	\N	\N	active	t	t	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
b3f0639f-a351-42e5-b560-91698facfd52	Talent Fest Vadodara	talent-fest-vadodara	Vadodara	VAD	\N	\N	\N	\N	299.00	199.00	149.00	500	200	200	2	\N	\N	active	t	t	2026-07-10 14:43:43.275852+00	2026-07-10 14:43:43.275852+00
89d32e86-e9a2-41bb-a88c-8ad2ca2204ee	Talent Fest Rajkot	talent-fest-rajkot	Rajkot	RAJ	https://vbskyclxldcvoaixpjon.supabase.co/storage/v1/object/public/event-images/talent-fest-rajkot/1783754121432-hjon55pe7g5.jpeg	\N	\N	\N	299.00	199.00	149.00	500	200	200	2	\N	\N	active	t	t	2026-07-10 14:43:43.275852+00	2026-07-11 07:15:26.68+00
\.


--
-- Data for Name: guests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.guests (id, registration_id, guest_number, full_name, phone, created_at, updated_at) FROM stdin;
e49c6640-c0b4-407b-ad02-6032faa30ab4	6bca2f0f-3049-4b14-8220-8d62937ddd49	1	Arth Padariya	+918976543210	2026-07-10 18:21:05.61977+00	2026-07-10 18:21:05.61977+00
6adcc92a-c698-4c26-9e48-de8d9a9c1754	6bca2f0f-3049-4b14-8220-8d62937ddd49	2	niraj padariya	+916985471200	2026-07-10 18:21:06.23252+00	2026-07-10 18:21:06.23252+00
\.


--
-- Data for Name: pass_download_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pass_download_logs (id, pass_id, registration_id, access_reference, downloaded_at, created_at) FROM stdin;
\.


--
-- Data for Name: passes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.passes (id, registration_id, guest_id, pass_number, pass_type, secure_qr_token, secure_qr_token_hash, status, checked_in, checked_in_at, generated_at, revoked_at, created_at, updated_at) FROM stdin;
9ac029e1-84d5-4777-877b-987193f2dbb7	20a9934b-dcca-4a55-9833-89a1529a0f3a	\N	TF26-AMD-V-000001	visitor	47b471ea6571201986574598081988aaa051b03b325b46e2b1d063700c22fb10	\N	active	f	\N	2026-07-10 18:12:45.762869+00	\N	2026-07-10 18:12:45.762869+00	2026-07-10 18:12:45.762869+00
e5ac5a99-b9ff-48a0-9539-111e59bcf771	c0a54b0c-bcbc-4a1d-bc94-c080dff87418	\N	TF26-RAJ-P-000002	participant	fb3644a192e4ce398017c1063527fe664561116abd3426f994c6ee2fe93d02aa	\N	active	f	\N	2026-07-10 18:18:10.177473+00	\N	2026-07-10 18:18:10.177473+00	2026-07-10 18:18:10.177473+00
af16355a-c0bc-4273-8618-2361c4177c95	6bca2f0f-3049-4b14-8220-8d62937ddd49	\N	TF26-AMD-P-000003	participant	21d2a3fcc2e6e6109313166a020c62f6bf0c810776fa6efe84247c315be5f5cc	\N	active	f	\N	2026-07-10 18:21:24.247722+00	\N	2026-07-10 18:21:24.247722+00	2026-07-10 18:21:24.247722+00
956c240d-597f-4f70-823d-cd082398a0f0	6bca2f0f-3049-4b14-8220-8d62937ddd49	e49c6640-c0b4-407b-ad02-6032faa30ab4	TF26-AMD-G1-000004	guest_1	03c6fabc59b98559f9ed8067a9ea578dd3dd469ba1e6ab5a07de30885202d7d7	\N	active	f	\N	2026-07-10 18:21:25.050238+00	\N	2026-07-10 18:21:25.050238+00	2026-07-10 18:21:25.050238+00
511e52c6-2691-428b-a680-b9f08762e02c	6bca2f0f-3049-4b14-8220-8d62937ddd49	6adcc92a-c698-4c26-9e48-de8d9a9c1754	TF26-AMD-G2-000005	guest_2	226310371290eab3c63a41c7ef06acf1098750c30a5d31e3b9f37d0ea24916d6	\N	active	f	\N	2026-07-10 18:21:25.369277+00	\N	2026-07-10 18:21:25.369277+00	2026-07-10 18:21:25.369277+00
790e7764-85c4-482f-aace-f7c18e9186de	f14275e9-ae89-481b-b942-03a1cca7d01c	\N	TF26-RAJ-V-000006	visitor	84cdf9721f80e4449d4dffe674782ed10a0d3379744e896309675106d8b1e082	\N	active	f	\N	2026-07-11 03:50:35.349267+00	\N	2026-07-11 03:50:35.349267+00	2026-07-11 03:50:35.48+00
64be9190-7d82-4c41-ba2e-20b7a5421d13	046909f6-c496-4e53-a63b-48058fe4eba3	\N	TF26-RAJ-P-000007	participant	d05ab362c25d3fdd8c76ed7fe6f7e17b9ac6a6c048725044755af7bd398f6e02	\N	active	f	\N	2026-07-11 07:03:33.945738+00	\N	2026-07-11 07:03:33.945738+00	2026-07-11 07:03:34.311+00
b7756bdd-c0ae-4f0c-9535-db2df7ebbb8b	cd794e2c-d8a0-4d55-a2fb-058d15f1ea8f	\N	TF26-RAJ-V-000008	visitor	662a4c2373a23605e42772677367c9d52d00fd816c81050dc44720e947c14b1d	\N	checked_in	t	2026-07-12 10:14:20.384+00	2026-07-11 07:19:41.290456+00	\N	2026-07-11 07:19:41.290456+00	2026-07-12 10:14:20.384+00
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payments (id, registration_id, provider, order_id, transaction_id, payment_signature_reference, amount, currency, status, verified_at, created_at, updated_at, payment_mode) FROM stdin;
92e755e8-b473-4b5e-add8-d90fc2185350	20a9934b-dcca-4a55-9833-89a1529a0f3a	razorpay	order_TF_1783707176330_qj51c8	TXN_TF_1783707176552_fuwbma2s	\N	299.00	INR	paid	2026-07-10 18:12:56.777+00	2026-07-10 18:12:43.798166+00	2026-07-10 18:12:43.798166+00	test
e4f56524-4c58-4fc2-bb3e-b42362eb87e5	c0a54b0c-bcbc-4a1d-bc94-c080dff87418	razorpay	order_TF_1783707500685_ly2ovq	TXN_TF_1783707500907_qa7g8f1w	\N	299.00	INR	paid	2026-07-10 18:18:21.197+00	2026-07-10 18:18:08.075111+00	2026-07-10 18:18:08.075111+00	test
4b12f119-d98d-4138-9e5d-da878837a2eb	6bca2f0f-3049-4b14-8220-8d62937ddd49	razorpay	order_TF_1783707694736_budorp	TXN_TF_1783707695061_hdhrnbk1	\N	597.00	INR	paid	2026-07-10 18:21:35.656+00	2026-07-10 18:21:22.250561+00	2026-07-10 18:21:22.250561+00	test
9781c9d4-9560-48c4-a2c5-df793151df30	f14275e9-ae89-481b-b942-03a1cca7d01c	dummy	TEST-ORDER-F14275E9	TEST-TXN-1783741842100-HSW7N3CR	\N	299.00	INR	paid	2026-07-11 03:50:32.678+00	2026-07-11 03:50:28.861944+00	2026-07-11 03:50:28.861944+00	test
74b22204-5626-4cf8-84a9-c18554a4ce64	046909f6-c496-4e53-a63b-48058fe4eba3	dummy	TEST-ORDER-046909F6	TEST-TXN-1783753419443-VXE7B0D9	\N	299.00	INR	paid	2026-07-11 07:03:31.641+00	2026-07-11 07:03:27.15026+00	2026-07-11 07:03:27.15026+00	test
fb2eeb09-710d-4b3d-aca5-6863a132dd58	cd794e2c-d8a0-4d55-a2fb-058d15f1ea8f	dummy	TEST-ORDER-CD794E2C	TEST-TXN-1783754388973-ABJDQ20H	\N	299.00	INR	paid	2026-07-11 07:19:39.44+00	2026-07-11 07:19:36.661623+00	2026-07-11 07:19:36.661623+00	test
\.


--
-- Data for Name: registrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.registrations (id, registration_number, registration_type, event_id, first_name, middle_name, last_name, full_name, phone, email, encrypted_aadhaar, aadhaar_last_four, aadhaar_consent, activity_category_id, payment_status, registration_status, reservation_expires_at, created_at, updated_at) FROM stdin;
20a9934b-dcca-4a55-9833-89a1529a0f3a	TF26-AMD-REG-000001	visitor	cc8846a4-502a-4f7d-8e26-f44a6d2fc38a	Arth Padariya	\N		Arth Padariya	+919876543210	padariyaarth077@gmail.com	\N	2222	t	\N	paid	confirmed	\N	2026-07-10 18:12:26.084989+00	2026-07-10 18:12:26.084989+00
c0a54b0c-bcbc-4a1d-bc94-c080dff87418	TF26-RAJ-REG-000002	participant	89d32e86-e9a2-41bb-a88c-8ad2ca2204ee	Arth	Niraj	Padariya	Arth Niraj Padariya	+919313053867	padariyaarth077@gmail.com	\N	4444	t	174710de-51ab-43f2-856e-15c39e5b8226	paid	confirmed	\N	2026-07-10 18:17:54.63868+00	2026-07-10 18:17:54.63868+00
6bca2f0f-3049-4b14-8220-8d62937ddd49	TF26-AMD-REG-000003	participant	cc8846a4-502a-4f7d-8e26-f44a6d2fc38a	yug	niraj	padariya	yug niraj padariya	+917894561230	padariyaarth04@gmail.com	\N	7777	t	d00cf143-8e87-4a1b-9e08-4defbdd49068	paid	confirmed	\N	2026-07-10 18:21:05.223511+00	2026-07-10 18:21:05.223511+00
f14275e9-ae89-481b-b942-03a1cca7d01c	TF26-RAJ-REG-000004	visitor	89d32e86-e9a2-41bb-a88c-8ad2ca2204ee	harry potter	\N		harry potter	+912134567890	arth55104@gmail.com	\N	8888	t	\N	paid	confirmed	\N	2026-07-11 03:50:06.908397+00	2026-07-11 03:50:33.36+00
046909f6-c496-4e53-a63b-48058fe4eba3	TF26-RAJ-REG-000005	participant	89d32e86-e9a2-41bb-a88c-8ad2ca2204ee	Maitrey		Shah	Maitrey Shah	+910321654987	maitreyshah2509@gmail.com	\N	9999	t	43b9988b-a43d-49cc-9e88-2e2bd8407653	paid	confirmed	\N	2026-07-11 07:02:27.979425+00	2026-07-11 07:03:32.291+00
cd794e2c-d8a0-4d55-a2fb-058d15f1ea8f	TF26-RAJ-REG-000006	visitor	89d32e86-e9a2-41bb-a88c-8ad2ca2204ee	ARTH PADARIYA	\N		ARTH PADARIYA	+913210456987	arth55104@gmail.com	\N	5555	t	\N	paid	confirmed	\N	2026-07-11 07:19:24.834319+00	2026-07-11 07:19:39.675+00
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_roles (id, user_id, role) FROM stdin;
27c47cd4-c58a-4bff-a70c-fc6322fc3651	b9032677-6b3c-49a4-9aa9-136e79daac2e	admin
\.


--
-- Name: employee_award_application_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.employee_award_application_seq', 1, false);


--
-- Name: pass_number_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pass_number_seq', 8, true);


--
-- Name: registration_number_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.registration_number_seq', 6, true);


--
-- Name: activity_categories activity_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_categories
    ADD CONSTRAINT activity_categories_pkey PRIMARY KEY (id);


--
-- Name: activity_categories activity_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_categories
    ADD CONSTRAINT activity_categories_slug_key UNIQUE (slug);


--
-- Name: check_in_logs check_in_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.check_in_logs
    ADD CONSTRAINT check_in_logs_pkey PRIMARY KEY (id);


--
-- Name: concert_artists concert_artists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concert_artists
    ADD CONSTRAINT concert_artists_pkey PRIMARY KEY (id);


--
-- Name: concert_settings concert_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concert_settings
    ADD CONSTRAINT concert_settings_pkey PRIMARY KEY (id);


--
-- Name: contact_messages contact_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_messages
    ADD CONSTRAINT contact_messages_pkey PRIMARY KEY (id);


--
-- Name: employee_award_registrations employee_award_registrations_application_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_award_registrations
    ADD CONSTRAINT employee_award_registrations_application_number_key UNIQUE (application_number);


--
-- Name: employee_award_registrations employee_award_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_award_registrations
    ADD CONSTRAINT employee_award_registrations_pkey PRIMARY KEY (id);


--
-- Name: event_activity_categories event_activity_categories_event_id_activity_category_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_activity_categories
    ADD CONSTRAINT event_activity_categories_event_id_activity_category_id_key UNIQUE (event_id, activity_category_id);


--
-- Name: event_activity_categories event_activity_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_activity_categories
    ADD CONSTRAINT event_activity_categories_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: events events_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_slug_key UNIQUE (slug);


--
-- Name: guests guests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guests
    ADD CONSTRAINT guests_pkey PRIMARY KEY (id);


--
-- Name: guests guests_registration_id_guest_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guests
    ADD CONSTRAINT guests_registration_id_guest_number_key UNIQUE (registration_id, guest_number);


--
-- Name: pass_download_logs pass_download_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pass_download_logs
    ADD CONSTRAINT pass_download_logs_pkey PRIMARY KEY (id);


--
-- Name: passes passes_pass_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.passes
    ADD CONSTRAINT passes_pass_number_key UNIQUE (pass_number);


--
-- Name: passes passes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.passes
    ADD CONSTRAINT passes_pkey PRIMARY KEY (id);


--
-- Name: passes passes_secure_qr_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.passes
    ADD CONSTRAINT passes_secure_qr_token_key UNIQUE (secure_qr_token);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: payments payments_transaction_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_transaction_id_key UNIQUE (transaction_id);


--
-- Name: registrations registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registrations
    ADD CONSTRAINT registrations_pkey PRIMARY KEY (id);


--
-- Name: registrations registrations_registration_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registrations
    ADD CONSTRAINT registrations_registration_number_key UNIQUE (registration_number);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: check_in_logs_pass_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX check_in_logs_pass_id_idx ON public.check_in_logs USING btree (pass_id);


--
-- Name: concert_artists_concert_info_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX concert_artists_concert_info_id_idx ON public.concert_artists USING btree (concert_info_id);


--
-- Name: concert_artists_display_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX concert_artists_display_order_idx ON public.concert_artists USING btree (display_order);


--
-- Name: concert_settings_is_published_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX concert_settings_is_published_idx ON public.concert_settings USING btree (is_published);


--
-- Name: concert_settings_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX concert_settings_updated_at_idx ON public.concert_settings USING btree (updated_at DESC);


--
-- Name: contact_messages_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contact_messages_status_idx ON public.contact_messages USING btree (status);


--
-- Name: contact_messages_submitted_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contact_messages_submitted_at_idx ON public.contact_messages USING btree (submitted_at DESC);


--
-- Name: employee_award_registrations_application_number_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX employee_award_registrations_application_number_idx ON public.employee_award_registrations USING btree (application_number);


--
-- Name: employee_award_registrations_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX employee_award_registrations_created_at_idx ON public.employee_award_registrations USING btree (created_at DESC);


--
-- Name: employee_award_registrations_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX employee_award_registrations_status_idx ON public.employee_award_registrations USING btree (status);


--
-- Name: event_activity_categories_event_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_activity_categories_event_id_idx ON public.event_activity_categories USING btree (event_id);


--
-- Name: idx_check_in_logs_pass_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_check_in_logs_pass_id ON public.check_in_logs USING btree (pass_id);


--
-- Name: idx_guests_registration_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guests_registration_id ON public.guests USING btree (registration_id);


--
-- Name: idx_passes_checked_in_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_passes_checked_in_status ON public.passes USING btree (checked_in, status);


--
-- Name: idx_passes_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_passes_created_at ON public.passes USING btree (created_at DESC);


--
-- Name: idx_passes_pass_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_passes_pass_type ON public.passes USING btree (pass_type);


--
-- Name: idx_passes_registration_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_passes_registration_id ON public.passes USING btree (registration_id);


--
-- Name: idx_passes_secure_qr_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_passes_secure_qr_token ON public.passes USING btree (secure_qr_token);


--
-- Name: idx_payments_provider_mode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_provider_mode ON public.payments USING btree (provider, payment_mode);


--
-- Name: idx_payments_registration_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_registration_id ON public.payments USING btree (registration_id);


--
-- Name: idx_payments_transaction_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_transaction_id ON public.payments USING btree (transaction_id);


--
-- Name: idx_registrations_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_registrations_event_id ON public.registrations USING btree (event_id);


--
-- Name: idx_registrations_payment_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_registrations_payment_status ON public.registrations USING btree (payment_status);


--
-- Name: idx_registrations_registration_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_registrations_registration_status ON public.registrations USING btree (registration_status);


--
-- Name: idx_registrations_registration_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_registrations_registration_type ON public.registrations USING btree (registration_type);


--
-- Name: passes_checked_in_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX passes_checked_in_idx ON public.passes USING btree (checked_in);


--
-- Name: passes_guest_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX passes_guest_id_idx ON public.passes USING btree (guest_id);


--
-- Name: passes_pass_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX passes_pass_type_idx ON public.passes USING btree (pass_type);


--
-- Name: passes_registration_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX passes_registration_id_idx ON public.passes USING btree (registration_id);


--
-- Name: passes_secure_qr_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX passes_secure_qr_token_idx ON public.passes USING btree (secure_qr_token);


--
-- Name: passes_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX passes_status_idx ON public.passes USING btree (status);


--
-- Name: payments_order_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payments_order_id_idx ON public.payments USING btree (order_id);


--
-- Name: payments_registration_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payments_registration_id_idx ON public.payments USING btree (registration_id);


--
-- Name: registrations_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX registrations_email_idx ON public.registrations USING btree (email);


--
-- Name: registrations_event_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX registrations_event_id_idx ON public.registrations USING btree (event_id);


--
-- Name: registrations_payment_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX registrations_payment_status_idx ON public.registrations USING btree (payment_status);


--
-- Name: registrations_phone_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX registrations_phone_idx ON public.registrations USING btree (phone);


--
-- Name: registrations_registration_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX registrations_registration_type_idx ON public.registrations USING btree (registration_type);


--
-- Name: employee_award_registrations employee_award_registrations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER employee_award_registrations_updated_at BEFORE UPDATE ON public.employee_award_registrations FOR EACH ROW EXECUTE FUNCTION public.set_employee_award_updated_at();


--
-- Name: passes trigger_generate_pass_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_generate_pass_number BEFORE INSERT ON public.passes FOR EACH ROW WHEN ((new.pass_number IS NULL)) EXECUTE FUNCTION public.generate_pass_number();


--
-- Name: registrations trigger_generate_registration_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_generate_registration_number BEFORE INSERT ON public.registrations FOR EACH ROW WHEN ((new.registration_number IS NULL)) EXECUTE FUNCTION public.generate_registration_number();


--
-- Name: check_in_logs check_in_logs_pass_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.check_in_logs
    ADD CONSTRAINT check_in_logs_pass_id_fkey FOREIGN KEY (pass_id) REFERENCES public.passes(id) ON DELETE CASCADE;


--
-- Name: concert_artists concert_artists_concert_info_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concert_artists
    ADD CONSTRAINT concert_artists_concert_info_id_fkey FOREIGN KEY (concert_info_id) REFERENCES public.concert_settings(id) ON DELETE CASCADE;


--
-- Name: event_activity_categories event_activity_categories_activity_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_activity_categories
    ADD CONSTRAINT event_activity_categories_activity_category_id_fkey FOREIGN KEY (activity_category_id) REFERENCES public.activity_categories(id) ON DELETE CASCADE;


--
-- Name: event_activity_categories event_activity_categories_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_activity_categories
    ADD CONSTRAINT event_activity_categories_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: guests guests_registration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guests
    ADD CONSTRAINT guests_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES public.registrations(id) ON DELETE CASCADE;


--
-- Name: pass_download_logs pass_download_logs_pass_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pass_download_logs
    ADD CONSTRAINT pass_download_logs_pass_id_fkey FOREIGN KEY (pass_id) REFERENCES public.passes(id) ON DELETE CASCADE;


--
-- Name: pass_download_logs pass_download_logs_registration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pass_download_logs
    ADD CONSTRAINT pass_download_logs_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES public.registrations(id) ON DELETE CASCADE;


--
-- Name: passes passes_guest_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.passes
    ADD CONSTRAINT passes_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES public.guests(id) ON DELETE SET NULL;


--
-- Name: passes passes_registration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.passes
    ADD CONSTRAINT passes_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES public.registrations(id) ON DELETE CASCADE;


--
-- Name: payments payments_registration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES public.registrations(id) ON DELETE CASCADE;


--
-- Name: registrations registrations_activity_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registrations
    ADD CONSTRAINT registrations_activity_category_id_fkey FOREIGN KEY (activity_category_id) REFERENCES public.activity_categories(id);


--
-- Name: registrations registrations_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registrations
    ADD CONSTRAINT registrations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: concert_artists Admins can delete concert artists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete concert artists" ON public.concert_artists FOR DELETE TO authenticated USING (public.is_admin());


--
-- Name: concert_settings Admins can delete concert settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete concert settings" ON public.concert_settings FOR DELETE TO authenticated USING (public.is_admin());


--
-- Name: contact_messages Admins can delete contact messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete contact messages" ON public.contact_messages FOR DELETE TO authenticated USING (public.is_admin());


--
-- Name: events Admins can delete events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete events" ON public.events FOR DELETE TO authenticated USING (public.is_admin());


--
-- Name: check_in_logs Admins can insert check_in_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert check_in_logs" ON public.check_in_logs FOR INSERT TO authenticated WITH CHECK (public.is_admin());


--
-- Name: concert_artists Admins can insert concert artists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert concert artists" ON public.concert_artists FOR INSERT TO authenticated WITH CHECK (public.is_admin());


--
-- Name: concert_settings Admins can insert concert settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert concert settings" ON public.concert_settings FOR INSERT TO authenticated WITH CHECK (public.is_admin());


--
-- Name: events Admins can insert events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert events" ON public.events FOR INSERT TO authenticated WITH CHECK (public.is_admin());


--
-- Name: concert_artists Admins can read all concert artists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read all concert artists" ON public.concert_artists FOR SELECT TO authenticated USING (public.is_admin());


--
-- Name: concert_settings Admins can read all concert settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read all concert settings" ON public.concert_settings FOR SELECT TO authenticated USING (public.is_admin());


--
-- Name: check_in_logs Admins can read check_in_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read check_in_logs" ON public.check_in_logs FOR SELECT TO authenticated USING (public.is_admin());


--
-- Name: contact_messages Admins can read contact messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read contact messages" ON public.contact_messages FOR SELECT TO authenticated USING (public.is_admin());


--
-- Name: employee_award_registrations Admins can read employee awards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read employee awards" ON public.employee_award_registrations FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND ((user_roles.role)::text = 'admin'::text)))));


--
-- Name: events Admins can read events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read events" ON public.events FOR SELECT TO authenticated USING (public.is_admin());


--
-- Name: guests Admins can read guests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read guests" ON public.guests FOR SELECT TO authenticated USING (public.is_admin());


--
-- Name: passes Admins can read passes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read passes" ON public.passes FOR SELECT TO authenticated USING (public.is_admin());


--
-- Name: payments Admins can read payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read payments" ON public.payments FOR SELECT TO authenticated USING (public.is_admin());


--
-- Name: registrations Admins can read registrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read registrations" ON public.registrations FOR SELECT TO authenticated USING (public.is_admin());


--
-- Name: concert_artists Admins can update concert artists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update concert artists" ON public.concert_artists FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: concert_settings Admins can update concert settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update concert settings" ON public.concert_settings FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: contact_messages Admins can update contact messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update contact messages" ON public.contact_messages FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: employee_award_registrations Admins can update employee awards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update employee awards" ON public.employee_award_registrations FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND ((user_roles.role)::text = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND ((user_roles.role)::text = 'admin'::text)))));


--
-- Name: events Admins can update events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update events" ON public.events FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: passes Admins can update passes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update passes" ON public.passes FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: registrations Admins can update registrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update registrations" ON public.registrations FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: contact_messages Public can insert contact messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can insert contact messages" ON public.contact_messages FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: activity_categories Public can read active categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can read active categories" ON public.activity_categories FOR SELECT USING ((is_active = true));


--
-- Name: concert_artists Public can read active concert artists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can read active concert artists" ON public.concert_artists FOR SELECT TO authenticated, anon USING ((is_active = true));


--
-- Name: events Public can read active events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can read active events" ON public.events FOR SELECT USING ((is_active = true));


--
-- Name: activity_categories Public can read activity categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can read activity categories" ON public.activity_categories FOR SELECT TO service_role USING (true);


--
-- Name: event_activity_categories Public can read event categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can read event categories" ON public.event_activity_categories FOR SELECT USING (true);


--
-- Name: concert_settings Public can read published concert settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can read published concert settings" ON public.concert_settings FOR SELECT TO authenticated, anon USING ((is_published = true));


--
-- Name: contact_messages Public cannot read contact messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public cannot read contact messages" ON public.contact_messages FOR SELECT TO anon USING (false);


--
-- Name: activity_categories Service role full access categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access categories" ON public.activity_categories TO service_role USING (true) WITH CHECK (true);


--
-- Name: check_in_logs Service role full access check_in_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access check_in_logs" ON public.check_in_logs TO service_role USING (true) WITH CHECK (true);


--
-- Name: pass_download_logs Service role full access download_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access download_logs" ON public.pass_download_logs TO service_role USING (true) WITH CHECK (true);


--
-- Name: event_activity_categories Service role full access event_activity_categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access event_activity_categories" ON public.event_activity_categories TO service_role USING (true) WITH CHECK (true);


--
-- Name: event_activity_categories Service role full access event_categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access event_categories" ON public.event_activity_categories TO service_role USING (true) WITH CHECK (true);


--
-- Name: events Service role full access events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access events" ON public.events TO service_role USING (true) WITH CHECK (true);


--
-- Name: guests Service role full access guests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access guests" ON public.guests TO service_role USING (true) WITH CHECK (true);


--
-- Name: passes Service role full access passes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access passes" ON public.passes TO service_role USING (true) WITH CHECK (true);


--
-- Name: payments Service role full access payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access payments" ON public.payments TO service_role USING (true) WITH CHECK (true);


--
-- Name: registrations Service role full access registrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access registrations" ON public.registrations TO service_role USING (true) WITH CHECK (true);


--
-- Name: user_roles Users read own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: activity_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: check_in_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.check_in_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: concert_artists; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.concert_artists ENABLE ROW LEVEL SECURITY;

--
-- Name: concert_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.concert_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: contact_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: employee_award_registrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.employee_award_registrations ENABLE ROW LEVEL SECURITY;

--
-- Name: event_activity_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_activity_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

--
-- Name: guests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

--
-- Name: pass_download_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pass_download_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: passes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.passes ENABLE ROW LEVEL SECURITY;

--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: registrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict 6Hntgi6S4Ocb02lt8UICONEmmL0rTDHaWPp1c1zd4JQShchRG5fX8iMPxFjQqkQ

