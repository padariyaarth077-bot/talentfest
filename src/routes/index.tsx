import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Award,
  Briefcase,
  Calendar,
  Check,
  Clock,
  Compass,
  Eye,
  Flag,
  Heart,
  MapPin,
  Megaphone,
  Music,
  Star,
  Target,
  Ticket,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { Section } from "@/components/site/Section";
import { SponsorshipTabs } from "@/components/site/SponsorshipSection";
import {
  FinalRegistrationCta as RealFinalRegistrationCta,
  PremiumHero as RealPremiumHero,
  TalentCategories as RealTalentCategories,
} from "@/components/site/TalentShowcase";
import { useLang } from "@/lib/i18n";
import {
  type BlogPost,
  type ConcertArtist,
  type ConcertSettings,
  fetchConcertContent,
  fetchPublishedBlogPosts,
  resolveConcertMapUrls,
} from "@/lib/public-content.functions";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

export const Route = createFileRoute("/")({
  component: Home,
});

const services = [
  { icon: Megaphone, key: "motivationalSeminar" },
  { icon: Award, key: "teachersTraining" },
  { icon: Heart, key: "parentingSeminar" },
  { icon: Briefcase, key: "corporateTraining" },
  { icon: Users, key: "staffTraining" },
  { icon: Compass, key: "careerCounselling" },
  { icon: Star, key: "talentIdentification" },
  { icon: Trophy, key: "talentShow" },
];

const team = [
  { name: "JB Ahir", roleKey: "home.team.founder" },
  { name: "Priya Sharma", roleKey: "home.team.operations" },
  { name: "Rohan Verma", roleKey: "home.team.creative" },
  { name: "Ananya Iyer", roleKey: "home.team.marketing" },
];

const reviews = [
  { name: "Aarav Mehta", roleKey: "talents.singer", textKey: "home.reviews.singerReview" },
  { name: "Neha Kapoor", roleKey: "talents.painter", textKey: "home.reviews.painterReview" },
  { name: "Studio 47", roleKey: "home.reviews.sponsorRole", textKey: "home.reviews.sponsorReview" },
  { name: "Kabir Singh", roleKey: "talents.dancer", textKey: "home.reviews.dancerReview" },
];

function Home() {
  const { t } = useLang();
  const [concert, setConcert] = React.useState<{ settings: ConcertSettings; artists: ConcertArtist[] } | null>(null);
  const [posts, setPosts] = React.useState<BlogPost[]>([]);

  React.useEffect(() => {
    fetchConcertContent().then(setConcert).catch(() => undefined);
    fetchPublishedBlogPosts({ data: { limit: 3 } }).then(setPosts).catch(() => undefined);
  }, []);

  const [selectedService, setSelectedService] = React.useState<(typeof services)[number] | null>(null);
  const concertSettings = concert?.settings;
  const concertArtists = concert?.artists ?? [];

  return (
    <>
      <RealPremiumHero registerLabel={t("cta.register")} exploreLabel={t("cta.explore")} />

      <Section
        id="services"
        eyebrow={t("home.services.eyebrow")}
        title={<>{t("home.services.titlePrefix")} <span className="text-gradient">{t("home.services.titleHighlight")}</span></>}
        subtitle={t("home.services.subtitle")}
      >
        <p className="mx-auto mb-8 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">
          {t("home.services.intro")}
        </p>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSelectedService(s)}
                className="group block w-full rounded-2xl border border-border bg-card p-6 text-left transition duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-[0_0_20px_rgba(212,175,55,0.15)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl gradient-primary text-foreground transition duration-300 group-hover:shadow-[0_0_14px_rgba(212,175,55,0.25)]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{t(`home.services.${s.key}.title`)}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{t(`home.services.${s.key}.desc`)}</p>
              </button>
            );
          })}
        </div>

        <Dialog open={selectedService !== null} onOpenChange={(o) => { if (!o) setSelectedService(null); }}>
          <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto sm:max-w-xl">
            <VisuallyHidden>
              <DialogTitle>{selectedService ? t(`home.services.${selectedService.key}.title`) : ""}</DialogTitle>
            </VisuallyHidden>
            {selectedService && (
              <div className="space-y-5 pr-1">
                <div className="flex items-center gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl gradient-primary text-foreground">
                    <selectedService.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{t(`home.services.${selectedService.key}.title`)}</h3>
                    <p className="text-sm text-muted-foreground">{t(`home.services.${selectedService.key}.desc`)}</p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{t(`home.services.${selectedService.key}.fullDesc`)}</p>
                <div className="space-y-2.5">
                  {(t(`home.services.${selectedService.key}.topics`, { returnObjects: true }) as string[]).map((topic, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
                        {i + 1}
                      </span>
                      <span>{topic}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </Section>

      <section id="purpose" className="relative overflow-hidden py-20 md:py-28">
        <div className="pointer-events-none absolute inset-0 -z-0" aria-hidden="true">
          <div className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/5 blur-[100px]" />
          <div className="absolute -left-20 top-1/3 h-40 w-40 rounded-full border border-primary/10" />
          <div className="absolute -right-10 top-2/3 h-28 w-28 rounded-full border border-primary/10" />
        </div>
        <div className="container relative z-10 mx-auto max-w-7xl px-4">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">{t("home.purpose.eyebrow")}</p>
            <h2 className="text-3xl font-bold md:text-4xl">
              {t("home.purpose.titlePrefix")}{" "}
              <span className="text-gradient">{t("home.purpose.titleHighlight")}</span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t("home.purpose.subtitle")}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {([
              { icon: Eye, key: "vision" },
              { icon: Target, key: "mission" },
              { icon: Flag, key: "goal" },
            ] as const).map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.key}
                  className="group relative flex flex-col rounded-2xl border border-border bg-card p-8 transition duration-300 hover:-translate-y-1 hover:border-primary/50 hover:bg-card/80 hover:shadow-[0_0_24px_rgba(212,175,55,0.10)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <div className="mb-5 grid h-14 w-14 place-items-center rounded-full border border-primary/30 bg-primary/10 transition duration-300 group-hover:shadow-[0_0_18px_rgba(212,175,55,0.25)]">
                    <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                  </div>
                  <span className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
                    {t(`home.purpose.${item.key}.label`)}
                  </span>
                  <h3 className="mb-3 text-xl font-bold text-foreground">
                    {t(`home.purpose.${item.key}.title`)}
                  </h3>
                  <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                    {t(`home.purpose.${item.key}.desc`)}
                  </p>
                  <div className="mt-6 h-px w-12 bg-primary/40 transition-all duration-300 group-hover:w-full group-hover:bg-primary/60" />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Section
        id="about"
        eyebrow={t("home.about.eyebrow")}
        title={<>{t("home.about.titlePrefix")} <span className="text-gradient">JB Ahir</span></>}
      >
        <div className="grid items-start gap-8 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="mx-auto flex aspect-[9/16] w-full max-w-xs items-end justify-center overflow-hidden rounded-3xl border border-primary/35 bg-white shadow-elegant sm:max-w-sm lg:max-w-md">
              <img
                src="/people/jb-ahir-founder.png"
                alt="JB Ahir – Founder of Telent Fest"
                className="h-full w-full object-contain object-bottom"
                loading="lazy"
              />
            </div>
          </div>
          <div className="space-y-6 lg:col-span-3">
            <p className="leading-relaxed text-muted-foreground">{t("home.about.body")}</p>

            <div className="rounded-2xl border border-primary/20 bg-card p-5 shadow-soft">
              <h3 className="mb-2 text-lg font-semibold">About TelentFest</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{t("home.about.aboutTelentFest")}</p>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-card p-5 shadow-soft">
              <h3 className="mb-2 text-lg font-semibold">Founder & Motivational Speaker</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{t("home.about.founder")}</p>
            </div>

            <div className="grid gap-2 text-sm sm:grid-cols-2">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                  <span>{t(`home.about.facts.${i}`)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <RealTalentCategories />

      {concertSettings && (
        <Section
          id="concert"
          eyebrow={concertSettings.eyebrow || t("home.concert.eyebrow")}
          title={concertSettings.title || t("home.concert.title")}
          subtitle={concertSettings.subtitle || t("home.concert.subtitle")}
        >
          <div className="grid gap-5 lg:grid-cols-3">
            <a
              href={concertSettings.button_url || "/registration"}
              className="block rounded-3xl p-8 gradient-primary text-foreground shadow-elegant lg:col-span-2"
              target={concertSettings.button_url?.startsWith("http") ? "_blank" : undefined}
              rel={concertSettings.button_url?.startsWith("http") ? "noopener noreferrer" : undefined}
            >
              <div className="text-xs uppercase tracking-widest opacity-80">{concertSettings.event_label || t("home.concert.grandFinale")}</div>
              <h3 className="mt-2 text-3xl font-bold">{concertSettings.event_title || t("home.concert.eventTitle")}</h3>
              <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {concertSettings.venue || t("home.concert.venue")}</div>
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {formatDisplayDate(concertSettings.event_date) || t("home.concert.date")}</div>
                <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> {formatDisplayTimeRange(concertSettings.start_time, concertSettings.end_time) || formatDisplayTime(concertSettings.start_time) || t("home.concert.time")}</div>
                <div className="flex items-center gap-2"><Ticket className="h-4 w-4" /> {concertSettings.price_text || t("home.concert.seats")}</div>
              </div>
              <div className="mt-8">
                <span className="inline-flex h-11 items-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90">{concertSettings.button_text || t("home.concert.bookTickets")}</span>
              </div>
            </a>
            <div className="block rounded-3xl border border-border bg-card p-6">
              {concertArtists.length > 0 ? (
                <>
                  <h4 className="mb-4 font-semibold">{t("home.concert.lineup")}</h4>
                  <ul className="space-y-3 text-sm">
                    {concertArtists.map((artist) => (
                      <li key={artist.id ?? artist.artist_name} className="flex gap-2">
                        <Star className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span><strong>{artist.artist_name}</strong>{artist.performance_type ? ` — ${artist.performance_type}` : ""}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 py-4 text-center text-sm text-muted-foreground">
                  <Music className="h-6 w-6 opacity-40" />
                  <p>Lineup will be announced soon.</p>
                </div>
              )}
            </div>
          </div>
          <div className="mt-6 h-64 overflow-hidden rounded-3xl border border-border">
            {(() => {
              const { embedUrl, openInMapsUrl } = resolveConcertMapUrls(concertSettings);
              // Security: reject non-Google-Maps URLs
              const safeSrc = embedUrl.startsWith("https://www.google.com/maps") ? embedUrl : "";
              return safeSrc ? (
                <iframe
                  title="TelentFest Grand Finale venue map"
                  src={safeSrc}
                  className="h-full w-full"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <a
                  href={openInMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-full w-full place-items-center text-sm text-muted-foreground hover:text-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <MapPin className="h-6 w-6 opacity-40" />
                    <span>View on Google Maps</span>
                  </div>
                </a>
              );
            })()}
          </div>
        </Section>
      )}

      <Section id="team" eyebrow={t("home.team.eyebrow")} title={t("home.team.title")} subtitle={t("home.team.subtitle")}>
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
          {team.map((m, i) => (
            <Link key={m.name} to="/contact" className="block overflow-hidden rounded-3xl border border-border bg-card hover-lift">
              <div className={`grid aspect-square place-items-center ${["gradient-primary", "gradient-accent", "gradient-bronze", "gradient-dark"][i % 4]}`}>
                <div className="font-display text-5xl font-bold text-foreground/90">{m.name.split(" ").map((n) => n[0]).join("")}</div>
              </div>
              <div className="p-4">
                <div className="font-semibold">{m.name}</div>
                <div className="text-xs text-muted-foreground">{t(m.roleKey)}</div>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <Section id="projects" eyebrow={t("home.projects.eyebrow")} title={t("home.projects.title")} subtitle={t("home.projects.subtitle")}>
        <div className="grid gap-6 lg:grid-cols-2">
          {projectCards.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </Section>


      <Section id="sponsor" eyebrow={t("home.sponsor.eyebrow")} title={t("home.sponsor.title")} subtitle={t("home.sponsor.subtitle")}>
        <SponsorshipTabs />
      </Section>

      <Section id="blog" eyebrow={t("home.blog.eyebrow")} title={t("home.blog.title")} subtitle={t("home.blog.subtitle")}>
        <div className="grid gap-5 md:grid-cols-3">
          {posts.map((post, i) => (
            <a key={post.slug} href={`/blog/${post.slug}`} className="block overflow-hidden rounded-3xl border border-border bg-card hover-lift">
              <div className={`h-40 overflow-hidden bg-[#0B0B0B] ${post.thumbnail_url ? "" : ["gradient-primary", "gradient-accent", "gradient-bronze"][i % 3]}`}>
                {post.thumbnail_url && (
                  <img
                    src={post.thumbnail_url}
                    alt={post.thumbnail_alt || post.title}
                    className="h-full w-full object-contain object-center transition duration-500"
                    loading="lazy"
                    decoding="async"
                  />
                )}
              </div>
              <div className="p-6">
                <div className="text-xs font-medium text-primary">{post.category} - {formatDisplayDate(post.published_at)}</div>
                <h3 className="mt-2 font-semibold">{post.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm text-primary transition-all group-hover:gap-2">
                  {t("home.blog.readMore")} <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </a>
          ))}
        </div>
      </Section>

      <Section id="reviews" eyebrow={t("home.reviews.eyebrow")} title={t("home.reviews.title")} subtitle={t("home.reviews.subtitle")}>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {reviews.map((r) => (
            <Link key={r.name} to="/registration" className="block rounded-3xl border border-border bg-card p-6 hover-lift">
              <div className="mb-3 flex gap-1 text-secondary">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
              </div>
              <p className="text-sm">"{t(r.textKey)}"</p>
              <div className="mt-4 flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full text-xs font-bold gradient-accent text-foreground">
                  {r.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <div className="text-sm font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{t(r.roleKey)}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <RealFinalRegistrationCta />
    </>
  );
}

const projectCards = [
  {
    id: "recent",
    headingKey: "home.projects.upcomingHeading",
    titleKey: "home.projects.upcomingTitle",
    descKey: "home.projects.upcomingDesc",
    statusKey: "home.projects.comingSoon",
    image: "/project-assets/registered-students-post.png",
    altKey: null,
  },
  {
    id: "upcoming",
    headingKey: "home.projects.upcomingHeading",
    titleKey: "home.projects.upcomingTitle",
    descKey: "home.projects.upcomingDesc",
    statusKey: "home.projects.comingSoon",
    image: "/project-assets/upcoming-project-poster.jpeg",
    altKey: null,
  },
];

function ProjectCard({ project }: { project: (typeof projectCards)[0] }) {
  const { t } = useLang();
  const [imgError, setImgError] = React.useState(false);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-primary/20 bg-[linear-gradient(180deg,#15110c,#090604)] p-5 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-elegant motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">{t(project.headingKey)}</h3>
        <span className="rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          {t(project.statusKey)}
        </span>
      </div>
      <div className="relative min-h-[280px] overflow-hidden rounded-2xl border border-white/10 bg-[#0B0B0B] sm:min-h-[340px]">
        {project.image && !imgError ? (
          <img
            src={project.image}
            alt={project.altKey ? t(project.altKey) : "Upcoming Project Image"}
            className="h-full w-full object-contain object-center transition duration-500 motion-reduce:transition-none"
            draggable="false"
            loading="lazy"
            decoding="async"
            onError={() => {
              console.warn("Project image failed to load:", project.image);
              setImgError(true);
            }}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.16),transparent_58%)] px-8 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl border border-primary/30 bg-primary/10 text-primary shadow-soft">
              <Heart className="h-7 w-7" />
            </div>
            <div>
              <div className="text-xl font-semibold text-foreground">{t("home.projects.placeholderTitle")}</div>
              <div className="mt-2 text-sm text-muted-foreground">{t("home.projects.placeholderDesc")}</div>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col pt-5">
        <h4 className="text-2xl font-semibold">{t(project.titleKey)}</h4>
        <p className="mt-2 flex-1 text-sm leading-7 text-muted-foreground">{t(project.descKey)}</p>
      </div>
    </article>
  );
}

function formatDisplayDate(value?: string | null) {
  if (!value) return "";
  if (/^\d{1,2}\s+[A-Za-z]+\s+\d{4}$/.test(value.trim())) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(d);
    }
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(parsed);
}

function formatDisplayTime(value?: string | null) {
  if (!value) return "";
  if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(value.trim())) {
    return value.trim().toUpperCase();
  }
  const parts = value.split(":");
  const hours = parseInt(parts[0], 10);
  const minutes = parts[1] || "00";
  if (isNaN(hours)) return value;
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${ampm}`;
}

function formatDisplayTimeRange(start?: string | null, end?: string | null) {
  if (!start) return "";
  const fStart = formatDisplayTime(start);
  if (!end) return fStart;
  const fEnd = formatDisplayTime(end);
  return `${fStart} to ${fEnd}`;
}


