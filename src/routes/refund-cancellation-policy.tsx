import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { Section } from "@/components/site/Section";
import { businessDetails } from "@/lib/business-details";

export const Route = createFileRoute("/refund-cancellation-policy")({
  head: () => ({
    meta: [
      { title: "Refund and Cancellation Policy | TelentFest" },
      {
        name: "description",
        content:
          "Refund and cancellation policy for TELENTFEST OFFICIAL registrations, programs, seminars, competitions and events.",
      },
    ],
  }),
  component: RefundCancellationPolicyPage,
});

function RefundCancellationPolicyPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <Section eyebrow="Legal" title="Refund and Cancellation Policy">
      <div className="mx-auto max-w-3xl space-y-5 text-sm leading-relaxed text-muted-foreground">
        <p>
          Registration fees paid for Telentfest programs, seminars, competitions or events are
          generally non-refundable and non-transferable after registration confirmation, except
          where otherwise expressly announced by TELENTFEST OFFICIAL.
        </p>
        <p>
          If an event is cancelled by TELENTFEST OFFICIAL, eligible participants may receive a
          refund of the applicable registration fee or may be offered an alternative event or
          revised registration arrangement.
        </p>
        <p>
          If an event is postponed or rescheduled, the existing registration will normally remain
          valid for the revised date. A refund will only be available when specifically announced by
          TELENTFEST OFFICIAL.
        </p>
        <p>
          No refund will be provided for failure to attend an event, voluntary withdrawal after
          registration, disqualification, misconduct, incorrect participant information or failure
          to comply with event rules.
        </p>
        <p>
          If a payment fails but the amount is debited, or if the participant is charged more than
          once, the participant must contact TELENTFEST OFFICIAL and provide:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Participant name</li>
          <li>Registered mobile number</li>
          <li>Order or registration ID</li>
          <li>Transaction ID</li>
          <li>Payment date</li>
          <li>Payment amount</li>
          <li>Screenshot or proof of payment</li>
        </ul>
        <p>
          After verification, an eligible refund will be initiated to the original payment method.
        </p>
        <p>
          Approved refunds will normally be initiated within 7 business days. The final credit time
          may depend on Paytm, the participant's bank, card issuer or payment provider.
        </p>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">
            For refund-related assistance, contact:
          </h2>
          <div className="mt-3 space-y-1">
            <p className="font-semibold text-foreground">{businessDetails.legalName}</p>
            {businessDetails.addressLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p className="pt-2">
              Phone:{" "}
              <a href={businessDetails.phoneHref} className="transition hover:text-primary">
                {businessDetails.phone}
              </a>
            </p>
            <p>
              Email:{" "}
              <a
                href={businessDetails.emailHref}
                className="break-all transition hover:text-primary"
              >
                {businessDetails.email}
              </a>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
          <RotateCcw className="h-4 w-4 text-primary" />
          Last updated: July 2026
        </div>
      </div>
    </Section>
  );
}
