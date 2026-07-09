import { CalendarDays, Check, Handshake, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, type KeyboardEvent } from "react";
import { useLang } from "@/lib/i18n";

type SponsorshipPackage = {
  nameKey: string;
  amount: string;
  benefitKeys: string[];
  featured?: boolean;
};

const sponsorshipPackages: SponsorshipPackage[] = [
  {
    nameKey: "sponsorship.packages.title",
    amount: "₹75,000",
    featured: true,
    benefitKeys: ["titleIntegrated", "premiumLogo", "recognition", "social", "press", "fullPage", "led", "anchor"],
  },
  {
    nameKey: "sponsorship.packages.platinum",
    amount: "₹50,000",
    benefitKeys: ["premiumLogo", "recognition", "social", "press", "fullPage", "led"],
  },
  {
    nameKey: "sponsorship.packages.gold",
    amount: "₹35,000",
    benefitKeys: ["logoMaterials", "socialMention", "sessions", "led", "halfPage", "website"],
  },
  {
    nameKey: "sponsorship.packages.silver",
    amount: "₹25,000",
    benefitKeys: ["logoPlacement", "socialMention", "brochure", "led", "quarterPage"],
  },
  {
    nameKey: "sponsorship.packages.bronze",
    amount: "₹15,000",
    benefitKeys: ["selectMaterials", "eventAck", "led", "quarterPage"],
  },
];

const tabs = [
  { id: "recent", labelKey: "sponsorship.recentTab" },
  { id: "upcoming", labelKey: "sponsorship.upcomingTab" },
] as const;

type SponsorshipTab = (typeof tabs)[number]["id"];

export function SponsorshipTabs() {
  const [activeTab, setActiveTab] = useState<SponsorshipTab>("recent");
  const { t } = useLang();

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);
    const lastIndex = tabs.length - 1;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      setActiveTab(tabs[activeIndex === lastIndex ? 0 : activeIndex + 1].id);
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setActiveTab(tabs[activeIndex === 0 ? lastIndex : activeIndex - 1].id);
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActiveTab(tabs[0].id);
    }

    if (event.key === "End") {
      event.preventDefault();
      setActiveTab(tabs[lastIndex].id);
    }
  }

  return (
    <div className="space-y-10">
      <div
        role="tablist"
        aria-label={t("a11y.sponsorshipSections")}
        className="mx-auto grid w-full max-w-xl grid-cols-1 gap-3 rounded-3xl border border-primary/25 bg-card/70 p-2 shadow-soft sm:grid-cols-2"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`${tab.id}-sponsorship-tab`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`${tab.id}-sponsorship-panel`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={handleKeyDown}
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none",
                isActive
                  ? "gradient-accent border-transparent text-primary-foreground shadow-glow"
                  : "border-border bg-background/70 text-muted-foreground hover:border-primary/60 hover:text-foreground",
              )}
            >
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>

      <div
        key={activeTab}
        id={`${activeTab}-sponsorship-panel`}
        role="tabpanel"
        aria-labelledby={`${activeTab}-sponsorship-tab`}
        className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300"
      >
        {activeTab === "recent" ? <SponsorshipGrid /> : <UpcomingSponsorshipEmptyState />}
      </div>
    </div>
  );
}

export function SponsorshipGrid() {
  const { t } = useLang();

  return (
    <div>
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h3 className="text-2xl font-bold sm:text-3xl">{t("sponsorship.recentTitle")}</h3>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          {t("sponsorship.recentDesc")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6">
        {sponsorshipPackages.map((sponsorship, index) => (
          <SponsorshipCard
            key={sponsorship.nameKey}
            sponsorship={sponsorship}
            className={cn(
              "sm:col-span-1 lg:col-span-2",
              index === 3 && "lg:col-start-2",
              index === 4 && "lg:col-start-4",
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function SponsorshipCard({
  sponsorship,
  className,
}: {
  sponsorship: SponsorshipPackage;
  className?: string;
}) {
  const { t } = useLang();
  const sponsorshipName = t(sponsorship.nameKey);
  const enquiryLabel = `${sponsorshipName} - ${sponsorship.amount}`;
  const contactHref = `/contact?subject=${encodeURIComponent(`Sponsorship Enquiry: ${enquiryLabel}`)}`;

  return (
    <article
      className={cn(
        "group relative flex min-h-full flex-col overflow-hidden rounded-3xl border bg-[linear-gradient(180deg,oklch(0.13_0.02_85),oklch(0.06_0_0))] p-6 text-foreground shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-elegant motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        sponsorship.featured
          ? "border-primary/80 ring-1 ring-primary/30"
          : "border-accent/60 hover:border-primary/70",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-primary/10 blur-3xl transition group-hover:bg-primary/20 motion-reduce:transition-none" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="text-xl font-bold">{sponsorshipName}</h4>
            <div className="mt-3 text-4xl font-display font-bold text-gradient">
              {sponsorship.amount}
            </div>
          </div>
          <div
            className={cn(
              "grid h-11 w-11 shrink-0 place-items-center rounded-2xl border",
              sponsorship.featured
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-accent/50 bg-accent/15 text-secondary",
            )}
            aria-hidden="true"
          >
            <Handshake className="h-5 w-5" />
          </div>
        </div>

        <ul className="mt-6 space-y-3 text-sm leading-relaxed text-foreground/90">
          {sponsorship.benefitKeys.map((benefit) => (
            <li key={benefit} className="flex gap-2.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>{t(`sponsorship.benefits.${benefit}`)}</span>
            </li>
          ))}
        </ul>
      </div>

      <Button asChild className="mt-7 w-full border-0 gradient-primary text-primary-foreground">
        <a href={contactHref}>{t("sponsorship.enquireNow")}</a>
      </Button>
    </article>
  );
}

export function UpcomingSponsorshipEmptyState() {
  const { t } = useLang();

  return (
    <div className="mx-auto max-w-3xl rounded-3xl border border-primary/35 bg-[linear-gradient(180deg,oklch(0.14_0.01_85),oklch(0.07_0_0))] p-8 text-center shadow-soft sm:p-12">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl border border-primary/50 bg-primary/10 text-primary shadow-glow">
        <CalendarDays className="h-7 w-7" aria-hidden="true" />
      </div>
      <h3 className="mt-6 text-2xl font-bold sm:text-3xl">{t("sponsorship.upcomingTitle")}</h3>
      <p className="mx-auto mt-3 max-w-xl text-base text-foreground/90">
        {t("sponsorship.upcomingDesc")}
      </p>
      <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
        {t("sponsorship.stayConnected")}
      </p>
      <Button asChild className="mt-7 border-0 gradient-primary text-primary-foreground">
        <a href="/contact">
          <Megaphone className="h-4 w-4" aria-hidden="true" />
          {t("common.contactUs")}
        </a>
      </Button>
    </div>
  );
}
