/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  CreditCard,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  cancelDummyPayment,
  createPaymentOrder,
  failDummyPayment,
  fetchRegistration,
  verifyPayment,
} from "@/lib/registrations.functions";

export const Route = createFileRoute("/payment")({
  component: PaymentPage,
  validateSearch: (search: Record<string, string>) => ({
    regId: search.regId || "",
    amount: search.amount || "0",
  }),
});

function PaymentPage() {
  const { regId, amount } = Route.useSearch();
  const navigate = useNavigate();
  const [state, setState] = useState<
    "loading" | "ready" | "processing" | "success" | "failed" | "cancelled" | "error"
  >("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [reg, setReg] = useState<any>(null);

  useEffect(() => {
    if (!regId) {
      setState("error");
      setErrorMsg("No registration ID provided.");
      return;
    }
    fetchRegistration({ data: { id: regId } })
      .then((data) => {
        setReg(data);
        setState("ready");
      })
      .catch((err) => {
        setState("error");
        setErrorMsg(err.message || "Unable to load registration.");
      });
  }, [regId]);

  const createOrder = () =>
    createPaymentOrder({ data: { registrationId: regId, amount: Number(amount) || 1 } });

  const handlePayment = async () => {
    setState("processing");
    setErrorMsg("");
    try {
      const orderResult = await createOrder();
      if (!orderResult.success) throw new Error("Failed to create test payment order");
      const transactionId = `TEST-TXN-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
      const verifyResult = await verifyPayment({
        data: {
          registrationId: regId,
          paymentId: orderResult.order.id,
          transactionId,
          orderId: orderResult.order.orderId,
        },
      });
      if (!verifyResult.success) throw new Error("Payment confirmation failed");
      setState("success");
      setTimeout(() => navigate({ to: "/thank-you", search: { regId } }), 900);
    } catch (err: any) {
      setState("error");
      setErrorMsg(err.message || "Payment failed. Please try again.");
    }
  };

  const handleFailure = async () => {
    setState("processing");
    setErrorMsg("");
    try {
      await failDummyPayment({ data: { registrationId: regId, amount: Number(amount) || 1 } });
      setState("failed");
    } catch (err: any) {
      setState("error");
      setErrorMsg(err.message || "Unable to save failed test payment.");
    }
  };

  const handleCancel = async () => {
    setState("processing");
    setErrorMsg("");
    try {
      await cancelDummyPayment({ data: { registrationId: regId, amount: Number(amount) || 1 } });
      setState("cancelled");
    } catch (err: any) {
      setState("error");
      setErrorMsg(err.message || "Unable to cancel this test payment.");
    }
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="mx-auto max-w-lg px-6 sm:px-8">
        <div className="mb-8 text-center">
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Complete <span className="text-gradient">Payment</span>
          </h1>
          <p className="mt-3 text-muted-foreground">Secure your registration for the event.</p>
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
                  <InfoLine label="Registrant" value={reg.fullName} />
                  <InfoLine label="Event" value={reg.eventName} />
                  <InfoLine
                    label="Registration"
                    value={reg.registrationNumber || "Generating..."}
                  />
                  <div className="mt-2 flex justify-between border-t border-border pt-2 text-lg font-bold">
                    <span>Total</span>
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
                  No real payment will be charged.
                </p>
              </div>

              <Button
                onClick={handlePayment}
                className="h-14 w-full border-0 gradient-primary text-base font-semibold text-primary-foreground shadow-soft hover:shadow-glow"
              >
                <CreditCard className="mr-2 h-5 w-5" />
                Simulate Successful Payment
              </Button>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button variant="outline" onClick={handleFailure}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Simulate Failed Payment
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  Cancel Payment
                </Button>
              </div>
            </>
          )}

          {state === "processing" && (
            <StateMessage
              icon={<Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />}
              title="Processing Payment..."
              text="Please wait while we confirm this test payment."
            />
          )}
          {state === "success" && (
            <StateMessage
              icon={<CheckCircle className="mx-auto h-16 w-16 text-emerald-500" />}
              title="Payment Successful!"
              text="Redirecting to your passes..."
            />
          )}
          {state === "failed" && (
            <StateMessage
              icon={<XCircle className="mx-auto h-16 w-16 text-red-400" />}
              title="Test Payment Failed"
              text="No active pass was generated. You can retry the payment."
            />
          )}
          {state === "cancelled" && (
            <StateMessage
              icon={<AlertCircle className="mx-auto h-16 w-16 text-amber-400" />}
              title="Payment Cancelled"
              text="No pass was generated for this registration."
            />
          )}

          {state === "error" && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          {state !== "processing" && state !== "success" && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate({ to: "/checkout", search: { regId } })}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              {(state === "error" || state === "failed" || state === "cancelled") && (
                <Button
                  className="flex-1 border-0 gradient-primary text-primary-foreground"
                  onClick={handlePayment}
                >
                  Retry Payment
                </Button>
              )}
            </div>
          )}
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

function StateMessage({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="py-8 text-center">
      {icon}
      <p className="mt-4 text-xl font-semibold">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
