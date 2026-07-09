import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Section } from "@/components/site/Section";
import { Button } from "@/components/ui/button";
import { Ticket, ArrowRight, LogOut } from "lucide-react";

type Pass = {
  id: string;
  entry_number: string;
  competition: string;
  category: string;
  status: string;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "My Dashboard — Talent Fest" }] }),
  component: DashboardPage,
});

const statusStyles: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  approved: "bg-emerald-500/15 text-emerald-500",
  rejected: "bg-red-500/15 text-red-500",
  checked_in: "bg-blue-500/15 text-blue-500",
  completed: "bg-purple-500/15 text-purple-500",
  cancelled: "bg-zinc-500/15 text-zinc-400",
  expired: "bg-zinc-800/40 text-zinc-500",
};

function DashboardPage() {
  const [passes, setPasses] = useState<Pass[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      setEmail(userData.user?.email ?? "");
      const { data } = await supabase
        .from("entry_passes")
        .select("id, entry_number, competition, category, status, created_at")
        .order("created_at", { ascending: false });
      setPasses((data as Pass[] | null) ?? []);
      setLoading(false);
    })();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <Section eyebrow={`Signed in as ${email}`} title="My Entry Passes" subtitle="Your submissions and their approval status.">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <Link to="/register">
            <Button className="gradient-primary text-primary-foreground border-0">
              <Ticket className="h-4 w-4" /> Register for a Competition
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</Button>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground py-12">Loading…</div>
        ) : passes.length === 0 ? (
          <div className="text-center py-16 rounded-3xl border border-dashed border-border bg-card">
            <Ticket className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No entries yet. Register to get your first entry pass.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {passes.map((p) => (
              <Link
                key={p.id}
                to="/pass/$entryId"
                params={{ entryId: p.id }}
                className="p-5 rounded-2xl bg-card border border-border hover:border-primary/50 transition-colors flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-accent">{p.entry_number}</span>
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${statusStyles[p.status]}`}>
                      {p.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="font-semibold truncate">{p.competition}</div>
                  <div className="text-xs text-muted-foreground">{p.category}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}