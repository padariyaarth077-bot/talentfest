import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Section } from "@/components/site/Section";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot Password - Telent Fest" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { t } = useLang();
  const [step, setStep] = useState<"email" | "otp" | "done">("email");

  return (
    <Section eyebrow={t("auth.resetEyebrow")} title={t("auth.resetTitle")} subtitle={t("auth.resetSubtitle")}>
      <div className="mx-auto max-w-md rounded-3xl border border-border bg-card p-8 shadow-soft">
        {step === "email" && (
          <form onSubmit={(e) => { e.preventDefault(); setStep("otp"); }} className="space-y-4">
            <input placeholder={t("auth.registeredEmail")} type="email" required className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <Button className="w-full border-0 gradient-primary text-primary-foreground">{t("auth.sendOtp")}</Button>
          </form>
        )}
        {step === "otp" && (
          <form onSubmit={(e) => { e.preventDefault(); setStep("done"); }} className="space-y-4">
            <div className="flex justify-center gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <input key={i} maxLength={1} className="h-12 w-11 rounded-xl border border-border bg-background text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-ring" />
              ))}
            </div>
            <Button className="w-full border-0 gradient-primary text-primary-foreground">{t("auth.verifyOtp")}</Button>
          </form>
        )}
        {step === "done" && (
          <div className="py-6 text-center">
            <div className="font-semibold">{t("auth.resetSuccess")}</div>
            <Link to="/login" className="mt-4 inline-block text-sm text-primary hover:underline">{t("auth.backToLogin")}</Link>
          </div>
        )}
      </div>
    </Section>
  );
}
