import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, CalendarDays, CheckCircle2, Home, ListChecks } from "lucide-react";
import { useEffect, useState } from "react";

import { fetchEmployeeAwardRegistration, type EmployeeAwardRecord } from "@/lib/employee-awards.functions";

export const Route = createFileRoute("/employee-award-ceremony-2026/success")({
  validateSearch: (search: Record<string, unknown>) => ({
    application: typeof search.application === "string" ? search.application : "",
  }),
  head: () => ({ meta: [{ title: "Employee Award Registration Submitted - Telent Fest" }] }),
  component: EmployeeAwardSuccessPage,
});

function EmployeeAwardSuccessPage() {
  const { application } = Route.useSearch();
  const [record, setRecord] = useState<EmployeeAwardRecord | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!application) {
      setError("Application number is missing.");
      return;
    }
    fetchEmployeeAwardRegistration({ data: { applicationNumber: application } })
      .then(setRecord)
      .catch(() => setError("Unable to load this registration confirmation."));
  }, [application]);

  return (
    <div className="min-h-screen bg-background py-12 sm:py-16">
      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-primary/25 bg-card/80 p-7 text-center shadow-elegant sm:p-10">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-primary/35 bg-primary/15 text-primary">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="mt-6 font-display text-4xl font-semibold">
            Registration Submitted Successfully
          </h1>
          <p className="mt-3 text-muted-foreground">
            Your Employee Award Ceremony 2026 registration has been received.
          </p>

          {error && (
            <div className="mt-8 rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {record && (
            <div className="mt-8 grid gap-4 rounded-2xl border border-border bg-background/60 p-5 text-left sm:grid-cols-2">
              <Info icon={Award} label="Applicant / Nominee" value={record.employee_full_name} />
              <Info icon={ListChecks} label="Application Number" value={record.application_number} />
              <Info
                icon={CalendarDays}
                label="Submission Date"
                value={new Date(record.submitted_at).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              />
              <Info label="Current Status" value={record.status.toUpperCase()} />
            </div>
          )}

          <p className="mt-6 text-sm text-muted-foreground">
            Our team will review your details and contact you using the submitted phone or email.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border px-5 text-sm font-semibold hover:bg-accent"
            >
              <Home className="h-4 w-4" />
              Return Home
            </Link>
            <Link
              to="/registration"
              className="inline-flex h-12 items-center justify-center rounded-xl gradient-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              View Another Registration Option
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof Award;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5 text-primary" />}
        {label}
      </div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}
