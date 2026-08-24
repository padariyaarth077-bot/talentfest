import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchRegistration,
  verifyPayment,
} from "@/lib/registrations.functions";

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
  paymentStatus?: string;
  registrationStatus?: string;
};

const statusCopy = {
  success: {
    label: "Payment status",
    value: "Paid",
    title: "Payment Successful",
    icon: CheckCircle,
    iconClass: "text-emerald-500",
  },
  failed: {
    label: "Payment status",
    value: "Failed",
    title: "Payment Failed",
    icon: XCircle,
    iconClass: "text-red-400",
  },
  pending: {
    label: "Payment status",
    value: "Pending",
    title: "Payment Pending",
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
  const navigate = useNavigate();
  const [reg, setReg] = useState<RegistrationSummary | null>(null);
  const [loading, setLoading] = useState(Boolean(search.regId));
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const copy = statusCopy[status];
  const Icon = copy.icon;

  useEffect(() => {
    window.scrollTo(0, 0);

    if (!search.regId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const regData = await fetchRegistration({ data: { id: search.regId } });
        if (cancelled) return;
        const r = regData as RegistrationSummary;
        setReg(r);

        if (status === "success") {
          if (r.paymentStatus === "paid" && r.registrationStatus === "confirmed") {
            navigate({ to: "/thank-you", search: { regId: search.regId }, replace: true });
            return;
          }

          setVerifying(true);
          try {
            const txId = `TEST-TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
            const paymentId = (regData as any).payments?.[0]?.id;
            const orderId = (regData as any).payments?.[0]?.orderId || search.testOrderId || `TEST-ORDER-${Date.now()}`;

            if (!paymentId) {
              setError("No payment record found. Please go back and try again.");
              setVerifying(false);
              return;
            }

            const result = await verifyPayment({
              data: {
                registrationId: search.regId,
                paymentId,
                transactionId: txId,
                orderId,
              },
            });

            if (cancelled) return;

            if (result.success) {
              navigate({ to: "/thank-you", search: { regId: search.regId }, replace: true });
              return;
            }
            setError("Payment verification returned an unexpected response.");
          } catch (verifyErr: unknown) {
            if (cancelled) return;
            setError(verifyErr instanceof Error ? verifyErr.message : "Payment verification failed. Please try again.");
          } finally {
            if (!cancelled) setVerifying(false);
          }
        }
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to load registration details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [search.regId, status, navigate, search.testOrderId]);

  if (verifying) {
    return (
      <div className="min-h-screen bg-background pb-16 pt-8">
        <div className="mx-auto max-w-2xl px-6 sm:px-8">
          <div className="glass space-y-6 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">Verifying payment...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              {status === "success"
                ? "Your payment has been verified successfully."
                : status === "failed"
                  ? "Your payment could not be completed."
                  : "Your payment is being processed."}
            </p>
          </div>

          <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
            <InfoLine
              label="Registration ID"
              value={
                loading ? "Loading..." : reg?.registrationNumber || search.regId || "Not provided"
              }
            />
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

          <div className="flex flex-col gap-3 sm:flex-row">
            {status === "success" && reg?.paymentStatus === "paid" && (
              <Button
                asChild
                className="flex-1 border-0 gradient-primary text-primary-foreground"
              >
                <Link to="/thank-you" search={{ regId: search.regId }}>
                  View Your Pass
                </Link>
              </Button>
            )}
            {status === "failed" && (
              <Button asChild variant="outline" className="flex-1">
                <Link to="/checkout" search={{ regId: search.regId }}>
                  Try Again
                </Link>
              </Button>
            )}
            {status === "pending" && (
              <Button asChild variant="outline" className="flex-1">
                <Link to="/entry-pass">
                  Back to Registration
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" className="flex-1">
              <Link to="/">Return Home</Link>
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
