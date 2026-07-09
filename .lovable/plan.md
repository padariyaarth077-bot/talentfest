
## Core Entry Pass System

Ship a working, secure pass system. Skips email/WhatsApp/PDF/bulk/analytics per your scope choice.

### Backend (Lovable Cloud)

Enable Cloud, then create:

- `profiles` — id (→ auth.users), full_name, phone, city, photo_url, created_at. Auto-created on signup via trigger.
- `app_role` enum: `admin`, `participant`. `user_roles` table + `has_role()` security-definer function (per project convention).
- `entry_passes` — id (uuid), entry_number (auto `TF2026-000001` via sequence + trigger), user_id, competition, category, sub_category, status enum (`pending|approved|rejected|checked_in|completed|cancelled|expired`), verification_token (random 32-char), venue, hall, stage, event_date, reporting_time, entry_gate, checked_in_at, created_at.
- `pass-photos` storage bucket (public read) for participant photos.
- RLS: participants read/insert own; admin full access; public SELECT of a narrow safe-column view for `/verify-pass/$id`.

### Routes

- `/register` — extend existing form to actually insert a `pending` pass (requires login; redirects to `/signup` if not authed). Photo upload → storage.
- `/dashboard` (`_authenticated`) — "My Entry Passes" list. Shows status badge. If approved, "View Pass" button.
- `/pass/$entryId` (`_authenticated`, owner or admin only) — Premium pass UI (current entry-pass design, upgraded): logo, photo, name, entry ID, QR (encodes `/verify-pass/{id}?t={token}`), barcode (JsBarcode), competition/category/venue/hall/stage/date/times/gate, verified badge, T&C, status color. Print button.
- `/verify-pass/$entryId` — Public. Reads `?t=token`. Shows ✅ Verified with photo/name/competition/status OR ❌ Invalid. Uses server function with anon-key client + narrow policy.
- `/admin` (`_authenticated` + `has_role('admin')`) — Table of passes with search (name/phone/email/entry id/competition/category/city), Approve/Reject buttons, Mark Checked-In (via QR scan or manual). Uses `html5-qrcode` for scan.
- Keep `/entry-pass` as the demo/preview page, or remove — will remove to avoid confusion.

### Server functions (`createServerFn` + `requireSupabaseAuth`)

- `createRegistration({ competition, category, ... })` — inserts pending pass for current user.
- `listMyPasses()` — user's own passes.
- `getPass(entryId)` — owner or admin.
- `verifyPass(entryId, token)` — **public** (no auth middleware, uses publishable client + narrow anon SELECT policy). Returns safe fields only.
- Admin: `listAllPasses(filters)`, `approvePass(id)`, `rejectPass(id)`, `checkInPass(id, token)`.

### UI/Design

Keep Black/Gold/Bronze theme. Pass card uses `gradient-hero` header, glassmorphism body, gold verified badge, status color chip. Mobile-responsive; large QR on mobile. Respect existing tokens.

### Deps

`bun add jsbarcode html5-qrcode` (qrcode.react already installed).

### Out of scope (this pass)

Email/WhatsApp automation, PDF download (browser print works), bulk generate, offline cache, analytics dashboard, seat assignment, jury role. All can be added later on top of this schema.

### Files (create/edit)

- New: `supabase/migrations/*_entry_passes.sql`, `src/routes/_authenticated/route.tsx` (if missing), `src/routes/_authenticated/dashboard.tsx`, `src/routes/_authenticated/pass.$entryId.tsx`, `src/routes/_authenticated/admin.tsx`, `src/routes/verify-pass.$entryId.tsx`, `src/lib/passes.functions.ts`, `src/lib/admin.functions.ts`, `src/components/site/PassCard.tsx`.
- Edit: `src/routes/register.tsx` (wire to Cloud), `src/routes/signup.tsx` + `login.tsx` (ensure Supabase auth), `src/components/site/Header.tsx` (Dashboard link when signed in), delete/repurpose `src/routes/entry-pass.tsx`.

Approve to build.
