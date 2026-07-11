import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Section } from "@/components/site/Section";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | TelentFest" },
      { name: "description", content: "TelentFest Training Institute privacy policy — how we collect, use, and protect your personal information." },
    ],
  }),
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <Section eyebrow="Legal" title="Privacy Policy">
      <div className="mx-auto max-w-3xl space-y-5 text-sm leading-relaxed text-muted-foreground">
        <p>
          Telentfest Training Institute respects your privacy and is committed to protecting your personal information.
        </p>
        <p>
          We collect only the information required for registration, communication, and event management.
        </p>
        <p>
          Your personal data will never be sold or shared with third parties without your consent, except where required by law.
        </p>
        <p>
          Photos, videos, and recordings taken during events may be used for promotional, educational, and marketing purposes.
        </p>
        <p>
          Participants are responsible for providing accurate and complete information during registration.
        </p>
        <p>
          We implement reasonable security measures to protect your personal data.
        </p>
        <p>
          By registering with Telentfest, you agree to our Privacy Policy.
        </p>
        <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
          <Shield className="h-4 w-4 text-primary" />
          Last updated: July 2026
        </div>
      </div>
    </Section>
  );
}
