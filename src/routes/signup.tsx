import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Section } from "@/components/site/Section";
import { Button } from "@/components/ui/button";
import { getSupabaseConfigError, supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign up - Talent Fest" }, { name: "description", content: "Create your Talent Fest account." }] }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { full_name: name, phone },
        },
      });
      if (error) return toast.error(error.message);
      toast.success(t("auth.accountCreated"));
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("auth.signupFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Section eyebrow={t("auth.getStarted")} title={t("auth.signupTitle")} subtitle={t("auth.signupSubtitle")}>
      <div className="mx-auto max-w-md rounded-3xl border border-border bg-card p-8 shadow-soft">
        <form className="space-y-4" onSubmit={submit}>
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder={t("auth.fullName")} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <input required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("auth.email")} type="email" className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("auth.phone")} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <input required value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("auth.passwordMin")} type="password" minLength={6} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <Button type="submit" disabled={loading} className="w-full border-0 gradient-primary text-primary-foreground">
            {loading ? t("auth.creating") : t("auth.createAccount")}
          </Button>
          <div className="text-center text-sm text-muted-foreground">
            {t("auth.haveAccount")} <Link to="/login" className="text-primary hover:underline">{t("common.login")}</Link>
          </div>
        </form>
      </div>
    </Section>
  );
}
