import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Section } from "@/components/site/Section";
import { Button } from "@/components/ui/button";
import { PassCard, type PassData } from "@/components/site/PassCard";
import { Printer, ArrowLeft, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pass/$entryId")({
  head: () => ({ meta: [{ title: "Entry Pass — Telent Fest" }] }),
  component: PassPage,
});

function PassPage() {
  const { entryId } = Route.useParams();
  const [pass, setPass] = useState<PassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("entry_passes")
        .select("*")
        .eq("id", entryId)
        .maybeSingle();
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      let photoUrl: string | null = null;
      if (data.photo_url) {
        const { data: signed } = await supabase.storage
          .from("pass-photos")
          .createSignedUrl(data.photo_url, 3600);
        photoUrl = signed?.signedUrl ?? null;
      }
      setPass({ ...(data as PassData), photo_url: photoUrl });
      setLoading(false);
    })();
  }, [entryId]);

  if (loading) {
    return <Section title="Loading pass…"><div /></Section>;
  }

  if (notFound || !pass) {
    return (
      <Section title="Pass not found">
        <div className="text-center">
          <Link to="/dashboard"><Button variant="outline"><ArrowLeft className="h-4 w-4" /> Back to dashboard</Button></Link>
        </div>
      </Section>
    );
  }

  if (pass.status === "pending") {
    return (
      <Section eyebrow="Awaiting approval" title="Your Entry Pass will be available after Jury Approval">
        <div className="max-w-md mx-auto text-center p-8 rounded-3xl bg-card border border-border">
          <Clock className="h-10 w-10 mx-auto text-primary mb-3" />
          <p className="text-muted-foreground">Registration <span className="font-mono">{pass.entry_number}</span> is pending review.</p>
          <Link to="/dashboard" className="inline-block mt-6"><Button variant="outline"><ArrowLeft className="h-4 w-4" /> Back</Button></Link>
        </div>
      </Section>
    );
  }

  if (pass.status === "rejected" || pass.status === "cancelled") {
    return (
      <Section title="Entry not approved">
        <div className="max-w-md mx-auto text-center text-muted-foreground">
          Your registration <span className="font-mono">{pass.entry_number}</span> was not approved.
          <div className="mt-6"><Link to="/dashboard"><Button variant="outline">Back to dashboard</Button></Link></div>
        </div>
      </Section>
    );
  }

  return (
    <Section eyebrow="Your official pass" title="Telent Fest Entry Pass">
      <div className="space-y-6">
        <PassCard pass={pass} />
        <div className="flex justify-center gap-3 print:hidden">
          <Link to="/dashboard"><Button variant="outline"><ArrowLeft className="h-4 w-4" /> Back</Button></Link>
          <Button className="gradient-primary text-primary-foreground border-0" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print / Save PDF
          </Button>
        </div>
      </div>
    </Section>
  );
}