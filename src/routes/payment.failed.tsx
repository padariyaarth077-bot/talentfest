import { createFileRoute } from "@tanstack/react-router";
import { PaymentStatusView } from "@/components/site/PaymentStatusView";

export const Route = createFileRoute("/payment/failed")({
  head: () => ({
    meta: [
      { title: "Test Payment Failed | TelentFest" },
      {
        name: "description",
        content: "Test payment failed status page for TELENTFEST OFFICIAL dummy checkout review.",
      },
    ],
  }),
  validateSearch: (search: Record<string, string>) => ({
    regId: search.regId || "",
    amount: search.amount || "0",
    testOrderId: search.testOrderId || "",
  }),
  component: PaymentFailedPage,
});

function PaymentFailedPage() {
  const search = Route.useSearch();
  return <PaymentStatusView status="failed" search={search} />;
}
