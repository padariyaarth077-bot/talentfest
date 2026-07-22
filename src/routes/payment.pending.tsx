import { createFileRoute } from "@tanstack/react-router";
import { PaymentStatusView } from "@/components/site/PaymentStatusView";

export const Route = createFileRoute("/payment/pending")({
  head: () => ({
    meta: [
      { title: "Test Payment Pending | TelentFest" },
      {
        name: "description",
        content: "Test payment pending status page for TELENTFEST OFFICIAL dummy checkout review.",
      },
    ],
  }),
  validateSearch: (search: Record<string, string>) => ({
    regId: search.regId || "",
    amount: search.amount || "0",
    testOrderId: search.testOrderId || "",
  }),
  component: PaymentPendingPage,
});

function PaymentPendingPage() {
  const search = Route.useSearch();
  return <PaymentStatusView status="pending" search={search} />;
}
