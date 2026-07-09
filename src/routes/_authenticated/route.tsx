import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const loginTarget = location.pathname === "/admin" ? "/admin/login" : "/login";
    if (!isSupabaseConfigured()) throw redirect({ to: loginTarget });

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: loginTarget });
    return { user: data.user };
  },
  component: () => <Outlet />,
});
