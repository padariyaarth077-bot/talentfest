import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ConcertSettings = {
  id?: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  event_label: string;
  event_title: string;
  venue: string;
  city: string;
  event_date: string;
  start_time: string;
  end_time: string;
  price_text: string;
  button_text: string;
  button_url: string;
  map_embed_url: string;
  map_url: string;
  latitude: number | null;
  longitude: number | null;
  is_published: boolean;
};

export type ConcertArtist = {
  id?: string;
  artist_name: string;
  performance_type: string;
  description: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
};

// ─── Map URL Resolution ──────────────────────────────────────
// Shared utility for generating safe Google Maps embed URLs

const ALLOWED_MAP_DOMAINS = [
  "google.com", "www.google.com", "maps.google.com",
  "maps.app.goo.gl", "goo.gl", "google.co.in", "google.co.uk",
];

function isApprovedMapUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "");
    return ALLOWED_MAP_DOMAINS.some((d) => hostname === d || hostname.endsWith("." + d));
  } catch {
    return false;
  }
}

export function resolveConcertMapUrls(settings: {
  map_url?: string | null;
  map_embed_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  venue?: string | null;
  city?: string | null;
}): { embedUrl: string; openInMapsUrl: string } {
  const venueStr = [settings.venue, settings.city].filter(Boolean).join(", ");
  const defaultFallback = `https://www.google.com/maps?q=${encodeURIComponent(venueStr || "Rajkot, Gujarat")}&z=14&output=embed`;

  // 1. Try saved embed URL — validate it's a real Google Maps embed
  const embedCandidate = settings.map_embed_url?.trim() || "";
  const embedSrc = embedCandidate.match(/src=["']([^"']+)["']/i)?.[1] || embedCandidate;
  if (embedSrc && (embedSrc.includes("/embed") || embedSrc.includes("output=embed")) && isApprovedMapUrl(embedSrc)) {
    return {
      embedUrl: embedSrc,
      openInMapsUrl: embedSrc.replace(/output=embed[^&]*/, "").replace(/[?&]$/, ""),
    };
  }

  // 2. Try latitude/longitude
  const lat = settings.latitude;
  const lng = settings.longitude;
  if (lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
    const embedUrl = `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
    const openInMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    return { embedUrl, openInMapsUrl };
  }

  // 3. Try map_url — resolve share links
  const mapUrl = settings.map_url?.trim() || "";
  if (mapUrl && isApprovedMapUrl(mapUrl)) {
    try {
      const parsed = new URL(mapUrl);
      const coordMatch = mapUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      const query = parsed.searchParams.get("q") || "";
      if (coordMatch) {
        const embedUrl = `https://www.google.com/maps?q=${coordMatch[1]},${coordMatch[2]}&z=15&output=embed`;
        return { embedUrl, openInMapsUrl: mapUrl };
      }
      if (query) {
        const embedUrl = `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=14&output=embed`;
        return { embedUrl, openInMapsUrl: mapUrl };
      }
      // Raw share link — use venue as query
      if (venueStr) {
        const embedUrl = `https://www.google.com/maps?q=${encodeURIComponent(venueStr)}&z=14&output=embed`;
        return { embedUrl, openInMapsUrl: mapUrl };
      }
    } catch {
      // fall through
    }
  }

  // 4. Venue/address fallback
  if (venueStr) {
    return {
      embedUrl: `https://www.google.com/maps?q=${encodeURIComponent(venueStr)}&z=14&output=embed`,
      openInMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueStr)}`,
    };
  }

  return { embedUrl: defaultFallback, openInMapsUrl: "https://www.google.com/maps" };
}

export type BlogPost = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  thumbnail_url: string;
  thumbnail_alt: string;
  published_at: string;
  is_featured: boolean;
  display_order: number;
};

const fallbackBlogs: BlogPost[] = [
  {
    title: "How to Prepare for Your Telent Fest Audition",
    slug: "prepare-for-telent-fest-audition",
    excerpt: "A practical checklist for polishing your act before audition day.",
    content: "Prepare your performance, rehearse your timing, check your costume or instruments, and arrive early with your entry pass and ID.",
    category: "Tips",
    thumbnail_url: "/gallery/vadodara/vadodara-real-03.jpg",
    thumbnail_alt: "Telent Fest stage performance",
    published_at: "2026-06-12",
    is_featured: true,
    display_order: 1,
  },
  {
    title: "Celebrating Winners Across Gujarat",
    slug: "celebrating-winners-across-gujarat",
    excerpt: "Stories from the artists and communities that make Telent Fest shine.",
    content: "Telent Fest celebrates performers, mentors, and organizers who help local talent reach bigger stages.",
    category: "Stories",
    thumbnail_url: "/gallery/surat/surat-real-01.jpg",
    thumbnail_alt: "Telent Fest award moment",
    published_at: "2026-05-28",
    is_featured: false,
    display_order: 2,
  },
  {
    title: "City Events Are Growing",
    slug: "city-events-are-growing",
    excerpt: "A look at how city-wise auditions are connecting more performers.",
    content: "City-wise event galleries and local auditions help more artists participate close to home.",
    category: "Updates",
    thumbnail_url: "/project-assets/registered-students-post.png",
    thumbnail_alt: "Telent Fest registered students poster",
    published_at: "2026-05-05",
    is_featured: false,
    display_order: 3,
  },
];

export const fetchConcertContent = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const db = supabaseAdmin as any;
    const { data: settings, error: settingsError } = await db
      .from("concert_settings")
      .select("*")
      .eq("is_published", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Only fetch artists linked to the active concert
    let artists: any[] = [];
    if (settings?.id) {
      const { data: artistRows, error: artistsError } = await db
        .from("concert_artists")
        .select("*")
        .eq("concert_info_id", settings.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("artist_name", { ascending: true });
      if (!artistsError && artistRows) artists = artistRows;
    }

    return {
      settings: settingsError || !settings ? null : settings,
      artists,
    };
  });

export const fetchPublishedBlogPosts = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ limit: z.number().optional().default(3) }).parse(data ?? {}))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: posts, error } = await db
      .from("blog_posts")
      .select("*")
      .eq("status", "published")
      .order("display_order", { ascending: true })
      .order("published_at", { ascending: false })
      .limit(data.limit);

    return error || !posts?.length ? fallbackBlogs.slice(0, data.limit) : posts;
  });

export const fetchBlogPostBySlug = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ slug: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: post, error } = await db
      .from("blog_posts")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();

    if (!error && post) return post;
    return fallbackBlogs.find((entry) => entry.slug === data.slug) ?? null;
  });
