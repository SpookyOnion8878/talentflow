"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { formatCurrency, formatDate } from "@repo/utils";

export default function InvoicesPage() {
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
      alert(err instanceof Error ? err.message : "Failed to send invoice");
    }
  };

  const handlePay = async (id: string) => {
    if (!confirm("Mark this invoice as paid and record the payment?")) return;
    try {
      await payMutation.mutateAsync({ id });
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to mark invoice as paid",
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
              color="text-red-600 bg-red-50"
            />,
            <StatCard
              key={`${currency}-draft`}
              label={`Draft (${currency})`}
              value={formatCurrency(values.draft, currency)}
              color="text-slate-600 bg-slate-50"
            />,
          ])
        )}
      </div>

      <div className="flex gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-primary-500 focus:outline-none"
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
        <div className="rounded-xl border border-slate-200 bg-white shadow-card p-8 text-center text-sm text-slate-500">
          Loading...
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState
          title="No invoices found"
          description="Generate your first invoice"
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Freelancer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data.data.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <p className="text-sm font-medium text-slate-900">
                      {inv.invoiceNo}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                    {inv.freelancer.firstName} {inv.freelancer.lastName}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">
                    {formatCurrency(inv.totalAmount, inv.currency)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
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
                          className="text-sm font-medium text-primary-600 hover:text-primary-500"
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
