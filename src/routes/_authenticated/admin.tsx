/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Download,
  Eye,
  FileText,
  Filter,
  Film,
  Image as ImageIcon,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Music,
  Newspaper,
  Pencil,
  Plus,
  Printer,
  QrCode,
  RefreshCcw,
  RotateCcw,
  ScanLine,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  Ticket,
  Trash2,
  Undo2,
  UserRound,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { generatePassPdf, renderSingleSidedPassToCanvas } from "@/lib/pdf-generator";
import { checkInAdminPass, fetchAdminData, verifyAdminQr } from "@/lib/admin.functions";
import { cn } from "@/lib/utils";
import { getSupabaseConfigError, supabase } from "@/integrations/supabase/client";

type AdminView =
  | "dashboard"
  | "passes"
  | "scanner"
  | "participants"
  | "reports"
  | "gallery"
  | "events"
  | "concert"
  | "blog"
  | "settings";
type PassFilter =
  | "all"
  | "today"
  | "checked_in"
  | "not_checked_in"
  | "active"
  | "revoked"
  | "participant"
  | "guest"
  | "visitor"
  | "paid"
  | "test_paid"
  | "payment_pending";
type ScannerState = "idle" | "valid" | "checked_in" | "invalid" | "revoked" | "error";

type PublicEntryPass = {
  id: string;
  participant_name: string;
  event_name: string;
  entry_number: string;
  qr_value?: string | null;
  email?: string | null;
  phone?: string | null;
  created_at: string;
  checked_in?: boolean | null;
  checked_in_at?: string | null;
  pass_status?: string | null;
  status?: string | null;
  updated_at?: string | null;
  pass_type?: string | null;
  registration_number?: string | null;
  payment_status?: string | null;
  payment_mode?: string | null;
  payment_provider?: string | null;
  transaction_id?: string | null;
  order_id?: string | null;
  registration_status?: string | null;
  event_city?: string | null;
  event_date?: string | null;
  event_time?: string | null;
  venue?: string | null;
  event_image_url?: string | null;
  linked_participant_name?: string | null;
  aadhaar_last_four?: string | null;
  activity_category?: string | null;
  registration_type?: string | null;
};

type AdminActivity = {
  id: string;
  action: string;
  entry_number: string | null;
  participant_name: string | null;
  created_at: string;
  admin_email: string | null;
};

type ScannerResult = {
  state: ScannerState;
  message: string;
  pass?: PublicEntryPass;
};

type GalleryCity = {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string | null;
};

type GalleryMedia = {
  id: string;
  city_id: string | null;
  title: string;
  media_type: "photo" | "video";
  category: string;
  media_url: string;
  thumbnail_url?: string | null;
  description?: string | null;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string | null;
};

type GalleryCityForm = {
  name: string;
  slug: string;
  display_order: string;
  is_active: boolean;
};

type GalleryMediaForm = {
  title: string;
  city_id: string;
  media_type: "photo" | "video";
  category: string;
  media_url: string;
  thumbnail_url: string;
  description: string;
  display_order: string;
  is_active: boolean;
};

type ConcertSettingsRecord = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  event_label: string;
  event_title: string;
  venue: string;
  event_date: string | null;
  start_time: string | null;
  price_text: string;
  button_text: string;
  button_url: string;
  map_url: string;
  map_embed_url: string;
  is_published: boolean;
};

type ConcertArtistRecord = {
  id: string;
  artist_name: string;
  performance_type: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
};

type BlogPostRecord = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  thumbnail_url: string | null;
  thumbnail_alt: string | null;
  status: "draft" | "published";
  published_at: string | null;
  is_featured: boolean;
  display_order: number;
};

const pageSize = 10;
const qrRenderSize = 768;

const sidebarItems: Array<{ view: AdminView; label: string; icon: typeof LayoutDashboard }> = [
  { view: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { view: "passes", label: "Entry Passes", icon: ClipboardList },
  { view: "scanner", label: "QR Scanner", icon: ScanLine },
  { view: "participants", label: "Participants", icon: Users },
  { view: "events", label: "Events", icon: CalendarDays },
  { view: "reports", label: "Reports", icon: BarChart3 },
  { view: "gallery", label: "Gallery Cities", icon: ImageIcon },
  { view: "concert", label: "Concert Info", icon: Music },
  { view: "blog", label: "Blog Posts", icon: Newspaper },
  { view: "settings", label: "Admin Settings", icon: Settings },
];

const filterLabels: Record<PassFilter, string> = {
  all: "All passes",
  today: "Generated today",
  checked_in: "Checked in",
  not_checked_in: "Not checked in",
  active: "Active",
  revoked: "Revoked",
  participant: "Participants",
  guest: "Guests",
  visitor: "Visitors",
  paid: "Paid",
  test_paid: "Test paid",
  payment_pending: "Payment pending",
};

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: ({ location }) => {
    if (location.pathname !== "/admin") throw redirect({ to: "/admin" });
  },
  head: () => ({ meta: [{ title: "Admin Panel - Telent Fest" }] }),
  component: AdminPanel,
});

function AdminPanel() {
  const [activeView, setActiveView] = useState<AdminView>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminUserId, setAdminUserId] = useState("");
  const [passes, setPasses] = useState<PublicEntryPass[]>([]);
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [galleryCities, setGalleryCities] = useState<GalleryCity[]>([]);
  const [galleryMedia, setGalleryMedia] = useState<GalleryMedia[]>([]);
  const [galleryDataError, setGalleryDataError] = useState("");
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [concertSettings, setConcertSettings] = useState<ConcertSettingsRecord | null>(null);
  const [concertArtists, setConcertArtists] = useState<ConcertArtistRecord[]>([]);
  const [concertDataError, setConcertDataError] = useState("");
  const [blogPosts, setBlogPosts] = useState<BlogPostRecord[]>([]);
  const [blogDataError, setBlogDataError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PassFilter>("all");
  const [page, setPage] = useState(1);
  const [selectedPass, setSelectedPass] = useState<PublicEntryPass | null>(null);
  const [largeQrPass, setLargeQrPass] = useState<PublicEntryPass | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    description: string;
    action: () => Promise<void>;
  } | null>(null);
  const [scannerResult, setScannerResult] = useState<ScannerResult>({
    state: "idle",
    message: "Start the scanner and point the camera at an Entry Pass QR code.",
  });
  const tableQrRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const detailQrRef = useRef<HTMLCanvasElement>(null);

  const loadAdminData = useCallback(async (quiet = false) => {
    const configError = getSupabaseConfigError();
    if (configError) {
      setIsAdmin(false);
      setLoading(false);
      toast.error(configError);
      return;
    }

    if (quiet) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        window.location.href = "/admin/login";
        return;
      }

      setAdminEmail(userData.user.email ?? "");
      setAdminUserId(userData.user.id);
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (roleError) throw roleError;
      if (!roleData) {
        setIsAdmin(false);
        return;
      }

      setIsAdmin(true);
      try {
        const adminData = await fetchAdminData({ data: { adminUserId: userData.user.id } });
        setPasses((adminData.passes ?? []).map((pass) => normalizePass(pass as PublicEntryPass)));
        setActivities((adminData.activities ?? []) as AdminActivity[]);
        setEventsList(adminData.events ?? []);
        setGalleryDataError("");
        setGalleryCities((adminData.galleryCities ?? []) as GalleryCity[]);
        setGalleryMedia((adminData.galleryMedia ?? []) as GalleryMedia[]);
        setConcertDataError("");
        setConcertSettings((adminData.concertSettings ?? null) as ConcertSettingsRecord | null);
        setConcertArtists((adminData.concertArtists ?? []) as ConcertArtistRecord[]);
        setBlogDataError("");
        setBlogPosts((adminData.blogPosts ?? []) as BlogPostRecord[]);
        return;
      } catch (serverError) {
        console.warn("Server admin fetch failed, falling back to browser queries", serverError);
      }

      const eventsResult = await supabase
        .from("events")
        .select("*")
        .order("name", { ascending: true });
      if (!eventsResult.error) setEventsList(eventsResult.data ?? []);

      // Also load from new passes table
      const { data: newPassesData } = await supabase
        .from("passes")
        .select(
          "id, pass_number, pass_type, status, checked_in, checked_in_at, registration_id, guest_id, secure_qr_token, created_at",
        )
        .order("created_at", { ascending: false });

      const newPasses: PublicEntryPass[] = [];
      if (newPassesData) {
        for (const np of newPassesData as any[]) {
          const { data: reg } = await supabase
            .from("registrations")
            .select(
              "full_name, email, phone, event_id, registration_number, payment_status, registration_status, activity_category_id, registration_type, aadhaar_last_four",
            )
            .eq("id", np.registration_id)
            .single();
          let eventName = "";
          let eventCity = "";
          let eventDate = "";
          let eventTime = "";
          let venue = "";
          let activityCategory = "";
          let payment: any = null;
          if (reg) {
            const { data: ev } = await supabase
              .from("events")
              .select("name, city, event_date, start_time, venue")
              .eq("id", (reg as any).event_id)
              .single();
            if (ev) {
              eventName = (ev as any).name || "";
              eventCity = (ev as any).city || "";
              eventDate = (ev as any).event_date || "";
              eventTime = (ev as any).start_time || "";
              venue = (ev as any).venue || "";
            }
            if ((reg as any).activity_category_id) {
              const { data: cat } = await supabase
                .from("activity_categories")
                .select("name")
                .eq("id", (reg as any).activity_category_id)
                .single();
              activityCategory = (cat as any)?.name || "";
            }
            const paymentWithMode = await (supabase as any)
              .from("payments")
              .select("provider, payment_mode, status, transaction_id, order_id")
              .eq("registration_id", np.registration_id)
              .order("created_at", { ascending: false })
              .limit(1);
            if (!paymentWithMode.error) {
              payment = paymentWithMode.data?.[0] ?? null;
            } else {
              const paymentFallback = await (supabase as any)
                .from("payments")
                .select("provider, status, transaction_id, order_id")
                .eq("registration_id", np.registration_id)
                .order("created_at", { ascending: false })
                .limit(1);
              payment = paymentFallback.data?.[0] ?? null;
            }
          }
          let passName = (reg as any)?.full_name || "Unknown";
          let linkedParticipantName: string | null = null;
          if (np.guest_id) {
            const { data: guest } = await supabase
              .from("guests")
              .select("full_name")
              .eq("id", np.guest_id)
              .single();
            passName = (guest as any)?.full_name || passName;
            linkedParticipantName = (reg as any)?.full_name || null;
          }
          newPasses.push({
            id: np.id,
            participant_name: passName,
            event_name: eventName || "New Registration",
            entry_number: np.pass_number,
            created_at: np.created_at,
            checked_in: np.checked_in,
            checked_in_at: np.checked_in_at,
            pass_status: np.status,
            status: np.status,
            email: (reg as any)?.email || null,
            phone: (reg as any)?.phone || null,
            qr_value: JSON.stringify({
              id: np.id,
              entryNumber: np.pass_number,
              token: np.secure_qr_token,
            }),
            pass_type: np.pass_type,
            registration_number: (reg as any)?.registration_number || null,
            payment_status: payment?.status || (reg as any)?.payment_status || null,
            payment_mode: payment?.payment_mode || (payment?.provider === "dummy" ? "test" : null),
            payment_provider: payment?.provider || null,
            transaction_id: payment?.transaction_id || null,
            order_id: payment?.order_id || null,
            registration_status: (reg as any)?.registration_status || null,
            event_city: eventCity || null,
            event_date: eventDate || null,
            event_time: eventTime || null,
            venue: venue || null,
            linked_participant_name: linkedParticipantName,
            aadhaar_last_four: (reg as any)?.aadhaar_last_four || null,
            activity_category: activityCategory || null,
          });
        }
      }

      const [passesResult, activityResult, citiesResult, mediaResult] = await Promise.all([
        supabase
          .from("public_entry_passes")
          .select(
            "id, participant_name, event_name, entry_number, qr_value, email, phone, created_at, checked_in, checked_in_at, pass_status, status, updated_at",
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("admin_activity")
          .select("id, action, entry_number, participant_name, created_at, admin_email")
          .order("created_at", { ascending: false })
          .limit(12),
        supabase
          .from("gallery_cities")
          .select("id, name, slug, display_order, is_active, created_at, updated_at")
          .order("display_order", { ascending: true })
          .order("name", { ascending: true }),
        supabase
          .from("gallery_media")
          .select(
            "id, city_id, title, media_type, category, media_url, thumbnail_url, description, display_order, is_active, created_at, updated_at",
          )
          .order("display_order", { ascending: true })
          .order("created_at", { ascending: false }),
      ]);

      if (passesResult.error) throw passesResult.error;
      const oldPasses = ((passesResult.data ?? []) as unknown as PublicEntryPass[]).map(
        normalizePass,
      );
      // Merge new passes, avoiding duplicates by ID
      const merged = [...oldPasses];
      const existingIds = new Set(merged.map((p) => p.id));
      for (const np of newPasses) {
        if (!existingIds.has(np.id)) merged.push(np);
      }
      setPasses(merged);
      if (!activityResult.error) {
        setActivities((activityResult.data ?? []) as unknown as AdminActivity[]);
      }
      if (citiesResult.error || mediaResult.error) {
        setGalleryCities([]);
        setGalleryMedia([]);
        setGalleryDataError(
          citiesResult.error?.message ??
            mediaResult.error?.message ??
            "Gallery tables are not ready yet.",
        );
      } else {
        setGalleryDataError("");
        setGalleryCities((citiesResult.data ?? []) as unknown as GalleryCity[]);
        setGalleryMedia((mediaResult.data ?? []) as unknown as GalleryMedia[]);
      }

      const db = supabase as any;
      const [concertSettingsResult, concertArtistsResult, blogPostsResult] = await Promise.all([
        db
          .from("concert_settings")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        db
          .from("concert_artists")
          .select("*")
          .order("display_order", { ascending: true })
          .order("artist_name", { ascending: true }),
        db
          .from("blog_posts")
          .select("*")
          .order("display_order", { ascending: true })
          .order("published_at", { ascending: false }),
      ]);

      if (concertSettingsResult.error || concertArtistsResult.error) {
        setConcertSettings(null);
        setConcertArtists([]);
        setConcertDataError(
          concertSettingsResult.error?.message ??
            concertArtistsResult.error?.message ??
            "Concert tables are not ready yet.",
        );
      } else {
        setConcertDataError("");
        setConcertSettings(concertSettingsResult.data ?? null);
        setConcertArtists(concertArtistsResult.data ?? []);
      }

      if (blogPostsResult.error) {
        setBlogPosts([]);
        setBlogDataError(blogPostsResult.error.message ?? "Blog table is not ready yet.");
      } else {
        setBlogDataError("");
        setBlogPosts(blogPostsResult.data ?? []);
      }
    } catch (error) {
      if (error && typeof error === "object" && "to" in error) throw error;
      toast.error(error instanceof Error ? error.message : "Failed to load admin data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  const today = new Date().toDateString();
  const stats = useMemo(() => {
    const generatedToday = passes.filter(
      (p) => new Date(p.created_at).toDateString() === today,
    ).length;
    const checkedIn = passes.filter((p) => isCheckedIn(p)).length;
    const revoked = passes.filter((p) => isRevoked(p)).length;
    return {
      total: passes.length,
      today: generatedToday,
      checkedIn,
      pending: passes.filter((p) => p.payment_status === "pending" || !p.payment_status).length,
      revoked,
      participant: passes.filter((p) => p.pass_type === "participant").length,
      visitor: passes.filter((p) => p.pass_type === "visitor").length,
      guest: passes.filter((p) => p.pass_type === "guest_1" || p.pass_type === "guest_2").length,
      testPaid: passes.filter(
        (p) =>
          p.payment_status === "paid" &&
          (p.payment_mode === "test" || p.payment_provider === "dummy"),
      ).length,
    };
  }, [passes, today]);

  const filteredPasses = useMemo(() => {
    const term = query.trim().toLowerCase();
    return passes.filter((pass) => {
      const matchesSearch =
        !term ||
        [
          pass.participant_name,
          pass.entry_number,
          pass.registration_number ?? "",
          pass.transaction_id ?? "",
          pass.order_id ?? "",
          pass.email ?? "",
          pass.phone ?? "",
          pass.event_name,
          pass.event_city ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);

      if (!matchesSearch) return false;
      if (filter === "today") return new Date(pass.created_at).toDateString() === today;
      if (filter === "checked_in") return isCheckedIn(pass);
      if (filter === "not_checked_in") return !isCheckedIn(pass);
      if (filter === "active") return !isRevoked(pass);
      if (filter === "revoked") return isRevoked(pass);
      if (filter === "participant") return pass.pass_type === "participant";
      if (filter === "guest") return pass.pass_type === "guest_1" || pass.pass_type === "guest_2";
      if (filter === "visitor") return pass.pass_type === "visitor";
      if (filter === "paid") return pass.payment_status === "paid";
      if (filter === "test_paid")
        return (
          pass.payment_status === "paid" &&
          (pass.payment_mode === "test" || pass.payment_provider === "dummy")
        );
      if (filter === "payment_pending")
        return pass.payment_status === "pending" || !pass.payment_status;
      return true;
    });
  }, [filter, passes, query, today]);

  const pageCount = Math.max(1, Math.ceil(filteredPasses.length / pageSize));
  const pagedPasses = filteredPasses.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [query, filter]);

  const logActivity = async (action: string, pass?: PublicEntryPass) => {
    await supabase.from("admin_activity").insert({
      action,
      entry_number: pass?.entry_number ?? null,
      participant_name: pass?.participant_name ?? null,
      admin_email: adminEmail || null,
      pass_id: pass?.id ?? null,
    } as never);
  };

  const updatePass = async (
    pass: PublicEntryPass,
    patch: Record<string, unknown>,
    action: string,
  ) => {
    const { error } = await supabase
      .from("public_entry_passes")
      .update({ ...patch, updated_at: new Date().toISOString() } as never)
      .eq("id", pass.id);

    if (error) throw error;
    await logActivity(action, pass);
    toast.success(action);
    await loadAdminData(true);
  };

  const markCheckedIn = async (pass: PublicEntryPass) => {
    if (isCheckedIn(pass)) {
      toast.warning(`Already checked in at ${formatDateTime(pass.checked_in_at)}`);
      return;
    }
    if (isRevoked(pass)) {
      toast.error("This pass is revoked and cannot be checked in.");
      return;
    }
    try {
      await checkInAdminPass({ data: { adminUserId, passId: pass.id } });
      await logActivity("Marked pass as checked in", pass);
      toast.success("Marked pass as checked in");
      await loadAdminData(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to check in this pass.");
    }
  };

  const undoCheckIn = async (pass: PublicEntryPass) => {
    const { data: checkNew } = await supabase
      .from("passes")
      .select("id")
      .eq("id", pass.id)
      .maybeSingle();
    if (checkNew) {
      await supabase
        .from("passes")
        .update({
          checked_in: false,
          checked_in_at: null,
          status: "active",
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", pass.id);
      await supabase.from("check_in_logs").insert({
        pass_id: pass.id,
        admin_user_id: adminUserId || null,
        previous_status: "checked_in",
        new_status: "active",
        action: "Undid check-in",
        checked_in_at: new Date().toISOString(),
      } as never);
      toast.success("Undid check-in");
      await logActivity("Undid check-in", pass);
      await loadAdminData(true);
      return;
    }
    await updatePass(
      pass,
      { checked_in: false, checked_in_at: null, status: "generated" },
      "Undid check-in",
    );
  };

  const revokePass = async (pass: PublicEntryPass) => {
    const { data: checkNew } = await supabase
      .from("passes")
      .select("id")
      .eq("id", pass.id)
      .maybeSingle();
    if (checkNew) {
      await supabase
        .from("passes")
        .update({
          status: "revoked",
          revoked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", pass.id);
      toast.success("Revoked pass");
      await logActivity("Revoked pass", pass);
      await loadAdminData(true);
      return;
    }
    await updatePass(pass, { pass_status: "revoked", status: "cancelled" }, "Revoked pass");
  };

  const restorePass = async (pass: PublicEntryPass) => {
    const { data: checkNew } = await supabase
      .from("passes")
      .select("id")
      .eq("id", pass.id)
      .maybeSingle();
    if (checkNew) {
      await supabase
        .from("passes")
        .update({
          status: "active",
          revoked_at: null,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", pass.id);
      toast.success("Restored pass");
      await logActivity("Restored pass", pass);
      await loadAdminData(true);
      return;
    }
    await updatePass(
      pass,
      { pass_status: "active", status: isCheckedIn(pass) ? "checked_in" : "generated" },
      "Restored pass",
    );
  };

  const deletePass = async (pass: PublicEntryPass) => {
    const { data: checkNew } = await supabase
      .from("passes")
      .select("id")
      .eq("id", pass.id)
      .maybeSingle();
    const { error } = checkNew
      ? await supabase.from("passes").delete().eq("id", pass.id)
      : await supabase.from("public_entry_passes").delete().eq("id", pass.id);
    if (error) throw error;
    await logActivity("Deleted pass record", pass);
    toast.success("Deleted pass record");
    await loadAdminData(true);
  };

  const downloadPassPdf = async (pass: PublicEntryPass) => {
    const qrCanvas = tableQrRefs.current[pass.id] ?? detailQrRef.current;
    if (!qrCanvas) {
      toast.error("QR code is still rendering. Please try again.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 1400;
    canvas.height = 800;
    await renderSingleSidedPassToCanvas(canvas, {
      passNumber: pass.entry_number,
      passType: pass.pass_type || "participant",
      participantName: pass.participant_name,
      eventName: pass.event_name,
      eventCity: pass.event_city || "",
      eventDate: pass.event_date || "",
      startTime: pass.event_time || "",
      venue: pass.venue || "",
      activityCategory: pass.activity_category || "",
      eventImageUrl: pass.event_image_url || "",
      qrDataUrl: qrCanvas.toDataURL("image/png"),
      status: pass.payment_status === "paid" ? "active" : pass.pass_status || "pending",
    });
    await generatePassPdf(canvas, `Telent-Fest-Entry-Pass-${pass.entry_number}.pdf`);
    await logActivity("Downloaded entry pass PDF", pass);
  };

  const printPass = (pass: PublicEntryPass) => {
    const qrCanvas = tableQrRefs.current[pass.id] ?? detailQrRef.current;
    const printable = buildPrintablePass(pass, qrCanvas?.toDataURL("image/png"));
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) return toast.error("Allow popups to print this pass.");
    win.document.write(printable);
    win.document.close();
    win.focus();
    win.print();
  };

  const exportCsv = (rows: PublicEntryPass[], filename: string) => {
    const headers = [
      "participant_name",
      "event_name",
      "entry_number",
      "email",
      "phone",
      "created_at",
      "checked_in",
      "checked_in_at",
      "pass_status",
      "status",
    ];
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((key) => `"${String(row[key as keyof PublicEntryPass] ?? "").replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n");
    downloadText(csv, filename, "text/csv;charset=utf-8");
    void logActivity(`Exported ${rows.length} participant records`);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/admin/login";
  };

  if (loading)
    return (
      <AdminShell
        activeView={activeView}
        onView={setActiveView}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onLogout={logout}
      >
        <AdminSkeleton />
      </AdminShell>
    );

  if (!isAdmin) {
    return <AdminAccessDenied onLogout={logout} />;
  }

  return (
    <AdminShell
      activeView={activeView}
      onView={setActiveView}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      onLogout={logout}
      adminEmail={adminEmail}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-primary">Telent Fest Admin</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {titleForView(activeView)}
            </h1>
          </div>
          <Button variant="outline" onClick={() => loadAdminData(true)} disabled={refreshing}>
            <RefreshCcw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {activeView === "dashboard" && (
          <DashboardView
            stats={stats}
            activities={activities}
            passes={passes}
            onViewPass={setSelectedPass}
          />
        )}
        {activeView === "passes" && (
          <PassesView
            query={query}
            setQuery={setQuery}
            filter={filter}
            setFilter={setFilter}
            filteredCount={filteredPasses.length}
            passes={pagedPasses}
            page={page}
            pageCount={pageCount}
            setPage={setPage}
            onView={setSelectedPass}
            onDownload={downloadPassPdf}
            onPrint={printPass}
            onLargeQr={setLargeQrPass}
            onCheckIn={markCheckedIn}
            onUndo={undoCheckIn}
            onRevoke={(pass) =>
              setConfirmAction({
                title: "Revoke pass?",
                description: "This will block entry for this participant.",
                action: () => revokePass(pass),
              })
            }
            onRestore={restorePass}
            onDelete={(pass) =>
              setConfirmAction({
                title: "Delete record?",
                description: "This permanently deletes the entry pass record after confirmation.",
                action: () => deletePass(pass),
              })
            }
            qrRefs={tableQrRefs}
          />
        )}
        {activeView === "scanner" && (
          <ScannerView
            result={scannerResult}
            setResult={setScannerResult}
            adminUserId={adminUserId}
            onCheckIn={markCheckedIn}
          />
        )}
        {activeView === "participants" && (
          <ParticipantsView
            passes={filteredPasses.filter(
              (pass) => pass.pass_type === "participant" || pass.registration_type === "participant",
            )}
            onView={setSelectedPass}
          />
        )}
        {activeView === "events" && (
          <EventsView
            events={eventsList}
            onRefresh={() => loadAdminData(true)}
            logActivity={logActivity}
            setConfirmAction={setConfirmAction}
          />
        )}
        {activeView === "reports" && (
          <ReportsView
            passes={passes}
            filteredPasses={filteredPasses}
            onExportAll={() => exportCsv(passes, "talent-fest-all-participants.csv")}
            onExportFiltered={() =>
              exportCsv(filteredPasses, "talent-fest-filtered-participants.csv")
            }
            onPrint={() => printParticipantList(filteredPasses)}
          />
        )}
        {activeView === "gallery" && (
          <GalleryCitiesView
            cities={galleryCities}
            media={galleryMedia}
            dataError={galleryDataError}
            onRefresh={() => loadAdminData(true)}
            logActivity={logActivity}
            setConfirmAction={setConfirmAction}
          />
        )}
        {activeView === "concert" && (
          <ConcertInformationView
            settings={concertSettings}
            artists={concertArtists}
            dataError={concertDataError}
            onRefresh={() => loadAdminData(true)}
            logActivity={logActivity}
            setConfirmAction={setConfirmAction}
          />
        )}
        {activeView === "blog" && (
          <BlogPostsView
            posts={blogPosts}
            dataError={blogDataError}
            onRefresh={() => loadAdminData(true)}
            logActivity={logActivity}
            setConfirmAction={setConfirmAction}
          />
        )}
        {activeView === "settings" && <SettingsView adminEmail={adminEmail} />}
      </div>

      <PassDetailsDialog
        pass={selectedPass}
        onOpenChange={(open) => !open && setSelectedPass(null)}
        onDownload={downloadPassPdf}
        onPrint={printPass}
        qrRef={detailQrRef}
      />
      <LargeQrDialog pass={largeQrPass} onOpenChange={(open) => !open && setLargeQrPass(null)} />
      <ConfirmDialog confirm={confirmAction} setConfirm={setConfirmAction} />
    </AdminShell>
  );
}

function AdminShell({
  children,
  activeView,
  onView,
  sidebarOpen,
  setSidebarOpen,
  onLogout,
  adminEmail,
}: {
  children: React.ReactNode;
  activeView: AdminView;
  onView: (view: AdminView) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  onLogout: () => void;
  adminEmail?: string;
}) {
  return (
    <div className="min-h-screen bg-[#07111f] text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 border-r border-primary/20 bg-[#09182b] p-4 transition-transform lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl border border-primary/40 bg-primary/10">
              <img
                src="/brand/telentfest-icon-tight.png"
                alt="TelentFest logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="font-display text-lg font-semibold">Telent Fest</div>
              <div className="text-xs text-muted-foreground">Admin Panel</div>
            </div>
          </div>
          <button
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-8 space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.view}
                onClick={() => {
                  onView(item.view);
                  setSidebarOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                  activeView === item.view
                    ? "bg-primary/15 text-primary"
                    : "text-foreground/75 hover:bg-white/5 hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <button
          onClick={onLogout}
          className="absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-xl border border-border/50 px-3 py-2.5 text-sm text-foreground/80 hover:bg-white/5"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-primary/15 bg-[#07111f]/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <button
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
              <KeyRound className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">{adminEmail}</span>
            </div>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function DashboardView({
  stats,
  activities,
  passes,
  onViewPass,
}: {
  stats: {
    total: number;
    today: number;
    checkedIn: number;
    pending: number;
    revoked: number;
    participant: number;
    visitor: number;
    guest: number;
    testPaid: number;
  };
  activities: AdminActivity[];
  passes: PublicEntryPass[];
  onViewPass: (pass: PublicEntryPass) => void;
}) {
  const cards = [
    { label: "Total Registrations", value: stats.total, icon: FileText },
    { label: "Participant Passes", value: stats.participant, icon: Users },
    { label: "Visitor Passes", value: stats.visitor, icon: Ticket },
    { label: "Guest Passes", value: stats.guest, icon: UserRound },
    { label: "Test Payments", value: stats.testPaid, icon: CreditCard },
    { label: "Checked In Today", value: stats.checkedIn, icon: CheckCircle2 },
    { label: "Pending Payments", value: stats.pending, icon: Activity },
    { label: "Revoked Passes", value: stats.revoked, icon: XCircle },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-primary/15 bg-white/[0.04] p-5 shadow-soft"
            >
              <Icon className="h-5 w-5 text-primary" />
              <div className="mt-4 text-3xl font-semibold">{card.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{card.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Recent Activity">
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="rounded-xl border border-border/50 bg-background/40 p-3"
              >
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-medium">{activity.action}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(activity.created_at)}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {activity.participant_name ?? "System"}{" "}
                  {activity.entry_number ? `- ${activity.entry_number}` : ""}
                </div>
              </div>
            ))}
            {activities.length === 0 && <EmptyState text="No admin activity yet." />}
          </div>
        </Panel>

        <Panel title="Latest Passes">
          <div className="space-y-2">
            {passes.slice(0, 6).map((pass) => (
              <button
                key={pass.id}
                onClick={() => onViewPass(pass)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/40 p-3 text-left hover:border-primary/40"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{pass.participant_name}</div>
                  <div className="text-xs text-muted-foreground">{pass.entry_number}</div>
                </div>
                <StatusBadge pass={pass} />
              </button>
            ))}
            {passes.length === 0 && <EmptyState text="No entry passes generated yet." />}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function PassesView(props: {
  query: string;
  setQuery: (value: string) => void;
  filter: PassFilter;
  setFilter: (value: PassFilter) => void;
  filteredCount: number;
  passes: PublicEntryPass[];
  page: number;
  pageCount: number;
  setPage: (value: number) => void;
  onView: (pass: PublicEntryPass) => void;
  onDownload: (pass: PublicEntryPass) => void;
  onPrint: (pass: PublicEntryPass) => void;
  onLargeQr: (pass: PublicEntryPass) => void;
  onCheckIn: (pass: PublicEntryPass) => void;
  onUndo: (pass: PublicEntryPass) => void;
  onRevoke: (pass: PublicEntryPass) => void;
  onRestore: (pass: PublicEntryPass) => void;
  onDelete: (pass: PublicEntryPass) => void;
  qrRefs: React.MutableRefObject<Record<string, HTMLCanvasElement | null>>;
}) {
  return (
    <Panel title="Entry Pass Management">
      <div className="mb-5 space-y-3">
        <div className="relative max-w-4xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={props.query}
            onChange={(event) => props.setQuery(event.target.value)}
            placeholder="Search name, pass number, event, email, phone, or transaction"
            className="w-full rounded-xl border border-border bg-background/70 py-2.5 pl-9 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {props.query && (
            <button
              type="button"
              onClick={() => props.setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          {(Object.keys(filterLabels) as PassFilter[]).map((value) => (
            <button
              key={value}
              onClick={() => props.setFilter(value)}
              className={cn(
                "whitespace-nowrap rounded-lg border px-3 py-2 text-xs",
                props.filter === value
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground",
              )}
            >
              {filterLabels[value]}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full min-w-[1180px] text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Participant</th>
              <th className="px-4 py-3 text-left">Event</th>
              <th className="px-4 py-3 text-left">Pass Type</th>
              <th className="px-4 py-3 text-left">Registration</th>
              <th className="px-4 py-3 text-left">Payment</th>
              <th className="px-4 py-3 text-left">Activity</th>
              <th className="px-4 py-3 text-left">Entry Number</th>
              <th className="px-4 py-3 text-left">QR Code</th>
              <th className="px-4 py-3 text-left">Contact</th>
              <th className="px-4 py-3 text-left">Generated</th>
              <th className="px-4 py-3 text-left">Check-In</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {props.passes.map((pass) => (
              <tr key={pass.id} className="border-t border-border/60 align-top">
                <td className="px-4 py-3 font-medium">{pass.participant_name}</td>
                <td className="px-4 py-3">
                  <div>{pass.event_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {pass.event_city || "City not tracked"}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs capitalize">
                  {(pass.pass_type ?? "legacy").replace("_", " ")}
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {pass.registration_number ?? "Legacy"}
                </td>
                <td className="px-4 py-3 text-xs capitalize">
                  <div>{pass.payment_status ?? "Not tracked"}</div>
                  {(pass.payment_mode || pass.payment_provider) && (
                    <div className="mt-1 text-[10px] uppercase tracking-wider text-primary">
                      {pass.payment_mode === "test" || pass.payment_provider === "dummy"
                        ? "Test payment"
                        : pass.payment_provider}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">{pass.activity_category ?? "N/A"}</td>
                <td className="px-4 py-3 font-mono text-xs">{pass.entry_number}</td>
                <td className="px-4 py-3">
                  <div className="inline-block rounded-lg bg-white p-1.5">
                    <QRCodeCanvas
                      ref={(node) => {
                        props.qrRefs.current[pass.id] = node;
                      }}
                      value={qrValue(pass)}
                      size={112}
                      marginSize={4}
                      level="M"
                      bgColor="#ffffff"
                      fgColor="#000000"
                      className="block"
                    />
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  <div>{pass.phone || "No phone"}</div>
                  <div>{pass.email || "No email"}</div>
                </td>
                <td className="px-4 py-3 text-xs">{formatDateTime(pass.created_at)}</td>
                <td className="px-4 py-3 text-xs">
                  {isCheckedIn(pass) ? (
                    <span className="text-emerald-400">{formatDateTime(pass.checked_in_at)}</span>
                  ) : (
                    <span className="text-muted-foreground">Not checked in</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge pass={pass} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    <IconButton
                      label="View complete Entry Pass"
                      onClick={() => props.onView(pass)}
                      icon={Eye}
                    />
                    <IconButton
                      label="Download Entry Pass PDF"
                      onClick={() => props.onDownload(pass)}
                      icon={Download}
                    />
                    <IconButton
                      label="Print Entry Pass"
                      onClick={() => props.onPrint(pass)}
                      icon={Printer}
                    />
                    <IconButton
                      label="View enlarged QR code"
                      onClick={() => props.onLargeQr(pass)}
                      icon={QrCode}
                    />
                    {isCheckedIn(pass) ? (
                      <IconButton
                        label="Undo Check-In"
                        onClick={() => props.onUndo(pass)}
                        icon={Undo2}
                      />
                    ) : (
                      <IconButton
                        label="Mark as Checked In"
                        onClick={() => props.onCheckIn(pass)}
                        icon={CheckCircle2}
                      />
                    )}
                    {isRevoked(pass) ? (
                      <IconButton
                        label="Restore Pass"
                        onClick={() => props.onRestore(pass)}
                        icon={RotateCcw}
                      />
                    ) : (
                      <IconButton
                        label="Revoke Pass"
                        onClick={() => props.onRevoke(pass)}
                        icon={ShieldAlert}
                      />
                    )}
                    <IconButton
                      label="Delete record"
                      onClick={() => props.onDelete(pass)}
                      icon={Trash2}
                      danger
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {props.passes.length === 0 && (
          <EmptyState text="No records match the current search and filters." />
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">{props.filteredCount} records found</div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={props.page === 1}
            onClick={() => props.setPage(props.page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {props.page} of {props.pageCount}
          </span>
          <Button
            variant="outline"
            disabled={props.page === props.pageCount}
            onClick={() => props.setPage(props.page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function GalleryCitiesView({
  cities,
  media,
  dataError,
  onRefresh,
  logActivity,
  setConfirmAction,
}: {
  cities: GalleryCity[];
  media: GalleryMedia[];
  dataError: string;
  onRefresh: () => Promise<void>;
  logActivity: (action: string) => Promise<void>;
  setConfirmAction: (
    value: { title: string; description: string; action: () => Promise<void> } | null,
  ) => void;
}) {
  const [editingCity, setEditingCity] = useState<GalleryCity | null>(null);
  const [cityForm, setCityForm] = useState<GalleryCityForm>(emptyCityForm(cities.length + 1));
  const [editingMedia, setEditingMedia] = useState<GalleryMedia | null>(null);
  const [mediaForm, setMediaForm] = useState<GalleryMediaForm>(emptyMediaForm(cities[0]?.id ?? ""));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!mediaForm.city_id && cities[0]?.id) {
      setMediaForm((current) => ({ ...current, city_id: cities[0].id }));
    }
  }, [cities, mediaForm.city_id]);

  const resetCityForm = () => {
    setEditingCity(null);
    setCityForm(emptyCityForm(cities.length + 1));
  };

  const resetMediaForm = () => {
    setEditingMedia(null);
    setMediaForm(emptyMediaForm(cities[0]?.id ?? ""));
  };

  const saveCity = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = cityForm.name.trim();
    const slug = slugify(cityForm.slug || name);
    if (!name || !slug) {
      toast.error("City name and slug are required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        slug,
        display_order: Number(cityForm.display_order) || 0,
        is_active: cityForm.is_active,
        updated_at: new Date().toISOString(),
      };
      const result = editingCity
        ? await supabase
            .from("gallery_cities")
            .update(payload as never)
            .eq("id", editingCity.id)
        : await supabase.from("gallery_cities").insert(payload as never);

      if (result.error) throw result.error;
      await logActivity(
        editingCity ? `Updated gallery city ${name}` : `Added gallery city ${name}`,
      );
      toast.success(editingCity ? "Gallery city updated" : "Gallery city added");
      resetCityForm();
      await onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save gallery city.");
    } finally {
      setSaving(false);
    }
  };

  const saveMedia = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!mediaForm.title.trim() || !mediaForm.city_id || !mediaForm.media_url.trim()) {
      toast.error("Media title, city, and media URL are required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: mediaForm.title.trim(),
        city_id: mediaForm.city_id,
        media_type: mediaForm.media_type,
        category: mediaForm.category.trim() || "Photos",
        media_url: mediaForm.media_url.trim(),
        thumbnail_url: mediaForm.thumbnail_url.trim() || null,
        description: mediaForm.description.trim() || null,
        display_order: Number(mediaForm.display_order) || 0,
        is_active: mediaForm.is_active,
        updated_at: new Date().toISOString(),
      };
      const result = editingMedia
        ? await supabase
            .from("gallery_media")
            .update(payload as never)
            .eq("id", editingMedia.id)
        : await supabase.from("gallery_media").insert(payload as never);

      if (result.error) throw result.error;
      await logActivity(
        editingMedia
          ? `Updated gallery media ${payload.title}`
          : `Added gallery media ${payload.title}`,
      );
      toast.success(editingMedia ? "Gallery media updated" : "Gallery media added");
      resetMediaForm();
      await onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save gallery media.");
    } finally {
      setSaving(false);
    }
  };

  const toggleCity = async (city: GalleryCity) => {
    const { error } = await supabase
      .from("gallery_cities")
      .update({ is_active: !city.is_active, updated_at: new Date().toISOString() } as never)
      .eq("id", city.id);
    if (error) return toast.error(error.message);
    await logActivity(`${city.is_active ? "Disabled" : "Enabled"} gallery city ${city.name}`);
    toast.success(city.is_active ? "City disabled" : "City enabled");
    await onRefresh();
  };

  const deleteCity = async (city: GalleryCity) => {
    const { error } = await supabase.from("gallery_cities").delete().eq("id", city.id);
    if (error) throw error;
    await logActivity(`Deleted gallery city ${city.name}`);
    toast.success("Gallery city deleted");
    await onRefresh();
  };

  const deleteMedia = async (item: GalleryMedia) => {
    const { error } = await supabase.from("gallery_media").delete().eq("id", item.id);
    if (error) throw error;
    await logActivity(`Deleted gallery media ${item.title}`);
    toast.success("Gallery media deleted");
    await onRefresh();
  };

  const mediaCount = (cityId: string) => media.filter((item) => item.city_id === cityId).length;

  return (
    <div className="space-y-6">
      {dataError && (
        <div className="rounded-2xl border border-primary/25 bg-primary/10 p-4 text-sm text-muted-foreground">
          Gallery database tables are not ready yet. Review and run the gallery SQL migration, then
          refresh. Supabase said: {dataError}
        </div>
      )}

      <Panel title="Gallery Cities">
        <form
          onSubmit={saveCity}
          className="mb-6 grid gap-3 lg:grid-cols-[1fr_1fr_120px_140px_auto]"
        >
          <input
            value={cityForm.name}
            onChange={(event) => {
              const name = event.target.value;
              setCityForm((current) => ({
                ...current,
                name,
                slug: editingCity ? current.slug : slugify(name),
              }));
            }}
            placeholder="City name"
            className="rounded-xl border border-border bg-background/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            value={cityForm.slug}
            onChange={(event) =>
              setCityForm((current) => ({ ...current, slug: slugify(event.target.value) }))
            }
            placeholder="city-slug"
            className="rounded-xl border border-border bg-background/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            value={cityForm.display_order}
            onChange={(event) =>
              setCityForm((current) => ({ ...current, display_order: event.target.value }))
            }
            placeholder="Order"
            inputMode="numeric"
            className="rounded-xl border border-border bg-background/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <label className="flex items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2.5 text-sm">
            <input
              type="checkbox"
              checked={cityForm.is_active}
              onChange={(event) =>
                setCityForm((current) => ({ ...current, is_active: event.target.checked }))
              }
            />
            Active
          </label>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              <Plus className="h-4 w-4" />
              {editingCity ? "Update" : "Add"}
            </Button>
            {editingCity && (
              <Button type="button" variant="outline" onClick={resetCityForm}>
                Cancel
              </Button>
            )}
          </div>
        </form>

        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">City</th>
                <th className="px-4 py-3 text-left">Slug</th>
                <th className="px-4 py-3 text-left">Order</th>
                <th className="px-4 py-3 text-left">Media Items</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cities.map((city) => (
                <tr key={city.id} className="border-t border-border/60">
                  <td className="px-4 py-3 font-medium">{city.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{city.slug}</td>
                  <td className="px-4 py-3">{city.display_order}</td>
                  <td className="px-4 py-3">{mediaCount(city.id)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs",
                        city.is_active
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {city.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <IconButton
                        label="Edit city"
                        icon={Pencil}
                        onClick={() => {
                          setEditingCity(city);
                          setCityForm(cityToForm(city));
                        }}
                      />
                      <IconButton
                        label={city.is_active ? "Disable city" : "Enable city"}
                        icon={RefreshCcw}
                        onClick={() => toggleCity(city)}
                      />
                      <IconButton
                        label="Delete city"
                        icon={Trash2}
                        danger
                        onClick={() =>
                          setConfirmAction({
                            title: "Delete gallery city?",
                            description:
                              "This removes the city record only. Media files and media records are preserved.",
                            action: () => deleteCity(city),
                          })
                        }
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {cities.length === 0 && <EmptyState text="No gallery cities have been added yet." />}
        </div>
      </Panel>

      <Panel title="Gallery Media Management">
        <form onSubmit={saveMedia} className="mb-6 grid gap-3 xl:grid-cols-2">
          <input
            value={mediaForm.title}
            onChange={(event) =>
              setMediaForm((current) => ({ ...current, title: event.target.value }))
            }
            placeholder="Media title"
            className="rounded-xl border border-border bg-background/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <select
            value={mediaForm.city_id}
            onChange={(event) =>
              setMediaForm((current) => ({ ...current, city_id: event.target.value }))
            }
            className="rounded-xl border border-border bg-background/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select city</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
          <select
            value={mediaForm.media_type}
            onChange={(event) =>
              setMediaForm((current) => ({
                ...current,
                media_type: event.target.value as "photo" | "video",
              }))
            }
            className="rounded-xl border border-border bg-background/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="photo">Photo</option>
            <option value="video">Video</option>
          </select>
          <input
            value={mediaForm.category}
            onChange={(event) =>
              setMediaForm((current) => ({ ...current, category: event.target.value }))
            }
            placeholder="Category, e.g. Winners"
            className="rounded-xl border border-border bg-background/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            value={mediaForm.media_url}
            onChange={(event) =>
              setMediaForm((current) => ({ ...current, media_url: event.target.value }))
            }
            placeholder="Image or video URL"
            className="rounded-xl border border-border bg-background/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            value={mediaForm.thumbnail_url}
            onChange={(event) =>
              setMediaForm((current) => ({ ...current, thumbnail_url: event.target.value }))
            }
            placeholder="Optional video thumbnail URL"
            className="rounded-xl border border-border bg-background/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            value={mediaForm.display_order}
            onChange={(event) =>
              setMediaForm((current) => ({ ...current, display_order: event.target.value }))
            }
            placeholder="Display order"
            inputMode="numeric"
            className="rounded-xl border border-border bg-background/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <label className="flex items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2.5 text-sm">
            <input
              type="checkbox"
              checked={mediaForm.is_active}
              onChange={(event) =>
                setMediaForm((current) => ({ ...current, is_active: event.target.checked }))
              }
            />
            Active
          </label>
          <textarea
            value={mediaForm.description}
            onChange={(event) =>
              setMediaForm((current) => ({ ...current, description: event.target.value }))
            }
            placeholder="Description"
            rows={3}
            className="rounded-xl border border-border bg-background/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring xl:col-span-2"
          />
          <div className="flex gap-2 xl:col-span-2">
            <Button type="submit" disabled={saving || cities.length === 0}>
              {editingMedia ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingMedia ? "Update Gallery Item" : "Add Gallery Item"}
            </Button>
            {editingMedia && (
              <Button type="button" variant="outline" onClick={resetMediaForm}>
                Cancel
              </Button>
            )}
          </div>
        </form>

        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Media</th>
                <th className="px-4 py-3 text-left">City</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Order</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {media.map((item) => {
                const city = cities.find((entry) => entry.id === item.city_id);
                return (
                  <tr key={item.id} className="border-t border-border/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                          {item.media_type === "video" ? (
                            <Film className="h-4 w-4" />
                          ) : (
                            <ImageIcon className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{item.title}</div>
                          <div className="max-w-xs truncate text-xs text-muted-foreground">
                            {item.media_url}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{city?.name ?? "Unassigned"}</td>
                    <td className="px-4 py-3 capitalize">{item.media_type}</td>
                    <td className="px-4 py-3">{item.category}</td>
                    <td className="px-4 py-3">{item.display_order}</td>
                    <td className="px-4 py-3">{item.is_active ? "Active" : "Inactive"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <IconButton
                          label="Edit gallery item"
                          icon={Pencil}
                          onClick={() => {
                            setEditingMedia(item);
                            setMediaForm(mediaToForm(item));
                          }}
                        />
                        <IconButton
                          label="Delete gallery item"
                          icon={Trash2}
                          danger
                          onClick={() =>
                            setConfirmAction({
                              title: "Delete gallery item?",
                              description:
                                "This removes the media record only. It does not delete files from Supabase Storage.",
                              action: () => deleteMedia(item),
                            })
                          }
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {media.length === 0 && <EmptyState text="No gallery media items have been added yet." />}
        </div>
      </Panel>
    </div>
  );
}

function ConcertInformationView({
  settings,
  artists,
  dataError,
  onRefresh,
  logActivity,
  setConfirmAction,
}: {
  settings: ConcertSettingsRecord | null;
  artists: ConcertArtistRecord[];
  dataError: string;
  onRefresh: () => Promise<void>;
  logActivity: (action: string) => Promise<void>;
  setConfirmAction: (
    value: { title: string; description: string; action: () => Promise<void> } | null,
  ) => void;
}) {
  const [form, setForm] = useState({
    eyebrow: "Live Concert",
    title: "Concert Information",
    subtitle: "",
    event_label: "Grand Finale",
    event_title: "Telent Fest Grand Finale",
    venue: "",
    event_date: "",
    start_time: "",
    price_text: "",
    button_text: "Entry Pass",
    button_url: "/entry-pass",
    map_url: "",
    map_embed_url: "",
    is_published: true,
  });
  const [artistForm, setArtistForm] = useState({
    artist_name: "",
    performance_type: "",
    description: "",
    display_order: "0",
    is_active: true,
  });
  const [editingArtist, setEditingArtist] = useState<ConcertArtistRecord | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setForm({
      eyebrow: settings.eyebrow ?? "",
      title: settings.title ?? "",
      subtitle: settings.subtitle ?? "",
      event_label: settings.event_label ?? "",
      event_title: settings.event_title ?? "",
      venue: settings.venue ?? "",
      event_date: settings.event_date ?? "",
      start_time: settings.start_time ?? "",
      price_text: settings.price_text ?? "",
      button_text: settings.button_text ?? "",
      button_url: settings.button_url ?? "/entry-pass",
      map_url: settings.map_url ?? "",
      map_embed_url: settings.map_embed_url ?? "",
      is_published: settings.is_published ?? true,
    });
  }, [settings]);

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.event_title.trim())
      return toast.error("Concert section title and event title are required.");
    setSaving(true);
    try {
      const payload = {
        ...form,
        event_date: form.event_date || null,
        start_time: form.start_time || null,
        map_embed_url: normalizeMapEmbed(form.map_embed_url || form.map_url),
        updated_at: new Date().toISOString(),
      };
      const db = supabase as any;
      const result = settings
        ? await db.from("concert_settings").update(payload).eq("id", settings.id)
        : await db.from("concert_settings").insert(payload);
      if (result.error) throw result.error;
      await logActivity("Updated concert information");
      toast.success("Concert information saved");
      await onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save concert information.");
    } finally {
      setSaving(false);
    }
  };

  const saveArtist = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!artistForm.artist_name.trim()) return toast.error("Artist name is required.");
    setSaving(true);
    try {
      const payload = {
        artist_name: artistForm.artist_name.trim(),
        performance_type: artistForm.performance_type.trim(),
        description: artistForm.description.trim() || null,
        display_order: Number(artistForm.display_order) || 0,
        is_active: artistForm.is_active,
        updated_at: new Date().toISOString(),
      };
      const db = supabase as any;
      const result = editingArtist
        ? await db.from("concert_artists").update(payload).eq("id", editingArtist.id)
        : await db.from("concert_artists").insert(payload);
      if (result.error) throw result.error;
      await logActivity(
        editingArtist
          ? `Updated concert artist ${payload.artist_name}`
          : `Added concert artist ${payload.artist_name}`,
      );
      toast.success(editingArtist ? "Artist updated" : "Artist added");
      setEditingArtist(null);
      setArtistForm({
        artist_name: "",
        performance_type: "",
        description: "",
        display_order: "0",
        is_active: true,
      });
      await onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save artist.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {dataError && (
        <div className="rounded-2xl border border-primary/25 bg-primary/10 p-4 text-sm text-muted-foreground">
          Concert database tables are not ready yet. Run the latest migration, then refresh.
          Supabase said: {dataError}
        </div>
      )}
      <Panel title="Concert Information">
        <form onSubmit={saveSettings} className="grid gap-3 lg:grid-cols-2">
          {(
            [
              ["eyebrow", "Eyebrow label"],
              ["title", "Section heading"],
              ["subtitle", "Section subtitle"],
              ["event_label", "Event label"],
              ["event_title", "Event title"],
              ["venue", "Venue"],
              ["price_text", "Price or seats text"],
              ["button_text", "Button text"],
              ["button_url", "Button URL"],
              ["map_url", "Map URL"],
              ["map_embed_url", "Map embed URL"],
            ] as const
          ).map(([key, placeholder]) => (
            <input
              key={key}
              value={form[key]}
              onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.value }))}
              placeholder={placeholder}
              className="field-input"
            />
          ))}
          <input
            type="date"
            value={form.event_date}
            onChange={(e) => setForm((current) => ({ ...current, event_date: e.target.value }))}
            className="field-input"
          />
          <input
            type="time"
            value={form.start_time}
            onChange={(e) => setForm((current) => ({ ...current, start_time: e.target.value }))}
            className="field-input"
          />
          <label className="flex items-center gap-2 field-input cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) =>
                setForm((current) => ({ ...current, is_published: e.target.checked }))
              }
            />
            Published on website
          </label>
          <div className="lg:col-span-2">
            <Button type="submit" disabled={saving}>
              {settings ? "Update Concert Info" : "Create Concert Info"}
            </Button>
          </div>
        </form>
      </Panel>

      <Panel title="Artist Lineup">
        <form
          onSubmit={saveArtist}
          className="mb-5 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_100px_140px_auto]"
        >
          <input
            value={artistForm.artist_name}
            onChange={(e) => setArtistForm((f) => ({ ...f, artist_name: e.target.value }))}
            placeholder="Artist name"
            className="field-input"
          />
          <input
            value={artistForm.performance_type}
            onChange={(e) => setArtistForm((f) => ({ ...f, performance_type: e.target.value }))}
            placeholder="Performance type"
            className="field-input"
          />
          <input
            value={artistForm.description}
            onChange={(e) => setArtistForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Short description"
            className="field-input"
          />
          <input
            value={artistForm.display_order}
            onChange={(e) => setArtistForm((f) => ({ ...f, display_order: e.target.value }))}
            placeholder="Order"
            className="field-input"
            inputMode="numeric"
          />
          <label className="flex items-center gap-2 field-input cursor-pointer">
            <input
              type="checkbox"
              checked={artistForm.is_active}
              onChange={(e) => setArtistForm((f) => ({ ...f, is_active: e.target.checked }))}
            />{" "}
            Active
          </label>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {editingArtist ? "Update" : "Add"}
            </Button>
            {editingArtist && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingArtist(null);
                  setArtistForm({
                    artist_name: "",
                    performance_type: "",
                    description: "",
                    display_order: "0",
                    is_active: true,
                  });
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Artist</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Order</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {artists.map((artist) => (
                <tr key={artist.id} className="border-t border-border/60">
                  <td className="px-4 py-3 font-medium">{artist.artist_name}</td>
                  <td className="px-4 py-3">{artist.performance_type}</td>
                  <td className="px-4 py-3">{artist.display_order}</td>
                  <td className="px-4 py-3">{artist.is_active ? "Active" : "Hidden"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <IconButton
                        label="Edit artist"
                        icon={Pencil}
                        onClick={() => {
                          setEditingArtist(artist);
                          setArtistForm({
                            artist_name: artist.artist_name,
                            performance_type: artist.performance_type ?? "",
                            description: artist.description ?? "",
                            display_order: String(artist.display_order),
                            is_active: artist.is_active,
                          });
                        }}
                      />
                      <IconButton
                        label="Delete artist"
                        icon={Trash2}
                        danger
                        onClick={() =>
                          setConfirmAction({
                            title: "Delete artist?",
                            description: "This removes the artist from the public lineup.",
                            action: async () => {
                              const result = await (supabase as any)
                                .from("concert_artists")
                                .delete()
                                .eq("id", artist.id);
                              if (result.error) throw result.error;
                              await logActivity(`Deleted concert artist ${artist.artist_name}`);
                              toast.success("Artist deleted");
                              await onRefresh();
                            },
                          })
                        }
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {artists.length === 0 && <EmptyState text="No artists have been added yet." />}
        </div>
      </Panel>
    </div>
  );
}

function BlogPostsView({
  posts,
  dataError,
  onRefresh,
  logActivity,
  setConfirmAction,
}: {
  posts: BlogPostRecord[];
  dataError: string;
  onRefresh: () => Promise<void>;
  logActivity: (action: string) => Promise<void>;
  setConfirmAction: (
    value: { title: string; description: string; action: () => Promise<void> } | null,
  ) => void;
}) {
  const [editingPost, setEditingPost] = useState<BlogPostRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    category: "Updates",
    thumbnail_url: "",
    thumbnail_alt: "",
    status: "draft" as "draft" | "published",
    published_at: "",
    is_featured: false,
    display_order: "0",
  });

  const resetForm = () => {
    setEditingPost(null);
    setForm({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      category: "Updates",
      thumbnail_url: "",
      thumbnail_alt: "",
      status: "draft",
      published_at: "",
      is_featured: false,
      display_order: "0",
    });
  };

  const savePost = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) return toast.error("Blog title is required.");
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        slug: slugify(form.slug || form.title),
        excerpt: form.excerpt.trim(),
        content: form.content.trim(),
        category: form.category.trim() || "Updates",
        thumbnail_url: form.thumbnail_url.trim() || null,
        thumbnail_alt: form.thumbnail_alt.trim() || form.title.trim(),
        status: form.status,
        published_at: form.published_at || new Date().toISOString(),
        is_featured: form.is_featured,
        display_order: Number(form.display_order) || 0,
        updated_at: new Date().toISOString(),
      };
      const db = supabase as any;
      const result = editingPost
        ? await db.from("blog_posts").update(payload).eq("id", editingPost.id)
        : await db.from("blog_posts").insert(payload);
      if (result.error) throw result.error;
      await logActivity(
        editingPost ? `Updated blog post ${payload.title}` : `Created blog post ${payload.title}`,
      );
      toast.success(editingPost ? "Blog post updated" : "Blog post created");
      resetForm();
      await onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save blog post.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {dataError && (
        <div className="rounded-2xl border border-primary/25 bg-primary/10 p-4 text-sm text-muted-foreground">
          Blog database table is not ready yet. Run the latest migration, then refresh. Supabase
          said: {dataError}
        </div>
      )}
      <Panel title="Blog Management">
        <form onSubmit={savePost} className="mb-6 grid gap-3 lg:grid-cols-2">
          <input
            value={form.title}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                title: e.target.value,
                slug: editingPost ? f.slug : slugify(e.target.value),
              }))
            }
            placeholder="Blog title"
            className="field-input"
          />
          <input
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
            placeholder="blog-slug"
            className="field-input"
          />
          <input
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            placeholder="Category"
            className="field-input"
          />
          <input
            value={form.thumbnail_url}
            onChange={(e) => setForm((f) => ({ ...f, thumbnail_url: e.target.value }))}
            placeholder="Thumbnail image URL"
            className="field-input"
          />
          <input
            value={form.thumbnail_alt}
            onChange={(e) => setForm((f) => ({ ...f, thumbnail_alt: e.target.value }))}
            placeholder="Thumbnail alt text"
            className="field-input"
          />
          <input
            value={form.published_at}
            onChange={(e) => setForm((f) => ({ ...f, published_at: e.target.value }))}
            type="date"
            className="field-input"
          />
          <textarea
            value={form.excerpt}
            onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
            placeholder="Excerpt"
            rows={3}
            className="field-input lg:col-span-2"
          />
          <textarea
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            placeholder="Full blog content"
            rows={6}
            className="field-input lg:col-span-2"
          />
          <select
            value={form.status}
            onChange={(e) =>
              setForm((f) => ({ ...f, status: e.target.value as "draft" | "published" }))
            }
            className="field-input"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
          <label className="flex items-center gap-2 field-input cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_featured}
              onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))}
            />{" "}
            Featured
          </label>
          <div className="flex gap-2 lg:col-span-2">
            <Button type="submit" disabled={saving}>
              {editingPost ? "Update Blog Post" : "Create Blog Post"}
            </Button>
            {editingPost && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </form>
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Post</th>
                <th className="px-4 py-3 text-left">Thumbnail</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Published</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-t border-border/60">
                  <td className="px-4 py-3">
                    <div className="font-medium">{post.title}</div>
                    <div className="text-xs text-muted-foreground">/blog/{post.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    {post.thumbnail_url ? (
                      <img
                        src={post.thumbnail_url}
                        alt={post.thumbnail_alt ?? post.title}
                        className="h-12 w-20 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="text-muted-foreground">No thumbnail</span>
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize">{post.status}</td>
                  <td className="px-4 py-3 text-xs">
                    {post.published_at ? formatDateTime(post.published_at) : "Not published"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <IconButton
                        label="Edit post"
                        icon={Pencil}
                        onClick={() => {
                          setEditingPost(post);
                          setForm({
                            title: post.title,
                            slug: post.slug,
                            excerpt: post.excerpt,
                            content: post.content,
                            category: post.category,
                            thumbnail_url: post.thumbnail_url ?? "",
                            thumbnail_alt: post.thumbnail_alt ?? "",
                            status: post.status,
                            published_at: post.published_at?.slice(0, 10) ?? "",
                            is_featured: post.is_featured,
                            display_order: String(post.display_order),
                          });
                        }}
                      />
                      <IconButton
                        label="Delete post"
                        icon={Trash2}
                        danger
                        onClick={() =>
                          setConfirmAction({
                            title: "Delete blog post?",
                            description:
                              "This permanently removes the post from the public website.",
                            action: async () => {
                              const result = await (supabase as any)
                                .from("blog_posts")
                                .delete()
                                .eq("id", post.id);
                              if (result.error) throw result.error;
                              await logActivity(`Deleted blog post ${post.title}`);
                              toast.success("Blog post deleted");
                              await onRefresh();
                            },
                          })
                        }
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {posts.length === 0 && <EmptyState text="No blog posts have been created yet." />}
        </div>
      </Panel>
    </div>
  );
}

function normalizeMapEmbed(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.includes("/embed") || trimmed.includes("output=embed")) return trimmed;
  try {
    const url = new URL(trimmed);
    return `https://maps.google.com/maps?q=${encodeURIComponent(url.searchParams.get("q") || trimmed)}&z=14&output=embed`;
  } catch {
    return `https://maps.google.com/maps?q=${encodeURIComponent(trimmed)}&z=14&output=embed`;
  }
}

function ScannerView({
  result,
  setResult,
  adminUserId,
  onCheckIn,
}: {
  result: ScannerResult;
  setResult: (result: ScannerResult) => void;
  adminUserId: string;
  onCheckIn: (pass: PublicEntryPass) => void;
}) {
  const scannerRef = useRef<{
    clear: () => Promise<void>;
    render: (onSuccess: (decodedText: string) => void, onError: () => void) => void;
  } | null>(null);
  const [running, setRunning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [scanningFile, setScanningFile] = useState(false);

  useEffect(() => {
    return () => {
      void scannerRef.current?.clear();
    };
  }, []);

  const startScanner = async () => {
    try {
      const { Html5QrcodeScanner } = await import("html5-qrcode");
      scannerRef.current = new Html5QrcodeScanner(
        "admin-qr-scanner",
        { fps: 10, qrbox: { width: 260, height: 260 }, rememberLastUsedCamera: true },
        false,
      );
      scannerRef.current.render(
        async (decodedText: string) => {
          await scannerRef.current?.clear();
          setRunning(false);
          await validateScannedCode(decodedText, setResult, adminUserId);
        },
        () => undefined,
      );
      setRunning(true);
    } catch (error) {
      setResult({
        state: "error",
        message: error instanceof Error ? error.message : "Unable to start camera scanner.",
      });
    }
  };

  const stopScanner = async () => {
    await scannerRef.current?.clear();
    scannerRef.current = null;
    setRunning(false);
  };

  const scanUploadedFile = async (file?: File | null) => {
    if (!file) return;
    setScanningFile(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("admin-qr-file-reader");
      const decoded = await scanner.scanFile(file, true);
      await scanner.clear().catch(() => undefined);
      await validateScannedCode(decoded, setResult, adminUserId);
    } catch (error) {
      setResult({
        state: "error",
        message: error instanceof Error ? error.message : "Unable to read a QR code from this image.",
      });
    } finally {
      setScanningFile(false);
    }
  };

  const validateManualCode = async () => {
    if (!manualCode.trim()) {
      setResult({ state: "invalid", message: "Paste a QR code value or verification URL first." });
      return;
    }
    await validateScannedCode(manualCode, setResult, adminUserId);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <Panel title="QR Code Scanner">
        <div
          id="admin-qr-scanner"
          className="grid min-h-[320px] place-items-center overflow-hidden rounded-2xl border border-border/60 bg-background/50 p-3 text-center text-sm text-muted-foreground"
        >
          {!running && <span>Start the camera scanner, upload a QR image, or paste a QR value.</span>}
        </div>
        <div id="admin-qr-file-reader" className="hidden" />
        <div className="mt-4 flex flex-wrap gap-3">
          {!running ? (
            <Button className="gradient-primary text-primary-foreground border-0" onClick={startScanner}>
              <ScanLine className="h-4 w-4" />
              Start Scanner
            </Button>
          ) : (
            <Button variant="outline" onClick={stopScanner}>
              <X className="h-4 w-4" />
              Stop Scanner
            </Button>
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background/70 px-4 py-2 text-sm transition hover:border-primary/60">
            <QrCode className="h-4 w-4 text-primary" />
            {scanningFile ? "Reading QR..." : "Upload QR Image"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={scanningFile}
              onChange={(event) => void scanUploadedFile(event.target.files?.[0])}
            />
          </label>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={manualCode}
            onChange={(event) => setManualCode(event.target.value)}
            placeholder="Paste QR JSON, verification URL, token, or pass number"
            className="field-input flex-1"
          />
          <Button variant="outline" onClick={validateManualCode}>
            Verify
          </Button>
        </div>
      </Panel>
      <Panel title="Scanner Result">
        <ScannerResultCard result={result} onCheckIn={onCheckIn} />
      </Panel>
    </div>
  );
}

async function validateScannedCode(
  decodedText: string,
  setResult: (result: ScannerResult) => void,
  adminUserId: string,
) {
  if (adminUserId) {
    try {
      const result = await verifyAdminQr({ data: { adminUserId, code: decodedText } });
      setResult(result as ScannerResult);
      return;
    } catch (error) {
      setResult({
        state: "error",
        message: error instanceof Error ? error.message : "Unable to verify this QR code.",
      });
      return;
    }
  }

  const parsed = parseQrValue(decodedText);

  // Try new passes table first
  if (parsed.id) {
    const { data: newPass } = await supabase
      .from("passes")
      .select(
        "id, pass_number, pass_type, status, checked_in, checked_in_at, registration_id, secure_qr_token",
      )
      .eq("id", parsed.id)
      .maybeSingle();

    if (newPass) {
      const p = newPass as any;
      if (p.secure_qr_token && p.secure_qr_token !== (parsed as any).token) {
        setResult({ state: "invalid", message: "Invalid QR Code. Token mismatch." });
        return;
      }
      const { data: reg } = await supabase
        .from("registrations")
        .select(
          "full_name, email, phone, event_id, registration_number, payment_status, activity_category_id",
        )
        .eq("id", p.registration_id)
        .single();

      const event = reg
        ? await supabase
            .from("events")
            .select("name, city")
            .eq("id", (reg as any).event_id)
            .single()
            .then((r) => r.data as any)
        : null;
      const paymentResult = await (supabase as any)
        .from("payments")
        .select("provider, payment_mode, status, transaction_id, order_id")
        .eq("registration_id", p.registration_id)
        .order("created_at", { ascending: false })
        .limit(1);
      const payment = paymentResult.data?.[0] ?? null;
      let activityCategory = "";
      if ((reg as any)?.activity_category_id) {
        const { data: cat } = await supabase
          .from("activity_categories")
          .select("name")
          .eq("id", (reg as any).activity_category_id)
          .single();
        activityCategory = (cat as any)?.name || "";
      }

      const pass: PublicEntryPass = {
        id: p.id,
        participant_name: (reg as any)?.full_name || "Unknown",
        event_name: event?.name || "",
        event_city: event?.city || null,
        entry_number: p.pass_number,
        created_at: p.generated_at || p.created_at,
        checked_in: p.checked_in,
        checked_in_at: p.checked_in_at,
        pass_status: p.status,
        status: p.status,
        pass_type: p.pass_type,
        registration_number: (reg as any)?.registration_number || null,
        payment_status: payment?.status || (reg as any)?.payment_status || null,
        payment_mode: payment?.payment_mode || (payment?.provider === "dummy" ? "test" : null),
        payment_provider: payment?.provider || null,
        transaction_id: payment?.transaction_id || null,
        order_id: payment?.order_id || null,
        activity_category: activityCategory || null,
        email: (reg as any)?.email || null,
        phone: (reg as any)?.phone || null,
        qr_value: decodedText,
      };

      if (p.status === "revoked") {
        setResult({
          state: "revoked",
          message: "Pass Revoked. This pass has been revoked and cannot be used for entry.",
          pass,
        });
        return;
      }
      if (p.checked_in) {
        setResult({
          state: "checked_in",
          message: `Already Checked In at ${formatDateTime(p.checked_in_at)}`,
          pass,
        });
        return;
      }
      if (pass.payment_status !== "paid") {
        setResult({ state: "invalid", message: "Payment is not paid for this pass.", pass });
        return;
      }
      setResult({
        state: "valid",
        message:
          pass.payment_mode === "test" || pass.payment_provider === "dummy"
            ? "Valid Test Payment Pass. Participant can be checked in."
            : "Valid Pass. Participant can be checked in.",
        pass,
      });
      return;
    }
  }

  // Fallback to old public_entry_passes table
  let query = supabase
    .from("public_entry_passes")
    .select(
      "id, participant_name, event_name, entry_number, qr_value, email, phone, created_at, checked_in, checked_in_at, pass_status, status, updated_at",
    )
    .limit(1);

  query = parsed.id
    ? query.eq("id", parsed.id)
    : query.eq("entry_number", parsed.entryNumber || decodedText);
  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    setResult({
      state: "invalid",
      message: "Invalid Talent Fest Pass. This QR code could not be verified.",
    });
    return;
  }

  const pass = normalizePass(data as unknown as PublicEntryPass);
  if (isRevoked(pass)) {
    setResult({
      state: "revoked",
      message: "Pass Revoked. This pass has been revoked and cannot be used for entry.",
      pass,
    });
    return;
  }
  if (isCheckedIn(pass)) {
    setResult({
      state: "checked_in",
      message: `Already Checked In at ${formatDateTime(pass.checked_in_at)}`,
      pass,
    });
    return;
  }
  setResult({ state: "valid", message: "Valid Pass. Participant can be checked in.", pass });
}

function ScannerResultCard({
  result,
  onCheckIn,
}: {
  result: ScannerResult;
  onCheckIn: (pass: PublicEntryPass) => void;
}) {
  const tone =
    result.state === "valid"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : result.state === "checked_in"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
        : result.state === "revoked" || result.state === "invalid"
          ? "border-red-500/40 bg-red-500/10 text-red-300"
          : "border-border bg-background/50 text-muted-foreground";

  return (
    <div className={cn("rounded-2xl border p-5", tone)}>
      <div className="font-medium">{result.message}</div>
      {result.pass && (
        <div className="mt-4 space-y-2 text-sm text-foreground">
          <InfoRow label="Participant" value={result.pass.participant_name} />
          <InfoRow
            label="Pass Type"
            value={(result.pass.pass_type ?? "legacy").replace("_", " ")}
          />
          <InfoRow label="Entry Number" value={result.pass.entry_number} />
          <InfoRow label="Event" value={result.pass.event_name} />
          <InfoRow
            label="Payment"
            value={`${result.pass.payment_status ?? "Not tracked"}${result.pass.payment_mode === "test" || result.pass.payment_provider === "dummy" ? " - TEST PAYMENT" : ""}`}
          />
          <InfoRow label="Activity" value={result.pass.activity_category ?? "N/A"} />
          <InfoRow label="Generated" value={formatDateTime(result.pass.created_at)} />
          <InfoRow label="Check-in Time" value={formatDateTime(result.pass.checked_in_at)} />
          {result.state === "valid" && (
            <Button
              className="mt-4 gradient-primary text-primary-foreground border-0"
              onClick={() => onCheckIn(result.pass as PublicEntryPass)}
            >
              Mark Participant Checked In
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function ParticipantsView({
  passes,
  onView,
}: {
  passes: PublicEntryPass[];
  onView: (pass: PublicEntryPass) => void;
}) {
  return (
    <Panel title="Participants">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {passes.map((pass) => (
          <button
            key={pass.id}
            onClick={() => onView(pass)}
            className="rounded-2xl border border-border/60 bg-background/40 p-4 text-left hover:border-primary/40"
          >
            <UserRound className="h-5 w-5 text-primary" />
            <div className="mt-3 font-medium">{pass.participant_name}</div>
            <div className="text-xs text-muted-foreground">{pass.entry_number}</div>
            <div className="mt-3">
              <StatusBadge pass={pass} />
            </div>
          </button>
        ))}
      </div>
      {passes.length === 0 && <EmptyState text="No participant records found." />}
    </Panel>
  );
}

function ReportsView({
  passes,
  filteredPasses,
  onExportAll,
  onExportFiltered,
  onPrint,
}: {
  passes: PublicEntryPass[];
  filteredPasses: PublicEntryPass[];
  onExportAll: () => void;
  onExportFiltered: () => void;
  onPrint: () => void;
}) {
  const byDay = useMemo(() => dailyStats(passes, "created_at"), [passes]);
  const checkInsByDay = useMemo(
    () => dailyStats(passes.filter(isCheckedIn), "checked_in_at"),
    [passes],
  );
  const reportCards = [
    [
      "Total registrations",
      new Set(passes.map((p) => p.registration_number).filter(Boolean)).size || passes.length,
    ],
    ["Participant passes", passes.filter((p) => p.pass_type === "participant").length],
    ["Visitor passes", passes.filter((p) => p.pass_type === "visitor").length],
    [
      "Guest passes",
      passes.filter((p) => p.pass_type === "guest_1" || p.pass_type === "guest_2").length,
    ],
    [
      "Test-mode paid",
      passes.filter(
        (p) =>
          p.payment_status === "paid" &&
          (p.payment_mode === "test" || p.payment_provider === "dummy"),
      ).length,
    ],
    [
      "Pending payments",
      passes.filter((p) => p.payment_status === "pending" || !p.payment_status).length,
    ],
    ["Active passes", passes.filter((p) => !isRevoked(p) && !isCheckedIn(p)).length],
    ["Checked-in passes", passes.filter(isCheckedIn).length],
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Panel title="Admin Summary">
        <div className="grid gap-3 sm:grid-cols-2">
          {reportCards.map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-xl border border-border/50 bg-background/40 p-4"
            >
              <div className="text-2xl font-semibold text-primary">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Exports and Reports">
        <div className="grid gap-3 sm:grid-cols-2">
          <Button onClick={onExportAll}>
            <Download className="h-4 w-4" /> Export all CSV
          </Button>
          <Button variant="outline" onClick={onExportFiltered}>
            <Download className="h-4 w-4" /> Export filtered CSV
          </Button>
          <Button variant="outline" onClick={() => downloadParticipantReport(filteredPasses)}>
            <FileText className="h-4 w-4" /> Download participant report
          </Button>
          <Button variant="outline" onClick={onPrint}>
            <Printer className="h-4 w-4" /> Print participant list
          </Button>
        </div>
      </Panel>
      <Panel title="Daily Statistics">
        <StatsList title="Entry-pass generation" rows={byDay} />
        <div className="mt-6">
          <StatsList title="Check-ins" rows={checkInsByDay} />
        </div>
      </Panel>
    </div>
  );
}

function SettingsView({ adminEmail }: { adminEmail: string }) {
  return (
    <Panel title="Admin Settings">
      <div className="space-y-4 text-sm">
        <InfoRow label="Current admin" value={adminEmail || "Unknown"} />
        <InfoRow label="Access model" value="Supabase Auth plus user_roles.role = admin" />
        <InfoRow
          label="Database protection"
          value="Use the provided SQL to enable RLS policies for admin-only access."
        />
      </div>
    </Panel>
  );
}

function PassDetailsDialog({
  pass,
  onOpenChange,
  onDownload,
  onPrint,
  qrRef,
}: {
  pass: PublicEntryPass | null;
  onOpenChange: (open: boolean) => void;
  onDownload: (pass: PublicEntryPass) => void;
  onPrint: (pass: PublicEntryPass) => void;
  qrRef: React.RefObject<HTMLCanvasElement>;
}) {
  return (
    <Dialog open={!!pass} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        {pass && (
          <>
            <DialogHeader>
              <DialogTitle>Complete Entry Pass</DialogTitle>
              <DialogDescription>Participant details and scannable QR preview.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 md:grid-cols-[1fr_auto]">
              <div className="space-y-3 text-sm">
                <InfoRow label="Participant name" value={pass.participant_name} />
                {pass.linked_participant_name && (
                  <InfoRow label="Linked participant" value={pass.linked_participant_name} />
                )}
                <InfoRow label="Event name" value={pass.event_name} />
                <InfoRow label="Event city" value={pass.event_city ?? "N/A"} />
                <InfoRow label="Event date" value={pass.event_date ?? "N/A"} />
                <InfoRow label="Event time" value={pass.event_time ?? "N/A"} />
                <InfoRow label="Venue" value={pass.venue ?? "N/A"} />
                <InfoRow label="Pass type" value={(pass.pass_type ?? "legacy").replace("_", " ")} />
                <InfoRow label="Registration number" value={pass.registration_number ?? "Legacy"} />
                <InfoRow label="Payment status" value={pass.payment_status ?? "Not tracked"} />
                <InfoRow
                  label="Payment mode"
                  value={
                    pass.payment_mode === "test" || pass.payment_provider === "dummy"
                      ? "TEST PAYMENT"
                      : (pass.payment_mode ?? pass.payment_provider ?? "Not tracked")
                  }
                />
                <InfoRow label="Transaction ID" value={pass.transaction_id ?? "Not tracked"} />
                <InfoRow label="Order ID" value={pass.order_id ?? "Not tracked"} />
                <InfoRow
                  label="Aadhaar"
                  value={
                    pass.aadhaar_last_four ? `XXXX XXXX ${pass.aadhaar_last_four}` : "Not available"
                  }
                />
                <InfoRow label="Activity category" value={pass.activity_category ?? "N/A"} />
                <InfoRow label="Entry number" value={pass.entry_number} />
                <InfoRow label="Generated date" value={formatDateTime(pass.created_at)} />
                <InfoRow
                  label="Check-in status"
                  value={isCheckedIn(pass) ? "Checked in" : "Not checked in"}
                />
                <InfoRow label="Check-in time" value={formatDateTime(pass.checked_in_at)} />
                <InfoRow label="Pass status" value={pass.pass_status ?? pass.status ?? "active"} />
              </div>
              <div className="mx-auto rounded-2xl bg-white p-4">
                <QRCodeCanvas
                  ref={qrRef}
                  value={qrValue(pass)}
                  size={qrRenderSize}
                  marginSize={4}
                  level="M"
                  className="h-[220px] w-[220px]"
                  style={{ width: 220, height: 220, imageRendering: "pixelated" }}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-primary/20 bg-[#101827] p-5 text-center">
              <div className="text-xs uppercase tracking-[0.3em] text-primary">
                Entry Pass Preview
              </div>
              <div className="mt-3 text-2xl font-semibold">{pass.participant_name}</div>
              <div className="mt-1 font-mono text-sm text-primary">{pass.entry_number}</div>
              <div className="mt-2 text-sm text-muted-foreground">{pass.event_name}</div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => onPrint(pass)}>
                <Printer className="h-4 w-4" /> Print
              </Button>
              <Button onClick={() => onDownload(pass)}>
                <Download className="h-4 w-4" /> Download PDF
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function LargeQrDialog({
  pass,
  onOpenChange,
}: {
  pass: PublicEntryPass | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={!!pass} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {pass && (
          <div className="text-center">
            <DialogHeader>
              <DialogTitle>Enlarged QR Code</DialogTitle>
              <DialogDescription>
                {pass.participant_name} - {pass.entry_number}
              </DialogDescription>
            </DialogHeader>
            <div className="mx-auto mt-5 inline-block rounded-2xl bg-white p-5">
              <QRCodeCanvas value={qrValue(pass)} size={320} marginSize={4} level="M" />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDialog({
  confirm,
  setConfirm,
}: {
  confirm: { title: string; description: string; action: () => Promise<void> } | null;
  setConfirm: (value: null) => void;
}) {
  const [loading, setLoading] = useState(false);
  return (
    <Dialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
      <DialogContent>
        {confirm && (
          <>
            <DialogHeader>
              <DialogTitle>{confirm.title}</DialogTitle>
              <DialogDescription>{confirm.description}</DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirm(null)}>
                Cancel
              </Button>
              <Button
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  try {
                    await confirm.action();
                    setConfirm(null);
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Action failed.");
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Confirm
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EventsView({
  events,
  onRefresh,
  logActivity,
  setConfirmAction,
}: {
  events: any[];
  onRefresh: () => Promise<void>;
  logActivity: (action: string) => Promise<void>;
  setConfirmAction: (
    value: { title: string; description: string; action: () => Promise<void> } | null,
  ) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [eventImageFile, setEventImageFile] = useState<File | null>(null);
  const [eventImagePreview, setEventImagePreview] = useState("");
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    city: "",
    city_code: "",
    event_date: "",
    start_time: "",
    venue: "",
    participant_price: "0",
    visitor_price: "0",
    guest_price: "0",
    participant_capacity: "0",
    visitor_capacity: "0",
    guest_capacity: "0",
    maximum_guests_per_participant: "2",
    registration_status: "inactive",
    visitor_registration_enabled: false,
    is_active: true,
    event_image_url: "",
  });

  const resetForm = () => {
    setEditingEvent(null);
    setEventImageFile(null);
    setEventImagePreview("");
    setForm({
      name: "",
      slug: "",
      city: "",
      city_code: "",
      event_date: "",
      start_time: "",
      venue: "",
      participant_price: "0",
      visitor_price: "0",
      guest_price: "0",
      participant_capacity: "0",
      visitor_capacity: "0",
      guest_capacity: "0",
      maximum_guests_per_participant: "2",
      registration_status: "inactive",
      visitor_registration_enabled: false,
      is_active: true,
      event_image_url: "",
    });
  };

  const editEvent = (ev: any) => {
    setEditingEvent(ev);
    setEventImageFile(null);
    setEventImagePreview(ev.event_image_url || "");
    setForm({
      name: ev.name || "",
      slug: ev.slug || "",
      city: ev.city || "",
      city_code: ev.city_code || "",
      event_date: ev.event_date || "",
      start_time: ev.start_time || "",
      venue: ev.venue || "",
      participant_price: String(ev.participant_price || 0),
      visitor_price: String(ev.visitor_price || 0),
      guest_price: String(ev.guest_price || 0),
      participant_capacity: String(ev.participant_capacity || 0),
      visitor_capacity: String(ev.visitor_capacity || 0),
      guest_capacity: String(ev.guest_capacity || 0),
      maximum_guests_per_participant: String(ev.maximum_guests_per_participant || 2),
      registration_status: ev.registration_status || "inactive",
      visitor_registration_enabled: ev.visitor_registration_enabled || false,
      is_active: ev.is_active ?? true,
      event_image_url: ev.event_image_url || "",
    });
  };

  const chooseEventImage = (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a valid image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Event image must be smaller than 8 MB.");
      return;
    }
    setEventImageFile(file);
    const preview = URL.createObjectURL(file);
    setEventImagePreview(preview);
  };

  const uploadEventImage = async (file: File, slug: string) => {
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeSlug = slugify(slug || form.name || "event");
    const path = `${safeSlug}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
    const { error } = await supabase.storage
      .from("event-images")
      .upload(path, file, { cacheControl: "31536000", upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from("event-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const saveEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.city.trim() || !form.city_code.trim()) {
      toast.error("Event name, city, and city code are required.");
      return;
    }
    setSaving(true);
    try {
      const slug = form.slug.trim() || slugify(form.name);
      const uploadedImageUrl = eventImageFile
        ? await uploadEventImage(eventImageFile, slug)
        : form.event_image_url.trim();
      const payload = {
        name: form.name.trim(),
        slug,
        city: form.city.trim(),
        city_code: form.city_code.trim().toUpperCase(),
        event_date: form.event_date || null,
        start_time: form.start_time || null,
        venue: form.venue.trim() || null,
        participant_price: Number(form.participant_price) || 0,
        visitor_price: Number(form.visitor_price) || 0,
        guest_price: Number(form.guest_price) || 0,
        participant_capacity: Number(form.participant_capacity) || 0,
        visitor_capacity: Number(form.visitor_capacity) || 0,
        guest_capacity: Number(form.guest_capacity) || 0,
        maximum_guests_per_participant: Number(form.maximum_guests_per_participant) || 2,
        registration_status: form.registration_status,
        visitor_registration_enabled: form.visitor_registration_enabled,
        is_active: form.is_active,
        event_image_url: uploadedImageUrl || null,
        updated_at: new Date().toISOString(),
      };
      const result = editingEvent
        ? await supabase
            .from("events")
            .update(payload as never)
            .eq("id", editingEvent.id)
        : await supabase.from("events").insert(payload as never);
      if (result.error) throw result.error;
      await logActivity(
        editingEvent ? `Updated event ${payload.name}` : `Created event ${payload.name}`,
      );
      toast.success(editingEvent ? "Event updated" : "Event created");
      resetForm();
      await onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save event.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel title="Event Management">
      <form onSubmit={saveEvent} className="mb-6 grid gap-3 lg:grid-cols-3">
        <input
          value={form.name}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              name: e.target.value,
              slug: editingEvent ? f.slug : slugify(e.target.value),
            }))
          }
          placeholder="Event name *"
          className="field-input"
        />
        <input
          value={form.slug}
          onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
          placeholder="event-slug"
          className="field-input"
        />
        <input
          value={form.city}
          onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          placeholder="City *"
          className="field-input"
        />
        <input
          value={form.city_code}
          onChange={(e) => setForm((f) => ({ ...f, city_code: e.target.value.toUpperCase() }))}
          placeholder="City code (e.g., AMD) *"
          className="field-input"
          maxLength={5}
        />
        <input
          value={form.event_date}
          onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
          type="date"
          className="field-input"
        />
        <input
          value={form.start_time}
          onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
          type="time"
          className="field-input"
        />
        <input
          value={form.venue}
          onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
          placeholder="Venue"
          className="field-input"
        />
        <input
          value={form.event_image_url}
          onChange={(e) => setForm((f) => ({ ...f, event_image_url: e.target.value }))}
          placeholder="Event image URL"
          className="field-input"
        />
        <div className="rounded-2xl border border-border bg-background/60 p-3 lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/20">
              <ImageIcon className="h-4 w-4" />
              Upload Event Image
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => chooseEventImage(e.target.files?.[0])}
              />
            </label>
            <span className="text-xs text-muted-foreground">
              Used in pass preview and downloadable PDFs. Posters are displayed with no stretching.
            </span>
            {(eventImagePreview || form.event_image_url) && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEventImageFile(null);
                  setEventImagePreview("");
                  setForm((f) => ({ ...f, event_image_url: "" }));
                }}
              >
                Remove Image
              </Button>
            )}
          </div>
          {(eventImagePreview || form.event_image_url) && (
            <div className="mt-3 h-32 w-24 overflow-hidden rounded-xl border border-primary/20 bg-black">
              <img
                src={eventImagePreview || form.event_image_url}
                alt="Selected event poster preview"
                className="h-full w-full object-contain"
              />
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <input
            value={form.participant_price}
            onChange={(e) => setForm((f) => ({ ...f, participant_price: e.target.value }))}
            placeholder="Part. price"
            className="field-input"
          />
          <input
            value={form.visitor_price}
            onChange={(e) => setForm((f) => ({ ...f, visitor_price: e.target.value }))}
            placeholder="Vis. price"
            className="field-input"
          />
          <input
            value={form.guest_price}
            onChange={(e) => setForm((f) => ({ ...f, guest_price: e.target.value }))}
            placeholder="Guest price"
            className="field-input"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <input
            value={form.participant_capacity}
            onChange={(e) => setForm((f) => ({ ...f, participant_capacity: e.target.value }))}
            placeholder="Part. capacity"
            className="field-input"
          />
          <input
            value={form.visitor_capacity}
            onChange={(e) => setForm((f) => ({ ...f, visitor_capacity: e.target.value }))}
            placeholder="Vis. capacity"
            className="field-input"
          />
          <input
            value={form.guest_capacity}
            onChange={(e) => setForm((f) => ({ ...f, guest_capacity: e.target.value }))}
            placeholder="Guest capacity"
            className="field-input"
          />
        </div>
        <select
          value={form.registration_status}
          onChange={(e) => setForm((f) => ({ ...f, registration_status: e.target.value }))}
          className="field-input"
        >
          <option value="inactive">Inactive</option>
          <option value="active">Active</option>
          <option value="closed">Closed</option>
          <option value="full">Full</option>
        </select>
        <label className="flex items-center gap-2 field-input cursor-pointer">
          <input
            type="checkbox"
            checked={form.visitor_registration_enabled}
            onChange={(e) =>
              setForm((f) => ({ ...f, visitor_registration_enabled: e.target.checked }))
            }
          />
          Enable visitor registration
        </label>
        <label className="flex items-center gap-2 field-input cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
          />
          Active
        </label>
        <div className="flex gap-2 lg:col-span-3">
          <Button type="submit" disabled={saving}>
            {editingEvent ? "Update Event" : "Create Event"}
          </Button>
          {editingEvent && (
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Event</th>
              <th className="px-4 py-3 text-left">Image</th>
              <th className="px-4 py-3 text-left">City</th>
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Prices (P/V/G)</th>
              <th className="px-4 py-3 text-left">Capacity (P/V/G)</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id} className="border-t border-border/60">
                <td className="px-4 py-3 font-medium">{ev.name}</td>
                <td className="px-4 py-3">
                  {ev.event_image_url ? (
                    <img
                      src={ev.event_image_url}
                      alt={`${ev.name} poster`}
                      className="h-16 w-12 rounded-lg border border-primary/20 bg-black object-contain"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">No image</span>
                  )}
                </td>
                <td className="px-4 py-3">{ev.city}</td>
                <td className="px-4 py-3 font-mono text-xs">{ev.city_code}</td>
                <td className="px-4 py-3 text-xs">{ev.event_date || "—"}</td>
                <td className="px-4 py-3 text-xs">
                  ₹{ev.participant_price}/₹{ev.visitor_price}/₹{ev.guest_price}
                </td>
                <td className="px-4 py-3 text-xs">
                  {ev.participant_capacity}/{ev.visitor_capacity}/{ev.guest_capacity}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wider",
                      ev.registration_status === "active"
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : ev.registration_status === "closed"
                          ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                          : ev.registration_status === "full"
                            ? "border-red-500/40 bg-red-500/10 text-red-300"
                            : "border-border text-muted-foreground",
                    )}
                  >
                    {ev.registration_status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    <IconButton label="Edit event" icon={Pencil} onClick={() => editEvent(ev)} />
                    <IconButton
                      label={ev.is_active ? "Disable event" : "Enable event"}
                      icon={RefreshCcw}
                      onClick={async () => {
                        await supabase
                          .from("events")
                          .update({
                            is_active: !ev.is_active,
                            updated_at: new Date().toISOString(),
                          } as never)
                          .eq("id", ev.id);
                        await logActivity(
                          `${ev.is_active ? "Disabled" : "Enabled"} event ${ev.name}`,
                        );
                        toast.success(`Event ${ev.is_active ? "disabled" : "enabled"}`);
                        await onRefresh();
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {events.length === 0 && (
          <EmptyState text="No events have been created yet. Create one above." />
        )}
      </div>
    </Panel>
  );
}

function AdminAccessDenied({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-[#07111f] px-4 py-20 text-foreground">
      <div className="mx-auto max-w-md rounded-3xl border border-primary/20 bg-white/[0.04] p-8 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-primary" />
        <h1 className="mt-4 text-2xl font-semibold">Admin access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account is authenticated, but it does not have the admin role required for this
          panel.
        </p>
        <Button className="mt-6" onClick={onLogout}>
          <LogOut className="h-4 w-4" /> Logout
        </Button>
      </div>
    </div>
  );
}

function AdminSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-72 animate-pulse rounded-xl bg-white/10" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-2xl bg-white/10" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-2xl bg-white/10" />
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-primary/15 bg-white/[0.04] p-5 shadow-soft">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="py-10 text-center text-sm text-muted-foreground">{text}</div>;
}

function IconButton({
  label,
  icon: Icon,
  onClick,
  danger,
}: {
  label: string;
  icon: typeof Eye;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-lg border border-border/60 hover:border-primary/50 hover:bg-primary/10",
        danger && "hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function StatusBadge({ pass }: { pass: PublicEntryPass }) {
  const revoked = isRevoked(pass);
  const checked = isCheckedIn(pass);
  const label = revoked
    ? "Revoked"
    : checked
      ? "Checked in"
      : (pass.pass_status ?? pass.status ?? "Active");
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wider",
        revoked
          ? "border-red-500/40 bg-red-500/10 text-red-300"
          : checked
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
            : "border-primary/40 bg-primary/10 text-primary",
      )}
    >
      {label.replace("_", " ")}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/40 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || "Not available"}</span>
    </div>
  );
}

function normalizePass(pass: PublicEntryPass): PublicEntryPass {
  return {
    ...pass,
    pass_status: pass.pass_status ?? (pass.status === "cancelled" ? "revoked" : "active"),
    checked_in: pass.checked_in ?? pass.status === "checked_in",
  };
}

function isCheckedIn(pass: PublicEntryPass) {
  return pass.checked_in === true || pass.status === "checked_in";
}

function isRevoked(pass: PublicEntryPass) {
  return pass.pass_status === "revoked" || pass.status === "cancelled";
}

function qrValue(pass: PublicEntryPass) {
  return (
    pass.qr_value ||
    JSON.stringify({ id: pass.id, entryNumber: pass.entry_number, name: pass.participant_name })
  );
}

function parseQrValue(value: string) {
  try {
    const parsed = JSON.parse(value) as { id?: string; entryNumber?: string; token?: string };
    return parsed;
  } catch {
    const trimmed = value.trim();
    try {
      const url = new URL(trimmed, window.location.origin);
      const match = url.pathname.match(/\/verify-pass\/([^/?#]+)/);
      if (match?.[1]) {
        return { id: match[1], token: url.searchParams.get("t") ?? undefined };
      }
    } catch {
      // Fall through to legacy entry-number parsing.
    }
    return { entryNumber: trimmed };
  }
}

function emptyCityForm(order: number): GalleryCityForm {
  return {
    name: "",
    slug: "",
    display_order: String(order),
    is_active: true,
  };
}

function cityToForm(city: GalleryCity): GalleryCityForm {
  return {
    name: city.name,
    slug: city.slug,
    display_order: String(city.display_order),
    is_active: city.is_active,
  };
}

function emptyMediaForm(cityId: string): GalleryMediaForm {
  return {
    title: "",
    city_id: cityId,
    media_type: "photo",
    category: "Photos",
    media_url: "",
    thumbnail_url: "",
    description: "",
    display_order: "0",
    is_active: true,
  };
}

function mediaToForm(item: GalleryMedia): GalleryMediaForm {
  return {
    title: item.title,
    city_id: item.city_id ?? "",
    media_type: item.media_type,
    category: item.category,
    media_url: item.media_url,
    thumbnail_url: item.thumbnail_url ?? "",
    description: item.description ?? "",
    display_order: String(item.display_order),
    is_active: item.is_active,
  };
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function titleForView(view: AdminView) {
  return sidebarItems.find((item) => item.view === view)?.label ?? "Dashboard";
}

function dailyStats(rows: PublicEntryPass[], key: "created_at" | "checked_in_at") {
  const stats = new Map<string, number>();
  rows.forEach((row) => {
    const value = row[key];
    if (!value) return;
    const label = new Date(value).toLocaleDateString();
    stats.set(label, (stats.get(label) ?? 0) + 1);
  });
  return [...stats.entries()].slice(0, 7);
}

function StatsList({ title, rows }: { title: string; rows: Array<[string, number]> }) {
  return (
    <div>
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="mt-3 space-y-2">
        {rows.map(([day, count]) => (
          <div
            key={day}
            className="flex justify-between rounded-lg border border-border/50 bg-background/40 px-3 py-2 text-sm"
          >
            <span>{day}</span>
            <span className="font-semibold text-primary">{count}</span>
          </div>
        ))}
        {rows.length === 0 && <div className="text-sm text-muted-foreground">No data yet.</div>}
      </div>
    </div>
  );
}

function downloadText(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function downloadParticipantReport(rows: PublicEntryPass[]) {
  const lines = [
    "Telent Fest Participant Report",
    `Generated: ${new Date().toLocaleString()}`,
    `Records: ${rows.length}`,
    "",
    ...rows.map(
      (row) =>
        `${row.entry_number} - ${row.participant_name} - ${row.event_name} - ${isCheckedIn(row) ? "Checked in" : "Not checked in"}`,
    ),
  ];
  downloadText(lines.join("\n"), "talent-fest-participant-report.txt", "text/plain;charset=utf-8");
}

function printParticipantList(rows: PublicEntryPass[]) {
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return toast.error("Allow popups to print participant lists.");
  win.document.write(`
    <html><head><title>Telent Fest Participants</title>
    <style>body{font-family:Inter,Arial,sans-serif;padding:24px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f7f7f7}</style>
    </head><body><h1>Telent Fest Participant List</h1><table><thead><tr><th>Entry</th><th>Name</th><th>Event</th><th>Status</th></tr></thead><tbody>
    ${rows.map((row) => `<tr><td>${escapeHtml(row.entry_number)}</td><td>${escapeHtml(row.participant_name)}</td><td>${escapeHtml(row.event_name)}</td><td>${isCheckedIn(row) ? "Checked in" : "Not checked in"}</td></tr>`).join("")}
    </tbody></table></body></html>
  `);
  win.document.close();
  win.print();
}

function buildPrintablePass(pass: PublicEntryPass, qrDataUrl?: string) {
  return `
    <html><head><title>${escapeHtml(pass.entry_number)}</title>
    <style>body{font-family:Inter,Arial,sans-serif;background:#07111f;color:#fff;padding:32px}.card{max-width:460px;margin:auto;border:1px solid #c8a96a;border-radius:24px;padding:28px;text-align:center}.qr{width:220px;height:220px;margin:18px auto;padding:14px;background:#fff;border-radius:18px}.qr img{width:100%;height:100%;display:block;image-rendering:pixelated}.entry{color:#c8a96a;font-family:monospace}.muted{color:#b6bdc8}@media(max-width:640px){.card{max-width:100%}.qr{width:170px;height:170px}}</style>
    </head><body><div class="card"><h1>Telent Fest Entry Pass</h1><h2>${escapeHtml(pass.participant_name)}</h2><p class="muted">${escapeHtml(pass.event_name)}</p><p class="entry">${escapeHtml(pass.entry_number)}</p>${qrDataUrl ? `<div class="qr"><img src="${qrDataUrl}" alt="Entry QR code" /></div>` : ""}<p>${isCheckedIn(pass) ? "Checked in" : "Not checked in"}</p></div></body></html>
  `;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
