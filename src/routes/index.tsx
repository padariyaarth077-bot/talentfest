import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Award,
  Calendar,
  Check,
  ClipboardList,
  Clock,
  Handshake,
  Heart,
  MapPin,
  Megaphone,
  Music,
  ScanLine,
  Star,
  Ticket,
  Trophy,
  UploadCloud,
  UserPlus,
  Users,
  Video,
  Vote,
} from "lucide-react";
import { Section } from "@/components/site/Section";
import { SponsorshipTabs } from "@/components/site/SponsorshipSection";
import {
  FinalRegistrationCta as RealFinalRegistrationCta,
  PremiumHero as RealPremiumHero,
  TalentCategories as RealTalentCategories,
} from "@/components/site/TalentShowcase";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  component: Home,
});

const services = [
  { icon: UserPlus, key: "artistRegistration" },
  { icon: ClipboardList, key: "eventOrganization" },
  { icon: Trophy, key: "competitionManagement" },
  { icon: Music, key: "concertManagement" },
  { icon: Award, key: "awardCeremony" },
  { icon: Vote, key: "digitalVoting" },
  { icon: Megaphone, key: "talentPromotion" },
  { icon: Video, key: "mediaCoverage" },
  { icon: Handshake, key: "sponsorship" },
  { icon: ScanLine, key: "onlineEntry" },
];

const steps = [
  { icon: UserPlus, key: "register" },
  { icon: Users, key: "profile" },
  { icon: UploadCloud, key: "upload" },
];

const team = [
  { name: "JB Ahir", roleKey: "home.team.founder" },
  { name: "Priya Sharma", roleKey: "home.team.operations" },
  { name: "Rohan Verma", roleKey: "home.team.creative" },
  { name: "Ananya Iyer", roleKey: "home.team.marketing" },
];

const blogs = [
  { titleKey: "home.blog.tipTitle", catKey: "home.blog.tips", date: "Jun 12, 2026" },
  { titleKey: "home.blog.winnersTitle", catKey: "home.blog.stories", date: "May 28, 2026" },
  { titleKey: "home.blog.citiesTitle", catKey: "home.blog.updates", date: "May 05, 2026" },
];

const reviews = [
  { name: "Aarav Mehta", roleKey: "talents.singer", textKey: "home.reviews.singerReview" },
  { name: "Neha Kapoor", roleKey: "talents.painter", textKey: "home.reviews.painterReview" },
  { name: "Studio 47", roleKey: "home.reviews.sponsorRole", textKey: "home.reviews.sponsorReview" },
  { name: "Kabir Singh", roleKey: "talents.dancer", textKey: "home.reviews.dancerReview" },
];

function Home() {
  const { t } = useLang();

  return (
    <>
      <RealPremiumHero registerLabel={t("cta.register")} exploreLabel={t("cta.explore")} />

      <Section
        id="services"
        eyebrow={t("home.services.eyebrow")}
        title={<>{t("home.services.titlePrefix")} <span className="text-gradient">{t("home.services.titleHighlight")}</span></>}
        subtitle={t("home.services.subtitle")}
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s) => (
            <Link key={s.key} to="/register" className="block rounded-2xl border border-border bg-card p-6 hover-lift">
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl gradient-primary text-foreground">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{t(`home.services.${s.key}.title`)}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{t(`home.services.${s.key}.desc`)}</p>
            </Link>
          ))}
        </div>
      </Section>

      <Section
        id="about"
        eyebrow={t("home.about.eyebrow")}
        title={<>{t("home.about.titlePrefix")} <span className="text-gradient">JB Ahir</span></>}
        subtitle={t("home.about.body")}
      >
        <div className="grid items-center gap-10 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="mx-auto flex aspect-[9/16] w-full max-w-xs items-end justify-center overflow-hidden rounded-3xl border border-primary/35 bg-white shadow-elegant sm:max-w-sm lg:max-w-md">
              <img
                src="/people/jb-ahir-founder.png"
                alt="JB Ahir – Founder of Talent Fest"
                className="h-full w-full object-contain object-bottom"
                loading="lazy"
              />
            </div>
          </div>
          <div className="space-y-4 lg:col-span-3">
            <p className="leading-relaxed text-muted-foreground">{t("home.about.body")}</p>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              {["years", "cities", "artists", "producer"].map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />{t(`home.about.facts.${key}`)}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {["vision", "mission", "goal"].map((key) => (
            <Link key={key} to="/contact" className="block rounded-3xl border border-border bg-card p-8 shadow-soft hover-lift">
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl gradient-accent text-foreground">
                <Star className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-semibold">{t(`home.about.${key}.title`)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t(`home.about.${key}.desc`)}</p>
            </Link>
          ))}
        </div>
      </Section>

      <Section id="participate" eyebrow={t("home.participate.eyebrow")} title={t("home.participate.title")} subtitle={t("home.participate.subtitle")}>
        <div className="grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => (
            <Link key={s.key} to="/register" className="relative block rounded-3xl border border-border bg-card p-8 hover-lift">
              <div className="absolute -left-4 -top-4 grid h-10 w-10 place-items-center rounded-2xl gradient-accent font-bold text-foreground shadow-elegant">
                {i + 1}
              </div>
              <s.icon className="mb-4 h-8 w-8 text-primary" />
              <h3 className="text-lg font-semibold">{t(`home.participate.${s.key}.title`)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t(`home.participate.${s.key}.desc`)}</p>
            </Link>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-2 text-xs">
          {["video", "audio", "images", "pdf", "documents"].map((key) => (
            <span key={key} className="rounded-full bg-accent px-3 py-1.5 font-medium text-accent-foreground">{t(`home.participate.fileTypes.${key}`)}</span>
          ))}
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">{t("home.participate.note")}</p>
      </Section>

      <RealTalentCategories />

      <Section id="concert" eyebrow={t("home.concert.eyebrow")} title={t("home.concert.title")} subtitle={t("home.concert.subtitle")}>
        <div className="grid gap-5 lg:grid-cols-3">
          <Link to="/register" className="block rounded-3xl p-8 gradient-primary text-foreground shadow-elegant lg:col-span-2">
            <div className="text-xs uppercase tracking-widest opacity-80">{t("home.concert.grandFinale")}</div>
            <h3 className="mt-2 text-3xl font-bold">{t("home.concert.eventTitle")}</h3>
            <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {t("home.concert.venue")}</div>
              <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {t("home.concert.date")}</div>
              <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> {t("home.concert.time")}</div>
              <div className="flex items-center gap-2"><Ticket className="h-4 w-4" /> {t("home.concert.seats")}</div>
            </div>
            <div className="mt-8">
              <span className="inline-flex h-11 items-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90">{t("home.concert.bookTickets")}</span>
            </div>
          </Link>
          <Link to="/register" className="block rounded-3xl border border-border bg-card p-6 hover-lift">
            <h4 className="mb-4 font-semibold">{t("home.concert.lineup")}</h4>
            <ul className="space-y-3 text-sm">
              {["aarav", "nritya", "studio", "neha", "kabir"].map((key) => (
                <li key={key} className="flex gap-2"><Star className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{t(`home.concert.artists.${key}`)}</li>
              ))}
            </ul>
          </Link>
        </div>
        <div className="mt-6 h-64 overflow-hidden rounded-3xl border border-border">
          <iframe
            title="Venue map"
            src="https://www.openstreetmap.org/export/embed.html?bbox=72.82%2C19.02%2C72.87%2C19.06&layer=mapnik"
            className="h-full w-full"
            loading="lazy"
          />
        </div>
      </Section>

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

      <Section id="awards" eyebrow={t("home.awards.eyebrow")} title={t("home.awards.title")} subtitle={t("home.awards.subtitle")}>
        <div className="relative">
          <div className="absolute bottom-0 left-4 top-0 w-px bg-border md:left-1/2" />
          {[
            { year: "2023", key: "creative" },
            { year: "2024", key: "organizer" },
            { year: "2025", key: "impact" },
          ].map((e, i) => (
            <div key={e.year} className={`relative mb-8 flex md:items-center ${i % 2 ? "md:flex-row-reverse" : ""}`}>
              <div className="hidden md:block md:w-1/2" />
              <div className="absolute left-4 grid h-8 w-8 -translate-x-1/2 place-items-center rounded-full gradient-primary text-xs font-bold text-foreground shadow-elegant md:left-1/2">
                {e.year.slice(2)}
              </div>
              <div className="pl-14 md:w-1/2 md:px-8">
                <Link to="/gallery" className="block rounded-2xl border border-border bg-card p-6 shadow-soft hover-lift">
                  <div className="text-xs font-medium text-primary">{e.year}</div>
                  <h4 className="mt-1 font-semibold">{t(`home.awards.${e.key}.title`)}</h4>
                  <p className="mt-1 text-sm text-muted-foreground">{t(`home.awards.${e.key}.desc`)}</p>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="sponsor" eyebrow={t("home.sponsor.eyebrow")} title={t("home.sponsor.title")} subtitle={t("home.sponsor.subtitle")}>
        <SponsorshipTabs />
      </Section>

      <Section id="blog" eyebrow={t("home.blog.eyebrow")} title={t("home.blog.title")} subtitle={t("home.blog.subtitle")}>
        <div className="grid gap-5 md:grid-cols-3">
          {blogs.map((b, i) => (
            <Link key={b.titleKey} to="/gallery" className="block overflow-hidden rounded-3xl border border-border bg-card hover-lift">
              <div className={`h-40 ${["gradient-primary", "gradient-accent", "gradient-bronze"][i]}`} />
              <div className="p-6">
                <div className="text-xs font-medium text-primary">{t(b.catKey)} · {b.date}</div>
                <h3 className="mt-2 font-semibold">{t(b.titleKey)}</h3>
                <span className="mt-3 inline-flex items-center gap-1 text-sm text-primary transition-all group-hover:gap-2">
                  {t("home.blog.readMore")} <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <Section id="reviews" eyebrow={t("home.reviews.eyebrow")} title={t("home.reviews.title")} subtitle={t("home.reviews.subtitle")}>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {reviews.map((r) => (
            <Link key={r.name} to="/register" className="block rounded-3xl border border-border bg-card p-6 hover-lift">
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
    headingKey: "home.projects.recentHeading",
    titleKey: "home.projects.recentTitle",
    descKey: "home.projects.recentDesc",
    statusKey: "home.projects.completed",
    image: "/project-assets/registered-students-post.png",
    altKey: "home.projects.recentAlt",
  },
  {
    id: "upcoming",
    headingKey: "home.projects.upcomingHeading",
    titleKey: "home.projects.upcomingTitle",
    descKey: "home.projects.upcomingDesc",
    statusKey: "home.projects.comingSoon",
    image: null,
    altKey: null,
  },
];

function ProjectCard({ project }: { project: (typeof projectCards)[0] }) {
  const { t } = useLang();

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-primary/20 bg-[linear-gradient(180deg,#15110c,#090604)] p-5 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-elegant motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">{t(project.headingKey)}</h3>
        <span className="rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          {t(project.statusKey)}
        </span>
      </div>
      <div className="relative aspect-[5/7] overflow-hidden rounded-2xl border border-white/10 bg-[#0B0B0B]">
        {project.image ? (
          <img
            src={project.image}
            alt={t(project.altKey ?? project.titleKey)}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            draggable="false"
            loading="lazy"
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
