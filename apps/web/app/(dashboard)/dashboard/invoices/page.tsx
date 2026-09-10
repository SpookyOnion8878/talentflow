"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { StatusBadge } from "@repo/ui/status-badge";
import { EmptyState } from "@repo/ui/empty-state";
import { PageHeader } from "@repo/ui/page-header";
import { StatCard } from "@repo/ui/stat-card";
import { formatCurrency, formatDate } from "@repo/utils";
import { useToast } from "@/components/toast";

export default function InvoicesPage() {
  const toast = useToast();

  const [status, setStatus] = useState("ALL");

  const { data, isLoading, refetch } = trpc.invoice.list.useQuery({
    page: 1,
    limit: 50,
    status,
  });

  const sendMutation = trpc.invoice.send.useMutation({
    onSuccess: () => refetch(),
  });
  const payMutation = trpc.invoice.markAsPaid.useMutation({
    onSuccess: () => refetch(),
  });

  const handleSend = async (id: string) => {
    try {
      await sendMutation.mutateAsync({ id });
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to send invoice",
        "error",
      );
    }
  };

  const handlePay = async (id: string) => {
    if (!confirm("Mark this invoice as paid and record the payment?")) return;
    try {
      await payMutation.mutateAsync({ id });
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to mark invoice as paid",
        "error",
      );
    }
  };

  const summary = data?.summary;
  const currencySummaries = Object.entries(summary?.byCurrency ?? {}).sort(
    ([left], [right]) => left.localeCompare(right),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Generate and track invoices"
        action={{
          label: "Generate Invoice",
          href: "/dashboard/invoices/new",
        }}
      />

      {/* Summary */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {currencySummaries.length === 0 ? (
          <StatCard label="Invoice totals" value="—" />
        ) : (
          currencySummaries.flatMap(([currency, values]) => [
            <StatCard
              key={`${currency}-outstanding`}
              label={`Outstanding (${currency})`}
              value={formatCurrency(values.outstanding, currency)}
              color="text-yellow-600 bg-yellow-50"
            />,
            <StatCard
              key={`${currency}-paid`}
              label={`Total Paid (${currency})`}
              value={formatCurrency(values.paid, currency)}
              color="text-green-600 bg-green-50"
            />,
            <StatCard
              key={`${currency}-overdue`}
              label={`Overdue (${currency})`}
              value={formatCurrency(values.overdue, currency)}
              color="text-red-600 bg-red-500/10"
            />,
            <StatCard
              key={`${currency}-draft`}
              label={`Draft (${currency})`}
              value={formatCurrency(values.draft, currency)}
              color="text-text-mid bg-bg"
            />,
          ])
        )}
      </div>

      <div className="flex gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-border px-4 py-2 text-sm focus:border-primary-500 focus:outline-none"
        >
          <option value="ALL">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="SENT">Sent</option>
          <option value="VIEWED">Viewed</option>
          <option value="PAID">Paid</option>
          <option value="OVERDUE">Overdue</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-border bg-surface shadow-card p-8 text-center text-sm text-text-mid">
          Loading...
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState
          title="No invoices found"
          description="Generate your first invoice"
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
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-mid">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-mid">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-surface">
              {data.data.map((inv) => (
                <tr key={inv.id} className="hover:bg-bg">
                  <td className="whitespace-nowrap px-6 py-4">
                    <p className="text-sm font-medium text-text-hi">
                      {inv.invoiceNo}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-text-mid">
                    {inv.freelancer.firstName} {inv.freelancer.lastName}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-text-hi">
                    {formatCurrency(inv.totalAmount, inv.currency)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-text-mid">
                    {inv.dueDate ? formatDate(inv.dueDate) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {inv.status === "DRAFT" && (
                        <button
                          onClick={() => handleSend(inv.id)}
                          className="text-sm font-medium text-link hover:text-link"
                        >
                          Send
                        </button>
                      )}
                      {!["PAID", "CANCELLED"].includes(inv.status) && (
                        <button
                          onClick={() => handlePay(inv.id)}
                          className="text-sm font-medium text-green-600 hover:text-green-500"
                        >
                          Mark Paid
                        </button>
                      )}
                    </div>
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
