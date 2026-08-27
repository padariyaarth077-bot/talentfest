import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Section } from "@/components/site/Section";
import { Button } from "@/components/ui/button";
import { getDbConfigError, db } from "@/db/client";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n";
import {
  invoiceHtml,
  recoverEmployeeAwardInvoices,
  type EmployeeAwardRecord,
} from "@/lib/employee-awards.functions";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login - Telent Fest" },
      { name: "description", content: "Login to your Telent Fest account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [invoiceQuery, setInvoiceQuery] = useState("");
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");
  const [invoiceResults, setInvoiceResults] = useState<EmployeeAwardRecord[]>([]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const configError = getDbConfigError();
    if (configError) {
      toast.error(configError);
      return;
    }

    setLoading(true);
    try {
      const { error } = await db.auth.signInWithPassword({ email, password });
      if (error) return toast.error(error instanceof Error ? error.message : t("auth.loginFailed"));
      toast.success(t("auth.welcomeToast"));
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("auth.loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Section eyebrow={t("auth.welcomeBack")} title={t("auth.loginTitle")} subtitle={t("auth.loginSubtitle")}>
      <div className="mx-auto grid max-w-md gap-6">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-soft">
          <form className="space-y-4" onSubmit={submit}>
            <input required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("auth.email")} type="email" className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <input required value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("auth.password")} type="password" className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <div className="flex justify-end text-xs">
              <Link to="/forgot-password" className="text-primary hover:underline">{t("auth.forgot")}</Link>
            </div>
            <Button type="submit" disabled={loading} className="w-full border-0 gradient-primary text-primary-foreground">
              {loading ? t("auth.signingIn") : t("common.login")}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              {t("auth.newHere")} <Link to="/signup" className="text-primary hover:underline">{t("auth.createAccount")}</Link>
            </div>
          </form>
        </div>

        <div className="rounded-3xl border border-border bg-card p-8 shadow-soft">
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setInvoiceLoading(true);
              setInvoiceError("");
              setInvoiceResults([]);
              try {
                const results = await recoverEmployeeAwardInvoices({ data: { query: invoiceQuery } });
                setInvoiceResults(results as EmployeeAwardRecord[]);
                if (!results.length) {
                  setInvoiceError("No Employee Award registration was found for this mobile number or email address.");
                }
              } catch (error) {
                setInvoiceError(error instanceof Error ? error.message : "Unable to find Employee Award invoice.");
              } finally {
                setInvoiceLoading(false);
              }
            }}
          >
            <div>
              <h2 className="font-display text-xl font-semibold">Employee Award Invoice</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Already registered? Enter your registered mobile number or email address to view your invoice.
              </p>
            </div>
            <input
              required
              value={invoiceQuery}
              onChange={(event) => setInvoiceQuery(event.target.value)}
              placeholder="Mobile number or email"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button type="submit" disabled={invoiceLoading} variant="outline" className="w-full">
              {invoiceLoading ? "Finding..." : "Find Invoice"}
            </Button>
          </form>

          {invoiceError && <div className="mt-4 text-sm text-destructive">{invoiceError}</div>}
          {invoiceResults.length > 0 && (
            <div className="mt-5 space-y-3">
              {invoiceResults.map((record) => (
                <div key={record.id} className="rounded-2xl border border-border bg-background/70 p-4 text-sm">
                  <div className="font-semibold">{record.company_name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {record.company_registration_number} - {record.invoice_number} - Rs. {record.total_amount.toLocaleString("en-IN")}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => viewInvoice(record)}>
                      View Invoice
                    </Button>
                    <Button type="button" size="sm" onClick={() => downloadInvoice(record)}>
                      Download Invoice
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

function viewInvoice(record: EmployeeAwardRecord) {
  const win = window.open("", "_blank");
  if (!win) return toast.error("Allow popups to view this invoice.");
  win.document.open();
  win.document.write(invoiceHtml(record, window.location.origin));
  win.document.close();
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
