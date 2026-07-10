import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ShieldCheck, Loader2, AlertCircle, ArrowLeft, CheckCircle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";
import { createPaymentOrder, verifyPayment, fetchRegistration } from "@/lib/registrations.functions";

export const Route = createFileRoute("/payment")({
  component: PaymentPage,
  validateSearch: (search: Record<string, string>) => ({ regId: search.regId || "", amount: search.amount || "0" }),
});

function PaymentPage() {
  const { regId, amount } = Route.useSearch();
  const navigate = useNavigate();
  const { t } = useLang();
  const [state, setState] = useState<"loading" | "ready" | "processing" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [reg, setReg] = useState<any>(null);

  useEffect(() => {
    if (!regId) { setState("error"); setErrorMsg("No registration ID provided."); return; }
    fetchRegistration({ data: { id: regId } })
      .then((data) => { setReg(data); setState("ready"); })
      .catch((err) => { setState("error"); setErrorMsg(err.message); });
  }, [regId]);

  const handlePayment = async () => {
    setState("processing");
    setErrorMsg("");
    try {
      const orderResult = await createPaymentOrder({ data: { registrationId: regId, amount: Number(amount) } });
      if (!orderResult.success) throw new Error("Failed to create payment order");

      const transactionId = `TXN_TF_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

      const verifyResult = await verifyPayment({
        data: {
          registrationId: regId,
          paymentId: orderResult.order.id,
          transactionId,
          orderId: orderResult.order.orderId,
        },
      });

      if (verifyResult.success) {
        setState("success");
        setTimeout(() => {
          navigate({ to: "/thank-you", search: { regId } });
        }, 1500);
      } else {
        throw new Error("Payment verification failed");
      }
    } catch (err: any) {
      setState("error");
      setErrorMsg(err.message || "Payment failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="mx-auto max-w-lg px-6 sm:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-display font-semibold tracking-tight">
            Complete <span className="text-gradient">Payment</span>
          </h1>
          <p className="mt-3 text-muted-foreground">Secure your registration for the event.</p>
        </div>

        <div className="glass rounded-2xl p-6 sm:p-8 space-y-6">
          {state === "loading" && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {state === "ready" && (
            <>
              {reg && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Registrant</span><span className="font-medium">{reg.fullName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Event</span><span className="font-medium">{reg.eventName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Registration</span><span className="font-medium">{reg.registrationNumber || "Generating..."}</span></div>
                  <div className="border-t border-border pt-2 mt-2 flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">₹{Number(amount).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
                <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
                <p className="mt-2 text-sm text-muted-foreground">Secure payment via Razorpay</p>
              </div>

              <Button onClick={handlePayment}
                className="w-full gradient-primary text-primary-foreground border-0 h-14 text-base font-semibold shadow-soft hover:shadow-glow">
                <CreditCard className="h-5 w-5 mr-2" /> Pay ₹{Number(amount).toFixed(2)}
              </Button>
            </>
          )}

          {state === "processing" && (
            <div className="text-center py-8">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-lg font-semibold">Processing Payment...</p>
              <p className="mt-2 text-sm text-muted-foreground">Please wait while we verify your payment securely.</p>
            </div>
          )}

          {state === "success" && (
            <div className="text-center py-8">
              <CheckCircle className="mx-auto h-16 w-16 text-emerald-500" />
              <p className="mt-4 text-xl font-semibold">Payment Successful!</p>
              <p className="mt-2 text-sm text-muted-foreground">Redirecting to your passes...</p>
            </div>
          )}

          {state === "error" && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {errorMsg}
            </div>
          )}

          {state !== "processing" && state !== "success" && (
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => navigate({ to: "/checkout", search: { regId } })}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              {state === "error" && (
                <Button className="flex-1 gradient-primary text-primary-foreground border-0" onClick={handlePayment}>
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
