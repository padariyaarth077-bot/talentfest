import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Section } from "@/components/site/Section";
import { FileText } from "lucide-react";
import { businessDetails } from "@/lib/business-details";

export const Route = createFileRoute("/terms-and-conditions")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions | TelentFest" },
      {
        name: "description",
        content:
          "TELENTFEST OFFICIAL terms and conditions for registrations, programs, seminars, competitions and events.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <Section eyebrow="Legal" title="Terms & Conditions">
      <div className="mx-auto max-w-3xl space-y-5 text-sm leading-relaxed text-muted-foreground">
        <p>
          These Terms and Conditions apply to registrations, programs, seminars, competitions and
          events organized by TELENTFEST OFFICIAL, operating as Telentfest Training Institute.
        </p>
        <p>Registration is confirmed only after successful payment and verification.</p>
        <p>
          Registration fees are non-refundable and non-transferable unless otherwise announced by
          TELENTFEST OFFICIAL or stated in the Refund and Cancellation Policy.
        </p>
        <p>
          Participants must follow all event rules, schedules and instructions issued by the
          organizers.
        </p>
        <p>
          TELENTFEST OFFICIAL reserves the right to modify event dates, venues, schedules, judges,
          speakers, guests or competition formats where reasonably necessary.
        </p>
        <p>The decision of the judges and organizing committee shall be final and binding.</p>
        <p>
          Misconduct, inappropriate behaviour, violation of event rules or submission of false
          information may result in disqualification without a refund.
        </p>
        <p>
          Participants grant TELENTFEST OFFICIAL permission to use their photographs, videos,
          performances, recordings and testimonials for promotional, educational and marketing
          purposes.
        </p>
        <p>
          TELENTFEST OFFICIAL shall not be responsible for personal belongings lost during an event
          or for losses caused by circumstances beyond its reasonable control.
        </p>
        <p>
          Failed, pending and duplicate transactions will be handled according to the Refund and
          Cancellation Policy.
        </p>
        <p>
          Participation in any Telentfest program indicates acceptance of these Terms and
          Conditions.
        </p>
        <p>
          All disputes shall be subject to the jurisdiction of the competent courts in Gujarat,
          India.
        </p>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Legal Business Details</h2>
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Legal Business Name
              </p>
              <p className="mt-1 font-semibold text-foreground">{businessDetails.legalName}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Registered Address
              </p>
              <div className="mt-1">
                {businessDetails.addressLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
          <FileText className="h-4 w-4 text-primary" />
          Last updated: July 2026
        </div>
      </div>
    </Section>
  );
}
