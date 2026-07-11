import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Award, Sparkles, Ticket } from "lucide-react";

export const Route = createFileRoute("/registration")({
  head: () => ({ meta: [{ title: "Choose Your Registration - Telent Fest" }] }),
  component: RegistrationOptionsPage,
});

function RegistrationOptionsPage() {
  return (
    <div className="min-h-screen bg-background py-12 sm:py-16">
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            <Sparkles className="h-4 w-4" />
            Registration Options
          </div>
          <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight sm:text-6xl">
            Choose Your <span className="text-gradient">Registration</span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Select the registration type you want to continue with.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <RegistrationCard
            to="/entry-pass"
            icon={Ticket}
            title="TelentFest Entry Pass"
            description="Register as a participant or visitor and generate your official TelentFest entry pass."
            cta="Continue to Entry Pass"
          />
          <RegistrationCard
            to="/employee-award-ceremony-2026"
            icon={Award}
            title="Employee Award Ceremony 2026"
            description="Complete the Employee Award Ceremony 2026 nomination and registration form."
            cta="Open Registration Form"
          />
        </div>
      </section>
    </div>
  );
}

function RegistrationCard({
  to,
  icon: Icon,
  title,
  description,
  cta,
}: {
  to: "/entry-pass" | "/employee-award-ceremony-2026";
  icon: typeof Ticket;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <Link
      to={to}
      className="group relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-3xl border border-primary/20 bg-[linear-gradient(145deg,#17130e,#080706)] p-7 shadow-soft outline-none transition duration-300 hover:-translate-y-1 hover:border-primary/55 hover:shadow-elegant focus-visible:ring-2 focus-visible:ring-primary sm:p-9"
    >
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl transition group-hover:bg-primary/20" />
      <div>
        <div className="grid h-14 w-14 place-items-center rounded-2xl border border-primary/35 bg-primary/15 text-primary shadow-soft">
          <Icon className="h-7 w-7" />
        </div>
        <h2 className="mt-7 font-display text-3xl font-semibold text-foreground sm:text-4xl">
          {title}
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>
      <span className="mt-8 inline-flex w-fit items-center gap-2 rounded-full gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition group-hover:gap-3">
        {cta}
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

