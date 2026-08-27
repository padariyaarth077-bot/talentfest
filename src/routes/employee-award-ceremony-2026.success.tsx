import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, CalendarDays, CheckCircle2, CreditCard, Download, Home, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  createEmployeeAwardPaymentOrder,
  failEmployeeAwardPayment,
  fetchEmployeeAwardRegistration,
  formatEmployeeAwardDateTime,
  invoiceHtml,
  verifyEmployeeAwardPayment,
  type EmployeeAwardRecord,
} from "@/lib/employee-awards.functions";

type RazorpayInstance = {
  open: () => void;
  on: (event: "payment.failed", handler: (response: any) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, any>) => RazorpayInstance;
  }
}

let razorpayScript: Promise<void> | null = null;

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  razorpayScript ||= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Razorpay checkout."));
    document.body.appendChild(script);
  });
  return razorpayScript;
}

export const Route = createFileRoute("/employee-award-ceremony-2026/success")({
  validateSearch: (search: Record<string, unknown>) => ({
    company: typeof search.company === "string" ? search.company : "",
  }),
  head: () => ({ meta: [{ title: "Employee Award Payment - Telent Fest" }] }),
  component: EmployeeAwardSuccessPage,
});

function EmployeeAwardSuccessPage() {
  const { company } = Route.useSearch();
  const [record, setRecord] = useState<EmployeeAwardRecord | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!company) {
      setError("Company registration number is missing.");
      return;
    }
    fetchEmployeeAwardRegistration({ data: { company } })
      .then(setRecord)
      .catch(() => setError("Unable to load this registration."));
  }, [company]);

  const startPayment = async () => {
    if (!record) return;
    setBusy(true);
    setError("");
    try {
      const { key, order, company: updatedCompany } = await createEmployeeAwardPaymentOrder({
        data: { company: record.id },
      });
      setRecord(updatedCompany);
      await loadRazorpay();
      if (!window.Razorpay) throw new Error("Razorpay checkout is not available.");

      const checkout = new window.Razorpay({
        key,
        amount: order.amount,
        currency: order.currency,
        name: "Telent Fest",
        description: "Employee Award Ceremony 2026 Registration",
        order_id: order.id,
        prefill: {
          name: record.owner_name,
          email: record.owner_email,
          contact: record.owner_mobile.replace(/^\+91/, ""),
        },
        notes: {
          company_registration_number: record.company_registration_number,
          invoice_number: record.invoice_number,
        },
        theme: { color: "#d6b562" },
        handler: async (response: any) => {
          setBusy(true);
          try {
            const result = await verifyEmployeeAwardPayment({
              data: {
                company: record.id,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              },
            });
            setRecord(result.company);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to verify payment.");
          } finally {
            setBusy(false);
          }
        },
        modal: {
          ondismiss: () => setBusy(false),
        },
      });

      checkout.on("payment.failed", async (response: any) => {
        if (updatedCompany.payment?.id) {
          await failEmployeeAwardPayment({ data: { company: record.id, paymentId: updatedCompany.payment.id } }).catch(() => null);
        }
        setBusy(false);
        setError(response?.error?.description || "Payment failed. Please try again.");
      });
      checkout.open();
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Unable to start Razorpay payment.");
    }
  };

  const paid = record?.payment_status === "paid";

  return (
    <div className="min-h-screen bg-background py-12 sm:py-16">
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-primary/25 bg-card/80 p-7 shadow-elegant sm:p-10">
          <div className="text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-primary/35 bg-primary/15 text-primary">
              {paid ? <CheckCircle2 className="h-8 w-8" /> : <CreditCard className="h-8 w-8" />}
            </div>
            <h1 className="mt-6 font-display text-4xl font-semibold">
              {paid ? "Registration Confirmed" : "Complete Payment"}
            </h1>
            <p className="mt-3 text-muted-foreground">
              {paid
                ? "Your company award registration, recipient IDs and invoice are ready."
                : "Review the server-calculated amount and complete the secure Razorpay payment."}
            </p>
          </div>

          {error && (
            <div className="mt-8 rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {!record && !error && (
            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading registration...
            </div>
          )}

          {record && (
            <>
              <div className="mt-8 grid gap-4 rounded-2xl border border-border bg-background/60 p-5 text-left sm:grid-cols-2 lg:grid-cols-4">
                <Info icon={Award} label="Company ID" value={record.company_registration_number} />
                <Info label="Invoice" value={record.invoice_number} />
                <Info label="Employees" value={String(record.employee_count)} />
                <Info label="Amount" value={`Rs. ${record.total_amount.toLocaleString("en-IN")}`} />
                <Info label="Company" value={record.company_name} />
                <Info label="Owner" value={record.owner_name} />
                <Info icon={CalendarDays} label="Submitted" value={formatEmployeeAwardDateTime(record.submitted_at)} />
                <Info label="Payment" value={record.payment_status.toUpperCase()} />
              </div>

              <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
                <table className="min-w-[760px] w-full text-left text-sm">
                  <thead className="bg-accent text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Award ID</th>
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Designation</th>
                      <th className="px-4 py-3 text-right">Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {record.recipients.map((recipient) => (
                      <tr key={recipient.id} className="border-t border-border">
                        <td className="px-4 py-3 font-semibold text-primary">{recipient.award_registration_number}</td>
                        <td className="px-4 py-3">{recipient.name}</td>
                        <td className="px-4 py-3 capitalize">{recipient.recipient_type}</td>
                        <td className="px-4 py-3">{recipient.designation}</td>
                        <td className="px-4 py-3 text-right">Rs. {recipient.fee_amount.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                {!paid && (
                  <Button onClick={startPayment} disabled={busy} className="h-12 gradient-primary px-5 text-primary-foreground">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                    Pay with Razorpay
                  </Button>
                )}
                {paid && (
                  <Button variant="outline" onClick={() => downloadInvoice(record)} className="h-12 px-5">
                    <Download className="h-4 w-4" />
                    Download Invoice
                  </Button>
                )}
                <Link to="/" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border px-5 text-sm font-semibold hover:bg-accent">
                  <Home className="h-4 w-4" />
                  Return Home
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon?: typeof Award; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5 text-primary" />}
        {label}
      </div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

function downloadInvoice(record: EmployeeAwardRecord) {
  const blob = new Blob([invoiceHtml(record, window.location.origin)], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${record.invoice_number}.html`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
