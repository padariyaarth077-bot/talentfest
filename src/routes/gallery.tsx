import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ChevronLeft, ChevronRight, Image as ImageIcon, Loader2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Section } from "@/components/site/Section";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import {
  eventGallery,
  galleryCities,
  type GalleryCategory,
  type GalleryCitySlug,
  type GalleryItem,
} from "@/data/eventGallery";
import { getSupabaseConfigError, supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type GallerySearch = {
  city?: string;
};

type RemoteCity = {
  id: string;
  name: string;
  slug: string;
};

type RemoteMedia = {
  id: string;
  city_id: string | null;
  title: string;
  media_type: "photo" | "video";
  category: string;
  media_url: string;
  thumbnail_url: string | null;
  description: string | null;
  display_order: number;
  is_active: boolean;
};

export const Route = createFileRoute("/gallery")({
  validateSearch: (search: Record<string, unknown>): GallerySearch => ({
    city: typeof search.city === "string" ? search.city : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Event Gallery - Telent Fest" },
      { name: "description", content: "Explore Telent Fest event photos by city." },
      { property: "og:title", content: "Event Gallery - Telent Fest" },
      { property: "og:description", content: "Select a city to view Telent Fest event galleries." },
    ],
  }),
  component: GalleryPage,
});

function GalleryPage() {
  const { t } = useLang();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const selectedCity = galleryCities.find((city) => city.slug === search.city);
  const [remoteItems, setRemoteItems] = useState<GalleryItem[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    let ignore = false;

    async function loadRemoteGallery() {
      if (getSupabaseConfigError()) return;

      try {
        const [citiesResult, mediaResult] = await Promise.all([
          supabase.from("gallery_cities").select("id, name, slug").eq("is_active", true),
          supabase
            .from("gallery_media")
            .select("id, city_id, title, media_type, category, media_url, thumbnail_url, description, display_order, is_active")
            .eq("is_active", true)
            .eq("media_type", "photo")
            .order("display_order", { ascending: true }),
        ]);

        if (ignore || citiesResult.error || mediaResult.error) return;

        const cityById = new Map(
          ((citiesResult.data ?? []) as RemoteCity[]).map((city) => [city.id, galleryCities.find((local) => local.slug === city.slug)]),
        );

        const mapped = ((mediaResult.data ?? []) as RemoteMedia[])
          .map((item): GalleryItem | null => {
            const city = item.city_id ? cityById.get(item.city_id) : undefined;
            if (!city || !item.media_url) return null;

            const category = normalizeCategory(item.category);
            return {
              id: `remote-${item.id}`,
              city: city.slug,
              cityName: city.name,
              category,
              mediaType: "photo",
              title: item.title,
              description: item.description ?? `Telent Fest ${city.name} event moment.`,
              image: item.thumbnail_url ?? item.media_url,
              alt: `${item.title} at Telent Fest ${city.name}`,
              featured: item.display_order <= 3,
              winner: category === "highlights" || item.category.toLowerCase().includes("winner"),
              highlight: category === "highlights",
              width: 900,
              height: 1200,
            };
          })
          .filter(Boolean) as GalleryItem[];

        setRemoteItems(mapped);
      } catch {
        if (!ignore) setRemoteItems([]);
      }
    }

    void loadRemoteGallery();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    setLightboxIndex(null);
  }, [selectedCity?.slug]);

  const allItems = useMemo(() => dedupeGalleryItems([...eventGallery, ...remoteItems]), [remoteItems]);
  const cityItems = useMemo(
    () => (selectedCity ? allItems.filter((item) => item.city === selectedCity.slug) : []),
    [allItems, selectedCity],
  );
  const featuredItems = useMemo(() => {
    const featured = cityItems.filter((item) => item.featured);
    return featured.length > 0 ? featured : cityItems.slice(0, 4);
  }, [cityItems]);
  const gridItems = useMemo(() => {
    const featuredIds = new Set(featuredItems.map((item) => item.id));
    return cityItems.filter((item) => !featuredIds.has(item.id));
  }, [cityItems, featuredItems]);

  const openLightbox = (item: GalleryItem) => {
    const index = cityItems.findIndex((galleryItem) => galleryItem.id === item.id);
    if (index >= 0) setLightboxIndex(index);
  };

  if (!selectedCity) {
    return (
      <Section eyebrow={t("gallery.eyebrow")} title={t("gallery.title")} subtitle={t("gallery.subtitle")}>
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            {galleryCities.map((city) => (
              <button
                key={city.slug}
                onClick={() => navigate({ to: "/gallery", search: { city: city.slug } })}
                className="min-h-11 rounded-lg border border-primary/45 bg-[#0b111d] px-5 py-2 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:border-primary hover:bg-primary hover:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-primary/60 sm:text-base"
                aria-label={`Open ${city.name} event gallery`}
              >
                {city.name}
              </button>
            ))}
          </div>
        </div>
      </Section>
    );
  }

  return (
    <Section eyebrow={t("gallery.eyebrow")} title={`${selectedCity.name} Event Gallery`} subtitle="Explore premium Telent Fest moments from this city.">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <button
            onClick={() => navigate({ to: "/gallery", search: {} })}
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
            aria-label="Back to cities"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("gallery.backToCities")}
          </button>
        </div>

        <FeaturedMoments items={featuredItems} onOpen={openLightbox} />

        {gridItems.length === 0 ? (
          <div className="rounded-3xl border border-primary/20 bg-card/70 px-5 py-12 text-center text-muted-foreground">
            Event moments for this city are coming soon.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {gridItems.map((item) => (
              <GalleryCard
                key={item.id}
                item={item}
                onOpen={() => openLightbox(item)}
                refCallback={(node) => {
                  cardRefs.current[item.id] = node;
                }}
              />
            ))}
          </div>
        )}
      </div>

      <Lightbox
        items={cityItems}
        activeIndex={lightboxIndex}
        onClose={() => {
          const activeItem = lightboxIndex == null ? null : cityItems[lightboxIndex];
          setLightboxIndex(null);
          if (activeItem) requestAnimationFrame(() => cardRefs.current[activeItem.id]?.focus());
        }}
        onChange={setLightboxIndex}
      />
    </Section>
  );
}

function FeaturedMoments({ items, onOpen }: { items: GalleryItem[]; onOpen: (item: GalleryItem) => void }) {
  const [api, setApi] = useState<CarouselApi>();
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!api || paused || items.length <= 1) return;
    const timer = window.setInterval(() => api.scrollNext(), 3200);
    return () => window.clearInterval(timer);
  }, [api, items.length, paused]);

  if (items.length === 0) return null;

  return (
    <div className="space-y-4" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-2xl font-semibold">Featured Moments</h3>
        <div className="flex gap-2">
          <button
            onClick={() => api?.scrollPrev()}
            className="grid h-10 w-10 place-items-center rounded-full border border-primary/35 bg-card text-primary transition hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
            aria-label="Previous featured moment"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => api?.scrollNext()}
            className="grid h-10 w-10 place-items-center rounded-full border border-primary/35 bg-card text-primary transition hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
            aria-label="Next featured moment"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <Carousel opts={{ align: "start", loop: true }} setApi={setApi} className="w-full">
        <CarouselContent className="-ml-4">
          {items.map((item) => (
            <CarouselItem key={item.id} className="pl-4 basis-[78%] sm:basis-[42%] lg:basis-1/4">
              <GalleryCard item={item} onOpen={() => onOpen(item)} compact />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}

function GalleryCard({
  item,
  onOpen,
  compact = false,
  refCallback,
}: {
  item: GalleryItem;
  onOpen: () => void;
  compact?: boolean;
  refCallback?: (node: HTMLButtonElement | null) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <button
      ref={refCallback}
      onClick={onOpen}
      data-gallery-card={compact ? "featured" : "grid"}
      className="group block w-full overflow-hidden rounded-3xl border border-primary/20 bg-card text-left shadow-soft transition duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-elegant focus:outline-none focus:ring-2 focus:ring-primary/70 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      aria-label={`Open ${item.title}`}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-[#080808]">
        {!loaded && !failed && <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-primary/10 via-card to-primary/5" />}
        {failed ? (
          <div className="absolute inset-0 grid place-items-center bg-card px-5 text-center text-sm text-muted-foreground">
            <div>
              <ImageIcon className="mx-auto mb-3 h-8 w-8 text-primary" />
              This event moment is loading.
            </div>
          </div>
        ) : (
          <img
            src={item.image}
            alt={item.alt}
            width={item.width}
            height={item.height}
            loading={item.featured ? "eager" : "lazy"}
            className={cn(
              "h-full w-full object-cover object-center transition duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100",
              loaded ? "opacity-100" : "opacity-0",
            )}
            onLoad={() => setLoaded(true)}
            onError={() => {
              setFailed(true);
              console.warn(`Gallery image failed to load: ${item.image}`);
            }}
          />
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent p-4 pt-16">
          <h4 className={cn("font-semibold text-white", compact ? "text-base" : "text-lg")}>{item.title}</h4>
          <p className="mt-1 text-xs text-white/70">{item.cityName}</p>
        </div>
      </div>
    </button>
  );
}

function Lightbox({
  items,
  activeIndex,
  onClose,
  onChange,
}: {
  items: GalleryItem[];
  activeIndex: number | null;
  onClose: () => void;
  onChange: (index: number) => void;
}) {
  const touchStart = useRef<number | null>(null);
  const activeItem = activeIndex == null ? null : items[activeIndex];

  const goPrev = () => {
    if (activeIndex == null || items.length === 0) return;
    onChange((activeIndex - 1 + items.length) % items.length);
  };

  const goNext = () => {
    if (activeIndex == null || items.length === 0) return;
    onChange((activeIndex + 1) % items.length);
  };

  useEffect(() => {
    if (!activeItem) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") goPrev();
      if (event.key === "ArrowRight") goNext();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeItem, activeIndex, items.length]);

  if (!activeItem || activeIndex == null) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label={activeItem.title}
      onPointerDown={(event) => {
        touchStart.current = event.clientX;
      }}
      onPointerUp={(event) => {
        if (touchStart.current == null) return;
        const delta = event.clientX - touchStart.current;
        touchStart.current = null;
        if (Math.abs(delta) < 45) return;
        if (delta > 0) goPrev();
        else goNext();
      }}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/60 text-white transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label="Close gallery lightbox"
      >
        <X className="h-5 w-5" />
      </button>

      <button
        onClick={goPrev}
        className="absolute left-4 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/60 text-white transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label="Previous gallery image"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      <figure className="grid max-h-[92vh] w-full max-w-6xl gap-5 lg:grid-cols-[minmax(0,0.72fr)_minmax(280px,0.28fr)] lg:items-center">
        <div className="flex min-h-0 items-center justify-center">
          <img
            src={activeItem.image}
            alt={activeItem.alt}
            className="max-h-[72vh] w-auto max-w-full rounded-3xl border border-primary/25 object-contain object-center shadow-elegant lg:max-h-[88vh]"
          />
        </div>
        <figcaption className="rounded-3xl border border-primary/20 bg-card/90 p-6 shadow-elegant">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            {activeIndex + 1} / {items.length}
          </div>
          <h3 className="mt-3 text-2xl font-semibold">{activeItem.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{activeItem.cityName}</p>
          <p className="mt-4 leading-7 text-muted-foreground">{activeItem.description}</p>
        </figcaption>
      </figure>

      <button
        onClick={goNext}
        className="absolute right-4 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/60 text-white transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label="Next gallery image"
      >
        <ChevronRight className="h-6 w-6" />
      </button>
    </div>
  );
}

function dedupeGalleryItems(items: GalleryItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.city}:${item.image.trim().toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeCategory(category: string): GalleryCategory {
  const value = category.toLowerCase().trim();
  if (value.includes("dance")) return "dance";
  if (value.includes("sing")) return "singing";
  if (value.includes("music") || value.includes("instrument")) return "music";
  if (value.includes("paint") || value.includes("art")) return "painting";
  if (value.includes("acting") || value.includes("theatre") || value.includes("theater")) return "acting";
  if (value.includes("writing") || value.includes("creative")) return "creative-writing";
  if (value.includes("photo")) return "photography";
  return "highlights";
}
