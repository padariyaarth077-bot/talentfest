import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchRegistration } from "@/lib/registrations.functions";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
  validateSearch: (search: Record<string, string>) => ({ regId: search.regId || "" }),
});

const checkoutSteps = [
  "Event Selection",
  "Registration Form",
  "Order Summary",
  "Policy Consent",
  "Proceed to Pay",
  "Test Payment Status",
];

type GuestDetails = {
  id: string;
  guestNumber?: number | string;
  fullName: string;
  phone: string;
};

type RegistrationDetails = {
  id: string;
  registrationNumber?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  aadhaarLastFour?: string;
  eventName?: string;
  eventCity?: string;
  eventDate?: string;
  venue?: string;
  activityCategory?: string;
  participantPrice?: number;
  visitorPrice?: number;
  guestPrice?: number;
  type?: string;
  guests?: GuestDetails[];
};

function CheckoutPage() {
  const { regId } = Route.useSearch();
  const navigate = useNavigate();
  const [reg, setReg] = useState<RegistrationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [policyConsent, setPolicyConsent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!regId) {
      setLoading(false);
      return;
    }
    fetchRegistration({ data: { id: regId } })
      .then((data: unknown) => {
        setReg(data as RegistrationDetails);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load registration.");
        setLoading(false);
      });
  }, [regId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center pb-16 pt-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!regId || !reg) {
    return (
      <div className="min-h-screen pb-16 pt-8">
        <div className="mx-auto max-w-md px-6 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-primary/50" />
          <h2 className="mt-4 text-2xl font-semibold">No Registration Found</h2>
          <p className="mt-2 text-muted-foreground">
            Please start your registration from the Entry Pass page.
          </p>
          <Link
            to="/entry-pass"
            className="mt-6 inline-block rounded-xl px-6 py-3 font-semibold gradient-primary text-primary-foreground"
          >
            Go to Entry Pass
          </Link>
        </div>
      </div>
    );
  }

  const registrationFee = reg.participantPrice || reg.visitorPrice || 0;
  const guestPrice = reg.guestPrice || 0;
  const guestCount = reg.guests?.length || 0;
  const additionalCharges = guestCount * guestPrice;
  const totalAmount = registrationFee + additionalCharges;
  const isVisitor = reg.type === "visitor";

  return (
    <div className="min-h-screen bg-background pb-16 pt-8">
      <div className="mx-auto max-w-3xl px-6 sm:px-8">
        <div className="mb-8 text-center">
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Review Your <span className="text-gradient">Order</span>
          </h1>
          <p className="mt-3 text-muted-foreground">
            Please review your registration fee and policies before the test payment step.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
          {checkoutSteps.map((step, index) => (
            <span key={step} className="inline-flex items-center gap-2">
              <span className={index === 2 ? "font-semibold text-primary" : ""}>{step}</span>
              {index < checkoutSteps.length - 1 && <span aria-hidden="true">&rarr;</span>}
            </span>
          ))}
        </div>

        <div className="glass space-y-6 rounded-2xl p-6 sm:p-8">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Registration ID
              </span>
              <span className="font-mono text-sm text-primary">
                {reg.registrationNumber || reg.id}
              </span>
            </div>
          </div>

          <OrderSection title="Registration Form">
            <Row label="Participant name" value={reg.fullName || "Not provided"} />
            <Row label="Registered mobile number" value={reg.phone || "Not provided"} />
            <Row label="Email" value={reg.email || "Not provided"} />
            <Row
              label="Aadhaar"
              value={reg.aadhaarLastFour ? `XXXX XXXX ${reg.aadhaarLastFour}` : "Not available"}
            />
          </OrderSection>

          <OrderSection title="Event Selection">
            <Row label="Event or program name" value={reg.eventName || "Not provided"} />
            <Row label="City" value={reg.eventCity || "Not provided"} />
            <Row label="Date" value={reg.eventDate || "TBD"} />
            <Row label="Venue" value={reg.venue || "TBD"} />
            {!isVisitor && <Row label="Activity" value={reg.activityCategory || "N/A"} />}
          </OrderSection>

          {!isVisitor && reg.guests && reg.guests.length > 0 && (
            <OrderSection title="Guests">
              {reg.guests.map((guest) => (
                <Row
                  key={guest.id}
                  label={`Guest ${guest.guestNumber}`}
                  value={`${guest.fullName} - ${guest.phone}`}
                />
              ))}
            </OrderSection>
          )}

          <OrderSection title="Order Summary">
            <div className="space-y-2">
              <Row
                label={isVisitor ? "Visitor registration fee" : "Participant registration fee"}
                value={formatMoney(registrationFee)}
              />
              <Row
                label="Additional charges, if applicable"
                value={
                  guestCount > 0
                    ? `${guestCount} guest${guestCount > 1 ? "s" : ""} x ${formatMoney(guestPrice)} = ${formatMoney(additionalCharges)}`
                    : formatMoney(0)
                }
              />
              <div className="mt-2 border-t border-border pt-3">
                <div className="flex justify-between gap-4 text-lg font-bold">
                  <span>Total payable amount</span>
                  <span className="text-primary">{formatMoney(totalAmount)}</span>
                </div>
              </div>
            </div>
          </OrderSection>

          <OrderSection title="Policy Consent">
            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
              <Link
                to="/terms-and-conditions"
                className="rounded-xl border border-border bg-background/40 px-4 py-3 transition hover:text-primary"
              >
                Terms &amp; Conditions
              </Link>
              <Link
                to="/privacy-policy"
                className="rounded-xl border border-border bg-background/40 px-4 py-3 transition hover:text-primary"
              >
                Privacy Policy
              </Link>
              <Link
                to="/refund-cancellation-policy"
                className="rounded-xl border border-border bg-background/40 px-4 py-3 transition hover:text-primary"
              >
                Refund &amp; Cancellation Policy
              </Link>
            </div>

            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <input
                type="checkbox"
                checked={policyConsent}
                onChange={(event) => setPolicyConsent(event.target.checked)}
                className="mt-1 h-4 w-4 accent-primary"
              />
              <span className="text-sm text-muted-foreground">
                I agree to the Terms &amp; Conditions, Privacy Policy and Refund &amp; Cancellation
                Policy.
              </span>
            </label>
          </OrderSection>

          <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              This is a temporary test checkout for website review. It does not collect card
              numbers, CVV, UPI PINs or internet-banking passwords, and it does not display a
              genuine Paytm payment success.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/entry-pass" className="flex-1">
              <Button variant="outline" className="h-12 w-full">
                <ArrowLeft className="mr-2 h-4 w-4" /> Edit Details
              </Button>
            </Link>
            <Button
              onClick={() =>
                navigate({ to: "/payment", search: { regId: reg.id, amount: String(totalAmount) } })
              }
              disabled={!policyConsent}
              className="h-12 flex-1 border-0 text-sm tracking-wider gradient-primary text-primary-foreground shadow-soft hover:shadow-glow"
            >
              Proceed to Pay <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/40 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function formatMoney(value: number) {
  return `Rs. ${Number(value || 0).toFixed(2)}`;
}
