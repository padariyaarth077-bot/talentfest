import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Section } from "@/components/site/Section";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/terms-and-conditions")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions | TelentFest" },
      { name: "description", content: "TelentFest terms and conditions — registration, payment, participation rules, and event policies." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <Section eyebrow="Legal" title="Terms & Conditions">
      <div className="mx-auto max-w-3xl space-y-5 text-sm leading-relaxed text-muted-foreground">
        <p>
          Registration is confirmed only after successful payment and verification.
        </p>
        <p>
          Registration fees are non-refundable and non-transferable unless otherwise announced by Telentfest.
        </p>
        <p>
          Participants must follow all event rules, schedules, and instructions issued by the organizers.
        </p>
        <p>
          Telentfest reserves the right to modify event dates, venue, schedule, judges, or competition format if necessary.
        </p>
        <p>
          The decision of the judges and organizing committee shall be final and binding.
        </p>
        <p>
          Any misconduct, inappropriate behavior, or submission of false information may result in disqualification without refund.
        </p>
        <p>
          Participants grant Telentfest permission to use their photographs, videos, performances, and testimonials for promotional purposes.
        </p>
        <p>
          Telentfest shall not be responsible for any personal loss, injury, or damage during the event.
        </p>
        <p>
          Participation in any Telentfest program indicates acceptance of these Terms & Conditions.
        </p>
        <p>
          All disputes, if any, shall be subject to the jurisdiction of the competent courts in Gujarat, India.
        </p>
        <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
          <FileText className="h-4 w-4 text-primary" />
          Last updated: July 2026
        </div>
      </div>
    </Section>
  );
}
