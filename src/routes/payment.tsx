import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CreditCard,
  Loader2,
  ShieldCheck,
  XCircle,
  Clock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { fetchRegistration } from "@/lib/registrations.functions";

export const Route = createFileRoute("/payment")({
  component: PaymentPage,
  validateSearch: (search: Record<string, string>) => ({
    regId: search.regId || "",
    amount: search.amount || "0",
  }),
});

type RegistrationSummary = {
  id: string;
  registrationNumber?: string;
  fullName?: string;
  eventName?: string;
};

function PaymentPage() {
  const { regId, amount } = Route.useSearch();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [reg, setReg] = useState<RegistrationSummary | null>(null);

  useEffect(() => {
    if (pathname !== "/payment") {
      return;
    }
    if (!regId) {
      setState("error");
      setErrorMsg("No registration ID provided.");
      return;
    }
    fetchRegistration({ data: { id: regId } })
      .then((data: unknown) => {
        setReg(data as RegistrationSummary);
        setState("ready");
      })
      .catch((err: unknown) => {
        setState("error");
        setErrorMsg(err instanceof Error ? err.message : "Unable to load registration.");
      });
  }, [pathname, regId]);

  if (pathname !== "/payment") {
    return <Outlet />;
  }

  const goToStatus = (status: "success" | "failed" | "pending") => {
    const testOrderId = `TEST-ORDER-${Date.now()}`;
    navigate({
      to: `/payment/${status}`,
      search: {
        regId,
        amount,
        testOrderId,
      },
    });
  };

  return (
    <div className="min-h-screen bg-background pb-16 pt-8">
      <div className="mx-auto max-w-lg px-6 sm:px-8">
        <div className="mb-8 text-center">
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Test <span className="text-gradient">Payment</span>
          </h1>
          <p className="mt-3 text-muted-foreground">
            Complete the temporary dummy payment flow for website review.
          </p>
        </div>

        <div className="glass space-y-6 rounded-2xl p-6 sm:p-8">
          {state === "loading" && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {state === "ready" && (
            <>
              {reg && (
                <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
                  <InfoLine label="Participant" value={reg.fullName || "Not provided"} />
                  <InfoLine label="Event" value={reg.eventName || "Not provided"} />
                  <InfoLine label="Registration ID" value={reg.registrationNumber || reg.id} />
                  <div className="mt-2 flex justify-between border-t border-border pt-2 text-lg font-bold">
                    <span>Total payable</span>
                    <span className="text-primary">Rs. {Number(amount).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 text-center">
                <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
                <div className="mt-3 inline-flex rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                  Test Payment Mode
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  This is not Paytm staging or live checkout yet. No real payment is charged and no
                  card, CVV, UPI PIN or banking password is collected.
                </p>
              </div>

              <Button
                onClick={() => goToStatus("success")}
                className="h-14 w-full border-0 text-base font-semibold gradient-primary text-primary-foreground shadow-soft hover:shadow-glow"
              >
                <CreditCard className="mr-2 h-5 w-5" />
                Simulate Test Success
              </Button>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button variant="outline" onClick={() => goToStatus("failed")}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Simulate Failed
                </Button>
                <Button variant="outline" onClick={() => goToStatus("pending")}>
                  <Clock className="mr-2 h-4 w-4" />
                  Simulate Pending
                </Button>
              </div>
            </>
          )}

          {state === "error" && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate({ to: "/checkout", search: { regId } })}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
