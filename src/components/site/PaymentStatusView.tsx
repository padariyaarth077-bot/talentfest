import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchRegistration } from "@/lib/registrations.functions";
import { businessDetails } from "@/lib/business-details";

type PaymentStatus = "success" | "failed" | "pending";

type PaymentStatusSearch = {
  regId: string;
  amount: string;
  testOrderId: string;
};

type RegistrationSummary = {
  id?: string;
  registrationNumber?: string;
  fullName?: string;
  eventName?: string;
};

const statusCopy = {
  success: {
    label: "Test payment status",
    value: "Test Success",
    title: "Test Payment Successful",
    icon: CheckCircle,
    iconClass: "text-emerald-500",
  },
  failed: {
    label: "Test payment status",
    value: "Test Failed",
    title: "Test Payment Failed",
    icon: XCircle,
    iconClass: "text-red-400",
  },
  pending: {
    label: "Test payment status",
    value: "Test Pending",
    title: "Test Payment Pending",
    icon: Clock,
    iconClass: "text-amber-400",
  },
};

export function PaymentStatusView({
  status,
  search,
}: {
  status: PaymentStatus;
  search: PaymentStatusSearch;
}) {
  const [reg, setReg] = useState<RegistrationSummary | null>(null);
  const [loading, setLoading] = useState(Boolean(search.regId));
  const [error, setError] = useState("");
  const copy = statusCopy[status];
  const Icon = copy.icon;

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!search.regId) {
      setLoading(false);
      return;
    }
    fetchRegistration({ data: { id: search.regId } })
      .then((data: unknown) => setReg(data as RegistrationSummary))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Unable to load registration details."),
      )
      .finally(() => setLoading(false));
  }, [search.regId]);

  return (
    <div className="min-h-screen bg-background pb-16 pt-8">
      <div className="mx-auto max-w-2xl px-6 sm:px-8">
        <div className="glass space-y-6 rounded-2xl p-6 sm:p-8">
          <div className="text-center">
            <Icon className={`mx-auto h-16 w-16 ${copy.iconClass}`} />
            <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {copy.title}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              This displayed result is a test transaction for website review only.
            </p>
          </div>

          <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
            <InfoLine
              label="Registration ID"
              value={
                loading ? "Loading..." : reg?.registrationNumber || search.regId || "Not provided"
              }
            />
            <InfoLine label="Test Order ID" value={search.testOrderId || "Not provided"} />
            <InfoLine
              label="Participant name"
              value={loading ? "Loading..." : reg?.fullName || "Not available"}
            />
            <InfoLine
              label="Event name"
              value={loading ? "Loading..." : reg?.eventName || "Not available"}
            />
            <InfoLine label="Amount" value={`Rs. ${Number(search.amount || 0).toFixed(2)}`} />
            <InfoLine label={copy.label} value={copy.value} />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              This page does not provide event entry or final registration confirmation based only
              on frontend URL parameters.
            </p>
            <p className="mt-2">
              Once Paytm is integrated, {businessDetails.legalName} must verify the payment securely
              through the backend before marking any payment as successful.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="outline" className="flex-1">
              <Link to="/registration">Back to Registration</Link>
            </Button>
            <Button asChild className="flex-1 border-0 gradient-primary text-primary-foreground">
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/40 py-1.5 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}
