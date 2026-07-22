import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Section } from "@/components/site/Section";
import { Shield } from "lucide-react";
import { businessDetails } from "@/lib/business-details";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | TelentFest" },
      {
        name: "description",
        content:
          "TELENTFEST OFFICIAL privacy policy for registration, communication, payment processing and event management.",
      },
    ],
  }),
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <Section eyebrow="Legal" title="Privacy Policy">
      <div className="mx-auto max-w-3xl space-y-5 text-sm leading-relaxed text-muted-foreground">
        <p>
          TELENTFEST OFFICIAL, operating as Telentfest Training Institute, respects your privacy and
          is committed to protecting your personal information.
        </p>
        <p>
          We collect only the information required for participant registration, communication,
          payment processing, event management and providing our services.
        </p>
        <p>
          We do not sell or rent personal information. Necessary information may be shared with
          authorized payment gateways, including Paytm, banking partners, service providers and
          government authorities for payment processing, fraud prevention, service delivery and
          legal compliance.
        </p>
        <p>
          Payment information is processed securely through the selected payment gateway. TELENTFEST
          OFFICIAL does not directly store complete card numbers, CVV details, UPI PINs, banking
          passwords or other sensitive payment credentials.
        </p>
        <p>
          Photos, videos and recordings taken during Telentfest programs or events may be used for
          promotional, educational and marketing purposes.
        </p>
        <p>
          Participants are responsible for providing accurate and complete information during
          registration.
        </p>
        <p>
          We implement reasonable technical and organizational security measures to protect personal
          information.
        </p>
        <p>
          By registering for any Telentfest program or event, participants agree to this Privacy
          Policy.
        </p>

        <ContactDetails />

        <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
          <Shield className="h-4 w-4 text-primary" />
          Last updated: July 2026
        </div>
      </div>
    </Section>
  );
}

function ContactDetails() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">Contact Details</h2>
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
          <a href={businessDetails.emailHref} className="break-all transition hover:text-primary">
            {businessDetails.email}
          </a>
        </p>
      </div>
    </div>
  );
}
