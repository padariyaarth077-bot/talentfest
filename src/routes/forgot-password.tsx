import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Section } from "@/components/site/Section";
import { Button } from "@/components/ui/button";
import { db } from "@/db/client";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot Password - Telent Fest" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (password !== confirmPassword) throw new Error("New password and confirm password must match.");
      const { error } = await db.auth.resetPasswordForEmail(email, { password });
      if (error) throw error;
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Section eyebrow={t("auth.resetEyebrow")} title={t("auth.resetTitle")} subtitle="Set a new admin password directly. No email is sent.">
      <div className="mx-auto max-w-md rounded-3xl border border-border bg-card p-8 shadow-soft">
        {!done ? (
          <form onSubmit={submit} className="space-y-4">
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t("auth.registeredEmail")}
              type="email"
              required
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="relative block">
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="New password"
                type={showPassword ? "text" : "password"}
                minLength={8}
                required
                className="w-full rounded-xl border border-border bg-background py-2.5 pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
            <span className="relative block">
              <input
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm new password"
                type={showConfirmPassword ? "text" : "password"}
                minLength={8}
                required
                className="w-full rounded-xl border border-border bg-background py-2.5 pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
            {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
            <Button disabled={loading} className="w-full border-0 gradient-primary text-primary-foreground">
              {loading ? "Updating..." : "Update password"}
            </Button>
          </form>
        ) : (
          <div className="py-6 text-center">
            <div className="font-semibold">{t("auth.resetSuccess")}</div>
            <Link to="/admin/login" className="mt-4 inline-block text-sm text-primary hover:underline">{t("auth.backToLogin")}</Link>
          </div>
        )}
      </div>
    </Section>
  );
}
