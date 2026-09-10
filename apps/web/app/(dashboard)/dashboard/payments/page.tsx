import { caller } from "@/lib/trpc/caller";
import { PageHeader } from "@repo/ui/page-header";
import { EmptyState } from "@repo/ui/empty-state";
import { StatusBadge } from "@repo/ui/status-badge";
import { StatCard } from "@repo/ui/stat-card";
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
          color="text-link bg-soft"
        />
      </div>

      {data.length === 0 ? (
        <EmptyState
          title="No payments yet"
          description="Payments will appear here once invoices are paid"
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-bg">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-mid">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-mid">
                  Freelancer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-mid">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-mid">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-mid">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-mid">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-mid">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-surface">
              {data.map((p) => (
                <tr key={p.id} className="hover:bg-bg">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-text-hi">
                    {p.invoice.invoiceNo}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-text-mid">
                    {p.invoice.freelancer.firstName}{" "}
                    {p.invoice.freelancer.lastName}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-text-hi">
                    {formatCurrency(p.amount, p.currency)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-text-mid">
                    {METHOD_LABELS[p.method] ?? p.method}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-text-mid">
                    {p.reference ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-text-mid">
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
