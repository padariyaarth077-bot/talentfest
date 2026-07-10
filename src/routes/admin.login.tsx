import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getSupabaseConfigError, supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin Login - Telent Fest" }] }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const configError = getSupabaseConfigError();
    if (configError) return;

    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (roleData) navigate({ to: "/admin" });
    });
  }, [navigate]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const configError = getSupabaseConfigError();
    if (configError) {
      setError(configError);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error("Unable to verify admin account.");

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (roleError) throw roleError;
      if (!roleData) {
        await supabase.auth.signOut();
        throw new Error("This account is not authorized for admin access.");
      }

      toast.success("Admin login successful.");
      navigate({ to: "/admin" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Admin login failed.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const sendReset = async () => {
    if (!email.trim()) {
      setError("Enter your admin email before requesting a password reset.");
      return;
    }

    setResetLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/admin/login`,
      });
      if (error) throw error;
      toast.success("Password reset email sent.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send reset email.";
      setError(message);
      toast.error(message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07111f] px-4 py-16 text-foreground">
      <div className="mx-auto max-w-md rounded-3xl border border-primary/20 bg-white/[0.04] p-8 shadow-elegant">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl gradient-primary text-primary-foreground">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <div className="mt-5 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Secure Admin</p>
          <h1 className="mt-2 text-3xl font-semibold">Telent Fest Admin Login</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with your Supabase admin account. Passwords are never stored in the frontend.
          </p>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block text-sm">
            <span className="mb-1.5 block text-muted-foreground">Email address</span>
            <span className="relative block">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-border bg-background/70 py-2.5 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="admin@example.com"
                autoComplete="email"
              />
            </span>
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block text-muted-foreground">Password</span>
            <span className="relative block">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-border bg-background/70 py-2.5 pl-9 pr-10 focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Enter admin password"
                autoComplete="current-password"
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
          </label>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground border-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Login as Admin
          </Button>

          <button
            type="button"
            onClick={sendReset}
            disabled={resetLoading}
            className="w-full text-center text-sm text-primary hover:underline disabled:opacity-60"
          >
            {resetLoading ? "Sending reset email..." : "Forgot password?"}
          </button>
        </form>
      </div>
    </div>
  );
}
