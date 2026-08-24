import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { isDbConfigured, db } from "@/db/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const loginTarget = location.pathname === "/admin" ? "/admin/login" : "/login";
    if (!isDbConfigured()) throw redirect({ to: loginTarget });

    const { data, error } = await db.auth.getUser();
    if (error || !data.user) throw redirect({ to: loginTarget });
    return { user: data.user };
  },
  component: () => <Outlet />,
});
