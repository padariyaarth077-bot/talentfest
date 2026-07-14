import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  BookOpen,
  Camera,
  ChevronLeft,
  ChevronRight,
  Drama,
  Heart,
  Mic2,
  Music,
  Palette,
  Play,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroBackground } from "@/components/site/HeroBackground";
import { Section } from "@/components/site/Section";
import { useLang } from "@/lib/i18n";

type TalentItem = {
  nameKey: string;
  labelKey: string;
  statKey: string;
  image: string;
  heroImage: string;
  heroImageSize: {
    width: number;
    height: number;
  };
  alt: string;
  icon: LucideIcon;
  cardTone: string;
  objectPosition?: string;
  cardImageStyle?: string;
};

const talentItems: TalentItem[] = [
  {
    nameKey: "talents.singing",
    labelKey: "talents.singer",
    statKey: "talents.vocalStage",
    image: "/talent-assets/real-singer.webp",
    heroImage: "/talent-assets/hero-real-singer.webp",
    heroImageSize: { width: 678, height: 1430 },
    alt: "Real singer holding a handheld microphone",
    icon: Play,
    cardTone: "from-[#1d130b] to-[#0d0a08]",
    objectPosition: "center bottom",
  },
  {
    nameKey: "talents.painting",
    labelKey: "talents.painter",
    statKey: "talents.visualArts",
    image: "/talent-assets/real-painter.webp",
    heroImage: "/talent-assets/hero-real-painter.webp",
    heroImageSize: { width: 635, height: 1463 },
    alt: "Real painter holding brushes and an artist palette",
    icon: Palette,
    cardTone: "from-[#2a160d] to-[#0d0a08]",
  },
  {
    nameKey: "talents.creativeWriting",
    labelKey: "talents.writer",
    statKey: "talents.storyShowcase",
    image: "/talent-assets/real-writer.webp",
    heroImage: "/talent-assets/hero-real-writer.webp",
    heroImageSize: { width: 478, height: 1426 },
    alt: "Real creative writer holding an open notebook and pen",
    icon: BookOpen,
    cardTone: "from-[#201811] to-[#0d0a08]",
  },
  {
    nameKey: "talents.acting",
    labelKey: "talents.actor",
    statKey: "talents.stageCraft",
    image: "/talent-assets/real-actor.webp",
    heroImage: "/talent-assets/hero-real-actor.webp",
    heroImageSize: { width: 596, height: 1442 },
    alt: "Real actor holding a film clapperboard",
    icon: Drama,
    cardTone: "from-[#1b120e] to-[#0d0a08]",
  },
  {
    nameKey: "talents.dancing",
    labelKey: "talents.dancer",
    statKey: "talents.performanceFloor",
    image: "/talent-assets/real-dancer.webp",
    heroImage: "/talent-assets/hero-real-dancer.webp",
    heroImageSize: { width: 787, height: 1504 },
    alt: "Real dancer in an expressive performance pose",
    icon: Music,
    cardTone: "from-[#2b170f] to-[#0d0a08]",
    objectPosition: "center bottom",
  },
  {
    nameKey: "talents.music",
    labelKey: "talents.musician",
    statKey: "talents.liveRhythm",
    image: "/talent-assets/real-musician.webp",
    heroImage: "/talent-assets/hero-real-musician.webp",
    heroImageSize: { width: 705, height: 1449 },
    alt: "Real musician holding a violin and bow",
    icon: Mic2,
    cardTone: "from-[#25170f] to-[#0d0a08]",
  },
  {
    nameKey: "talents.photography",
    labelKey: "talents.photographer",
    statKey: "talents.frameStories",
    image: "/talent-assets/real-photographer.webp",
    heroImage: "/talent-assets/hero-real-photographer.webp",
    heroImageSize: { width: 614, height: 1444 },
    alt: "Real photographer holding a professional camera",
    icon: Camera,
    cardTone: "from-[#1a1713] to-[#0d0a08]",
    cardImageStyle: "right-[-12%] w-[72%]",
  },
];

const homepageStats = [
  { labelKey: "hero.stats.categories", value: "10+" },
  { labelKey: "hero.stats.seminars", value: "1500+" },
  { labelKey: "hero.stats.districts", value: "18+" },
  { labelKey: "hero.stats.students", value: "3.5 Lakh+" },
  { labelKey: "hero.stats.since", value: "Since 2015" },
];

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);

    sync();
    media.addEventListener("change", sync);

    return () => media.removeEventListener("change", sync);
  }, []);

  return reducedMotion;
}

export function MotionImage({
  src,
  alt,
  className,
  loading = "lazy",
  style,
  width,
  height,
}: {
  src: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
  style?: CSSProperties;
  width?: number;
  height?: number;
}) {
  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      width={width}
      height={height}
      className={className}
      style={style}
      draggable={false}
    />
  );
}

export function CarouselControls({
  items,
  active,
  onSelect,
  onPrevious,
  onNext,
}: {
  items: Pick<TalentItem, "nameKey">[];
  active: number;
  onSelect: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const { t } = useLang();

  return (
    <div className="mt-4 flex items-center justify-center gap-4">
      <button
        type="button"
        aria-label={t("a11y.previousTalent")}
        onClick={onPrevious}
        className="carousel-arrow grid h-10 w-10 place-items-center rounded-full border border-primary/40 bg-black/40 text-primary backdrop-blur transition hover:-translate-x-0.5 hover:border-primary hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2">
        {items.map((item, index) => (
          <button
            key={item.nameKey}
            type="button"
            aria-label={t("a11y.showTalent", {
              name: t(item.nameKey),
            })}
            aria-current={active === index ? "true" : undefined}
            onClick={() => onSelect(index)}
            className={`h-2.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              active === index
                ? "w-9 bg-primary"
                : "w-2.5 bg-foreground/35 hover:bg-foreground/65"
            }`}
          />
        ))}
      </div>

      <button
        type="button"
        aria-label={t("a11y.nextTalent")}
        onClick={onNext}
        className="carousel-arrow grid h-10 w-10 place-items-center rounded-full border border-primary/40 bg-black/40 text-primary backdrop-blur transition hover:translate-x-0.5 hover:border-primary hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

export function TalentHeroCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [direction, setDirection] = useState<"next" | "prev">("next");

  const pointerStart = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();
  const { t } = useLang();

  const selectSlide = (index: number) => {
    const normalized =
      (index + talentItems.length) % talentItems.length;

    setDirection(
      normalized > active ||
        (active === talentItems.length - 1 && normalized === 0)
        ? "next"
        : "prev",
    );

    setActive(normalized);
  };

  const move = (delta: number) => {
    setDirection(delta > 0 ? "next" : "prev");

    setActive(
      (current) =>
        (current + delta + talentItems.length) % talentItems.length,
    );
  };

  useEffect(() => {
    if (paused || reducedMotion) return;

    const timer = window.setInterval(() => {
      setDirection("next");
      setActive(
        (current) => (current + 1 + talentItems.length) % talentItems.length,
      );
    }, 4400);

    return () => window.clearInterval(timer);
  }, [paused, reducedMotion]);

  const handleSwipeEnd = (clientX: number) => {
    if (pointerStart.current === null) return;

    const distance = pointerStart.current - clientX;

    if (Math.abs(distance) > 42) {
      move(distance > 0 ? 1 : -1);
    }

    pointerStart.current = null;
  };

  return (
    <div
      className="group relative mx-auto w-full max-w-[640px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onPointerDown={(event) => {
        pointerStart.current = event.clientX;
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }}
      onPointerUp={(event) => handleSwipeEnd(event.clientX)}
      onPointerCancel={() => {
        pointerStart.current = null;
      }}
    >
      <div className="relative aspect-[0.94/1] overflow-hidden rounded-[2rem] border border-primary/25 bg-[#090604] shadow-elegant sm:aspect-[1.05/1] sm:rounded-[2.5rem]">
        <div className="absolute inset-5 rounded-[1.7rem] bg-[radial-gradient(circle_at_62%_32%,rgba(244,196,48,0.7),rgba(200,169,106,0.4)_36%,rgba(23,13,7,0.22)_68%,transparent_72%)]" />

        <div className="absolute right-0 top-0 h-full w-[76%] bg-[linear-gradient(135deg,#f0cd63_0%,#c8a96a_48%,#5b3a17_100%)] opacity-95 [clip-path:polygon(18%_0,100%_0,100%_100%,0_100%)]" />

        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/75 to-transparent" />

        <div
          key={`${talentItems[active].labelKey}-${active}`}
          className="talent-label absolute left-5 top-5 z-20 rounded-2xl border border-white/10 bg-black/35 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-primary backdrop-blur sm:left-6 sm:top-6"
        >
          {t(talentItems[active].labelKey)}
        </div>

        <div
          className="relative z-10 flex h-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          data-direction={direction}
          style={{
            transform: `translateX(-${active * 100}%)`,
          }}
        >
          {talentItems.map((talent, index) => (
            <div
              key={talent.nameKey}
              className="flex h-full min-w-full items-end justify-center px-2 pt-10 sm:grid sm:place-items-end sm:px-8 sm:pt-16"
            >
              <MotionImage
                src={talent.heroImage}
                alt={talent.alt}
                loading={index === 0 ? "eager" : "lazy"}
                width={talent.heroImageSize.width}
                height={talent.heroImageSize.height}
                className={`talent-hero-person h-[94%] max-h-[360px] w-auto max-w-[90%] object-contain object-bottom drop-shadow-[0_30px_36px_rgba(0,0,0,0.52)] sm:max-h-[540px] sm:w-full sm:max-w-none ${
                  active === index ? "is-active" : ""
                }`}
                style={{
                  objectPosition: talent.objectPosition,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <CarouselControls
        items={talentItems}
        active={active}
        onSelect={selectSlide}
        onPrevious={() => move(-1)}
        onNext={() => move(1)}
      />
    </div>
  );
}

export function PremiumHero({
  registerLabel,
  exploreLabel,
}: {
  registerLabel: string;
  exploreLabel: string;
}) {
  const { t } = useLang();

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 gradient-hero opacity-95" />

      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 82% 60%, white 1px, transparent 1px)",
          backgroundSize: "80px 80px, 120px 120px",
        }}
      />

      <HeroBackground />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-8 pt-8 sm:px-6 sm:pt-12 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:pb-10 lg:pt-16">
        <div className="text-center lg:text-left">
          <div className="brand-identity mx-auto lg:mx-0">
            <div className="brand-logo-wrapper">
              <img
                src="/brand/telentfest-official-icon.png"
                alt="Telentfest logo"
                className="brand-logo-image"
                width={160}
                height={160}
              />
            </div>

            <div className="brand-content">
              <div className="brand-title" aria-label="TELENTFEST">
                TELENTFEST
              </div>
              <p className="brand-tagline">Training Since 2015</p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-foreground/25 bg-foreground/15 px-4 py-1.5 text-xs font-medium backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            {t("hero.announcement")}
          </div>

          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl lg:mx-0 lg:text-7xl">
            {t("hero.title")}
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-foreground/85 sm:text-lg lg:mx-0 lg:text-xl">
            {t("hero.description")}
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            <Button
              asChild
              size="lg"
              className="gradient-primary border-0 px-8 text-primary-foreground shadow-elegant hover:opacity-95"
            >
              <Link to="/registration">
                {registerLabel}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-foreground/35 bg-foreground/10 px-8 text-foreground backdrop-blur hover:bg-foreground/20"
            >
              <a href="#services">{exploreLabel}</a>
            </Button>
          </div>
        </div>

        <TalentHeroCarousel />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-primary/20 bg-[#111]/80 p-4 shadow-elegant backdrop-blur sm:grid-cols-3 lg:grid-cols-5 lg:p-5">
          {homepageStats.map((stat) => (
            <div
              key={stat.labelKey}
              className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-4 text-center"
            >
              <div className="font-display text-2xl font-bold text-gradient sm:text-3xl">
                {"valueKey" in stat ? t(stat.valueKey) : stat.value}
              </div>

              <div className="mt-1 text-xs text-muted-foreground sm:text-sm">
                {t(stat.labelKey)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TalentCategoryCard({
  category,
  index = 0,
}: {
  category: TalentItem;
  index?: number;
}) {
  const Icon = category.icon;
  const { t } = useLang();

  return (
    <Link
      to="/registration"
      className={`talent-category-card group relative flex min-h-[360px] overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br ${category.cardTone} shadow-soft transition duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-2 hover:border-primary/50 hover:shadow-elegant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-[390px]`}
      style={{
        animationDelay: `${index * 95}ms`,
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_38%,rgba(200,169,106,0.32),transparent_42%),radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.08),transparent_28%)] transition duration-[380ms] group-hover:opacity-125" />

      <div className="relative z-10 flex h-full w-full flex-col p-5">
        <div className="grid h-11 w-11 place-items-center rounded-2xl border border-primary/30 bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </div>

        <div className="relative z-20 mt-5 max-w-[58%]">
          <h3 className="font-display text-3xl font-semibold">
            {t(category.nameKey)}
          </h3>

          <p className="mt-1 text-sm text-primary">
            {t(category.statKey)}
          </p>
        </div>

        <div className="absolute inset-x-8 bottom-5 h-12 rounded-full bg-black/45 blur-xl transition duration-[380ms] group-hover:bg-primary/20" />

        <MotionImage
          src={category.image}
          alt={category.alt}
          className={`talent-card-person absolute bottom-0 object-contain object-bottom drop-shadow-[0_24px_30px_rgba(0,0,0,0.48)] transition duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1 group-hover:scale-[1.04] ${category.cardImageStyle || "right-[-7%] h-[78%] w-[86%] sm:right-[-5%]"}`}
          style={{
            objectPosition: category.objectPosition,
          }}
        />
      </div>
    </Link>
  );
}

export function TalentCategories() {
  const { t } = useLang();

  return (
    <Section
      id="categories"
      eyebrow={t("home.categories.eyebrow")}
      title={t("home.categories.title")}
      subtitle={t("home.categories.subtitle")}
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {talentItems.map((category, index) => (
          <TalentCategoryCard
            key={category.nameKey}
            category={category}
            index={index}
          />
        ))}
      </div>
    </Section>
  );
}

const collagePeople = [
  {
    item: talentItems[4],
    className: "left-[-3%] bottom-0 z-20 h-[72%] w-[42%]",
    delay: "0ms",
  },
  {
    item: talentItems[0],
    className: "left-[21%] bottom-1 z-30 h-[82%] w-[40%]",
    delay: "90ms",
  },
  {
    item: talentItems[5],
    className: "right-[17%] bottom-2 z-20 h-[76%] w-[36%]",
    delay: "180ms",
  },
  {
    item: talentItems[6],
    className: "right-[-4%] bottom-0 z-10 h-[66%] w-[36%]",
    delay: "270ms",
  },
];

export function TalentPeopleCollage() {
  return (
    <div className="relative min-h-[360px] bg-[#f2dfb1] p-8 text-[#0b0b0b] sm:min-h-[430px] lg:min-h-[460px]">
      <div className="relative z-40 flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl gradient-primary shadow-soft">
          <Sparkles className="h-6 w-6" />
        </span>

        <span className="font-display text-2xl font-bold">
          Telent<span className="text-[#8a631e]">Fest</span>
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-[#f2dfb1] to-transparent" />

      <div className="absolute inset-x-6 bottom-8 h-16 rounded-full bg-black/20 blur-2xl" />

      {collagePeople.map(({ item, className, delay }) => (
        <MotionImage
          key={item.nameKey}
          src={item.image}
          alt={item.alt}
          className={`talent-collage-person absolute object-contain object-bottom drop-shadow-[0_24px_28px_rgba(0,0,0,0.28)] ${className}`}
          style={{
            animationDelay: delay,
            objectPosition: item.objectPosition,
          }}
        />
      ))}

      <div className="absolute -right-24 top-0 hidden h-full w-56 rotate-6 bg-[#090604] lg:block" />
    </div>
  );
}

export function FinalRegistrationCta() {
  const { t } = useLang();

  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="grid overflow-hidden rounded-[2rem] border border-primary/20 bg-[#090604] shadow-elegant lg:grid-cols-[0.95fr_1.05fr]">
        <TalentPeopleCollage />

        <div className="relative flex flex-col justify-center bg-[linear-gradient(135deg,#18100b,#0b0b0b_45%,#3f2a12)] p-8 text-foreground sm:p-12 lg:p-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(200,169,106,0.32),transparent_34%)]" />

          <div className="relative">
            <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl border border-primary/30 bg-primary/15 text-primary">
              <Heart className="h-6 w-6" />
            </div>

            <h2 className="text-3xl font-bold sm:text-4xl">
              {t("home.finalCta.title")}
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-7 text-foreground/78 sm:text-base">
              {t("home.finalCta.subtitle")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
