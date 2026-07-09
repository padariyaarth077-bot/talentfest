import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Section } from "@/components/site/Section";
import { verifyPassPublic } from "@/lib/passes.functions";
import { ShieldCheck, ShieldX, Sparkles } from "lucide-react";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/verify-pass/$entryId")({
  head: () => ({
    meta: [
      { title: "Verify Pass - Talent Fest" },
      { name: "description", content: "Verify a Talent Fest entry pass." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerifyPage,
});

type Result = Awaited<ReturnType<typeof verifyPassPublic>>;

function VerifyPage() {
  const { entryId } = Route.useParams();
  const { t } = useLang();
  const verify = useServerFn(verifyPassPublic);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("t") ?? "";
    (async () => {
      try {
        const r = await verify({ data: { entryId, token } });
        setResult(r);
      } catch {
        setResult({ valid: false });
      } finally {
        setLoading(false);
      }
    })();
  }, [entryId, verify]);

  if (loading) return <Section title={t("verify.verifying")}><div /></Section>;

  if (!result?.valid) {
    return (
      <Section title="">
        <div className="mx-auto max-w-md overflow-hidden rounded-3xl border border-red-500/30 bg-card shadow-elegant">
          <div className="grid place-items-center bg-red-500/15 px-6 py-8">
            <ShieldX className="h-12 w-12 text-red-500" />
            <div className="mt-3 font-display text-xl font-bold text-red-500">{t("verify.invalidTitle")}</div>
          </div>
          <div className="px-6 py-4 text-center text-sm text-muted-foreground">{t("verify.invalidDesc")}</div>
        </div>
      </Section>
    );
  }

  const p = result.pass;
  return (
    <Section title="">
      <div className="mx-auto max-w-md overflow-hidden rounded-3xl border border-primary/30 bg-card shadow-elegant">
        <div className="flex items-center justify-between px-6 py-5 gradient-hero">
          <div className="flex items-center gap-2 text-foreground">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-display font-bold">Talent Fest</span>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <ShieldCheck className="h-4 w-4" /> {t("verify.verified").toUpperCase()}
          </span>
        </div>
        <div className="flex gap-4 p-6">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-border bg-accent">
            {p.photo_url ? (
              <img src={p.photo_url} alt={p.participant_name} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-3xl font-bold text-primary">
                {p.participant_name.slice(0, 1)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{t("verify.participant")}</div>
            <div className="truncate text-lg font-semibold">{p.participant_name}</div>
            <div className="mt-1 font-mono text-xs">{p.entry_number}</div>
            <div className="mt-2 text-xs text-muted-foreground">{p.competition} · {p.category}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 px-6 pb-6 text-xs">
          {p.venue && <div><div className="text-muted-foreground">{t("verify.venue")}</div><div>{p.venue}</div></div>}
          {p.event_date && <div><div className="text-muted-foreground">{t("verify.date")}</div><div>{p.event_date}</div></div>}
          {p.hall && <div><div className="text-muted-foreground">{t("verify.hall")}</div><div>{p.hall}</div></div>}
          {p.stage && <div><div className="text-muted-foreground">{t("verify.stage")}</div><div>{p.stage}</div></div>}
        </div>
        <div className="flex justify-between border-t border-border bg-accent/40 px-6 py-3 text-xs">
          <span className="text-muted-foreground">{t("verify.status")}</span>
          <span className="font-medium uppercase tracking-wider">{p.status.replace("_", " ")}</span>
        </div>
      </div>
    </Section>
  );
}
