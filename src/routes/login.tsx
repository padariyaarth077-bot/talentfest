import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Section } from "@/components/site/Section";
import { Button } from "@/components/ui/button";
import { getSupabaseConfigError, supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login - Telent Fest" },
      { name: "description", content: "Login to your Telent Fest account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const configError = getSupabaseConfigError();
    if (configError) {
      toast.error(configError);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return toast.error(error.message);
      toast.success(t("auth.welcomeToast"));
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("auth.loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Section eyebrow={t("auth.welcomeBack")} title={t("auth.loginTitle")} subtitle={t("auth.loginSubtitle")}>
      <div className="mx-auto max-w-md rounded-3xl border border-border bg-card p-8 shadow-soft">
        <form className="space-y-4" onSubmit={submit}>
          <input required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("auth.email")} type="email" className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <input required value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("auth.password")} type="password" className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <div className="flex justify-end text-xs">
            <Link to="/forgot-password" className="text-primary hover:underline">{t("auth.forgot")}</Link>
          </div>
          <Button type="submit" disabled={loading} className="w-full border-0 gradient-primary text-primary-foreground">
            {loading ? t("auth.signingIn") : t("common.login")}
          </Button>
          <div className="text-center text-sm text-muted-foreground">
            {t("auth.newHere")} <Link to="/signup" className="text-primary hover:underline">{t("auth.createAccount")}</Link>
          </div>
        </form>
      </div>
    </Section>
  );
}
