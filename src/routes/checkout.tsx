import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, CheckCircle, CreditCard, AlertCircle, Loader2, Users, MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";
import { fetchRegistration } from "@/lib/registrations.functions";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
  validateSearch: (search: Record<string, string>) => ({ regId: search.regId || "" }),
});

function CheckoutPage() {
  const { regId } = Route.useSearch();
  const navigate = useNavigate();
  const { t } = useLang();
  const [reg, setReg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!regId) { setLoading(false); return; }
    fetchRegistration({ data: { id: regId } })
      .then((data) => { setReg(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [regId]);

  if (loading) return <div className="min-h-screen pt-8 pb-16 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!regId || !reg) {
    return (
      <div className="min-h-screen pt-8 pb-16">
        <div className="max-w-md mx-auto px-6 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-primary/50" />
          <h2 className="mt-4 text-2xl font-semibold">No Registration Found</h2>
          <p className="mt-2 text-muted-foreground">Please start your registration from the Entry Pass page.</p>
          <Link to="/entry-pass" className="mt-6 inline-block gradient-primary text-primary-foreground rounded-xl px-6 py-3 font-semibold">Go to Entry Pass</Link>
        </div>
      </div>
    );
  }

  const participantPrice = reg.participantPrice || reg.visitorPrice || 0;
  const guestPrice = reg.guestPrice || 0;
  const guestCount = reg.guests?.length || 0;
  const guestTotal = guestCount * guestPrice;
  const totalAmount = participantPrice + guestTotal;
  const isVisitor = reg.type === "visitor";

  return (
    <div className="min-h-screen bg-background pt-8 pb-16">
      <div className="mx-auto max-w-3xl px-6 sm:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-display font-semibold tracking-tight">
            Review Your <span className="text-gradient">Registration</span>
          </h1>
          <p className="mt-3 text-muted-foreground">Please review your details before proceeding to payment.</p>
        </div>

        <div className="glass rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-primary font-semibold">Registration Number</span>
              <span className="font-mono text-sm text-primary">{reg.registrationNumber || "Generating..."}</span>
            </div>
          </div>

          <Section title="Personal Information">
            <Row label="Full Name" value={reg.fullName} />
            {!isVisitor && <Row label="Phone" value={reg.phone.replace(/(\d{5})\d{5}/, "$1XXXXX")} />}
            {isVisitor && <Row label="Phone" value={reg.phone.replace(/(\d{5})\d{5}/, "$1XXXXX")} />}
            <Row label="Email" value={reg.email} />
            <Row label="Aadhaar" value={`XXXX XXXX ${reg.aadhaarLastFour}`} />
          </Section>

          <Section title="Event Details">
            <Row label="Event" value={reg.eventName} />
            <Row label="City" value={reg.eventCity} />
            <Row label="Date" value={reg.eventDate || "TBD"} />
            <Row label="Venue" value={reg.venue || "TBD"} />
            {!isVisitor && <Row label="Activity" value={reg.activityCategory || "N/A"} />}
          </Section>

          {!isVisitor && reg.guests && reg.guests.length > 0 && (
            <Section title="Guests">
              {reg.guests.map((g: any, i: number) => (
                <Row key={g.id} label={`Guest ${g.guestNumber}`} value={`${g.fullName} - ${g.phone.replace(/(\d{5})\d{5}/, "$1XXXXX")}`} />
              ))}
            </Section>
          )}

          <Section title="Payment Summary">
            <div className="space-y-2">
              {!isVisitor ? (
                <>
                  <Row label="Participant Registration" value={`₹${participantPrice}`} />
                  {guestCount > 0 && <Row label={`Guest${guestCount > 1 ? "es" : ""} (${guestCount} × ₹${guestPrice})`} value={`₹${guestTotal}`} />}
                </>
              ) : (
                <Row label="Visitor Entry" value={`₹${participantPrice}`} />
              )}
              <div className="border-t border-border pt-2 mt-2">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total Amount</span>
                  <span className="text-primary">₹{totalAmount}</span>
                </div>
              </div>
            </div>
          </Section>

          <label className="flex items-start gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5 cursor-pointer">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1 h-4 w-4 accent-primary" />
            <span className="text-sm text-muted-foreground">
              I confirm that the information provided is correct and accept the terms and conditions for this event registration.
            </span>
          </label>

          {error && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/entry-pass" className="flex-1">
              <Button variant="outline" className="w-full h-12"><ArrowLeft className="h-4 w-4 mr-2" /> Edit Details</Button>
            </Link>
            <Button
              onClick={() => navigate({ to: "/payment", search: { regId: reg.id, amount: String(totalAmount) } })}
              disabled={!terms}
              className="flex-1 gradient-primary text-primary-foreground border-0 h-12 shadow-soft hover:shadow-glow text-sm tracking-wider"
            >
              Proceed to Payment <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-border/40 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
