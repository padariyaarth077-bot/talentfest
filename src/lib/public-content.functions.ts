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
  event_date: string;
  start_time: string;
  price_text: string;
  button_text: string;
  button_url: string;
  map_embed_url: string;
  map_url: string;
};

export type ConcertArtist = {
  id?: string;
  artist_name: string;
  performance_type: string;
  description: string;
  display_order: number;
};

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

const fallbackConcert: ConcertSettings = {
  eyebrow: "Live Concert",
  title: "Concert Information",
  subtitle: "Experience live performances, celebrity acts, and cultural showcases from Telent Fest.",
  event_label: "Grand Finale",
  event_title: "Telent Fest Grand Finale",
  venue: "Rajkot, Gujarat",
  event_date: "2026-07-26",
  start_time: "18:00",
  price_text: "Registration opens soon",
  button_text: "Entry Pass",
  button_url: "/entry-pass",
  map_embed_url: "https://maps.google.com/maps?q=Rajkot%2C%20Gujarat&z=12&output=embed",
  map_url: "https://maps.google.com/?q=Rajkot%2C%20Gujarat",
};

const fallbackArtists: ConcertArtist[] = [
  { artist_name: "Aarav Mehta", performance_type: "Singer", description: "Opening vocal performance", display_order: 1 },
  { artist_name: "Nritya Collective", performance_type: "Dance Crew", description: "Cultural dance showcase", display_order: 2 },
  { artist_name: "Studio 47", performance_type: "Band", description: "Live fusion set", display_order: 3 },
  { artist_name: "Neha Kapoor", performance_type: "Artist", description: "Creative stage feature", display_order: 4 },
];

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

    const { data: artists, error: artistsError } = await db
      .from("concert_artists")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("artist_name", { ascending: true });

    return {
      settings: settingsError || !settings ? fallbackConcert : settings,
      artists: artistsError || !artists?.length ? fallbackArtists : artists,
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
