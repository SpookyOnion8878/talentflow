"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate } from "@repo/utils";
import { useToast } from "@/components/toast";

export default function ContractsPage() {
  const toast = useToast();

  const [status, setStatus] = useState("ALL");

  const { data, isLoading, refetch } = trpc.contract.list.useQuery({
    page: 1,
    limit: 50,
    status,
  });

  const signMutation = trpc.contract.sign.useMutation({
    onSuccess: () => refetch(),
  });
  const terminateMutation = trpc.contract.terminate.useMutation({
    onSuccess: () => refetch(),
  });

  const handleSign = async (id: string) => {
    if (!confirm("Record the e-signature for this contract?")) return;
    try {
      await signMutation.mutateAsync({ id });
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to sign contract",
        "error",
      );
    }
  };

  const handleTerminate = async (id: string) => {
    if (!confirm("Terminate this contract? This ends the contract today."))
      return;
    try {
      await terminateMutation.mutateAsync({ id });
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to terminate contract",
        "error",
      );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contracts"
        description="Generate, sign, and manage contracts"
        action={{ label: "New Contract", href: "/dashboard/contracts/new" }}
      />

      <div className="flex gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-primary-500 focus:outline-none"
        >
          <option value="ALL">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="SENT">Sent</option>
          <option value="SIGNED">Signed</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="TERMINATED">Terminated</option>
          <option value="EXPIRED">Expired</option>
        </select>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-card p-8 text-center text-sm text-slate-500">
          Loading...
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState
          title="No contracts found"
          description="Generate your first contract"
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Contract
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Freelancer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Period
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
              {data.data.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <p className="text-sm font-medium text-slate-900">
                      {c.title}
                    </p>
                    <p className="text-xs text-slate-500">{c.contractNo}</p>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                    {c.freelancer.firstName} {c.freelancer.lastName}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                    {formatCurrency(c.ratePerHour, c.currency)}/hr
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                    {formatDate(c.startDate)}
                    {c.endDate ? ` → ${formatDate(c.endDate)}` : ""}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {["DRAFT", "SENT"].includes(c.status) && (
                        <button
                          onClick={() => handleSign(c.id)}
                          className="text-sm font-medium text-primary-600 hover:text-primary-500"
                        >
                          Sign
                        </button>
                      )}
                      {!["TERMINATED", "COMPLETED", "EXPIRED"].includes(
                        c.status,
                      ) && (
                        <button
                          onClick={() => handleTerminate(c.id)}
                          className="text-sm font-medium text-red-600 hover:text-red-500"
                        >
                          Terminate
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
