import { caller } from "@/lib/trpc/caller";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { StatCard } from "@/components/stat-card";
import { formatCurrency, formatDate } from "@repo/utils";

export const dynamic = "force-dynamic";

const METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: "Bank Transfer",
  STRIPE: "Stripe",
  PAYPAL: "PayPal",
  WISE: "Wise",
  OTHER: "Other",
};

export default async function PaymentsPage() {
  const api = await caller();
  const { data, summary } = await api.payment.list({ page: 1, limit: 50 });

  const currencies = Array.from(
    new Set([
      ...Object.keys(summary.processedByCurrency),
      ...Object.keys(summary.pendingByCurrency),
    ]),
  ).sort();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Track payment processing and history"
      />

      <div className="grid gap-6 sm:grid-cols-3">
        {currencies.length === 0 ? (
          <>
            <StatCard
              label="Total Processed"
              value="—"
              color="text-green-600 bg-green-50"
            />
            <StatCard
              label="Pending Payments"
              value="—"
              color="text-yellow-600 bg-yellow-50"
            />
          </>
        ) : (
          currencies.flatMap((currency) => [
            <StatCard
              key={`processed-${currency}`}
              label={`Processed (${currency})`}
              value={formatCurrency(
                summary.processedByCurrency[currency] ?? 0,
                currency,
              )}
              color="text-green-600 bg-green-50"
            />,
            <StatCard
              key={`pending-${currency}`}
              label={`Pending (${currency})`}
              value={formatCurrency(
                summary.pendingByCurrency[currency] ?? 0,
                currency,
              )}
              color="text-yellow-600 bg-yellow-50"
            />,
          ])
        )}
        <StatCard
          label="Total Transactions"
          value={summary.totalCount}
          color="text-blue-600 bg-blue-50"
        />
      </div>

      {data.length === 0 ? (
        <EmptyState
          title="No payments yet"
          description="Payments will appear here once invoices are paid"
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Freelancer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {p.invoice.invoiceNo}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                    {p.invoice.freelancer.firstName}{" "}
                    {p.invoice.freelancer.lastName}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {formatCurrency(p.amount, p.currency)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                    {METHOD_LABELS[p.method] ?? p.method}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                    {p.reference ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                    {p.processedAt ? formatDate(p.processedAt) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <StatusBadge status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
