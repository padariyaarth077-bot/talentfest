import { createFileRoute } from "@tanstack/react-router";
import { PaymentStatusView } from "@/components/site/PaymentStatusView";

export const Route = createFileRoute("/payment/success")({
  head: () => ({
    meta: [
      { title: "Test Payment Success | TelentFest" },
      {
        name: "description",
        content: "Test payment success status page for TELENTFEST OFFICIAL dummy checkout review.",
      },
    ],
  }),
  validateSearch: (search: Record<string, string>) => ({
    regId: search.regId || "",
    amount: search.amount || "0",
    testOrderId: search.testOrderId || "",
  }),
  component: PaymentSuccessPage,
});

function PaymentSuccessPage() {
  const search = Route.useSearch();
  return <PaymentStatusView status="success" search={search} />;
}
