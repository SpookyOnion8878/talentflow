"use client";

import { useState } from "react";
import { TriangleAlert, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { formatDate } from "@repo/utils";
import { useToast } from "@/components/toast";

const TYPE_LABELS: Record<string, string> = {
  ID_CARD: "ID Card",
  TAX_ID: "Tax ID",
  WORK_PERMIT: "Work Permit",
  VISA: "Visa",
  NDA: "NDA",
  CONTRACT_COPY: "Contract Copy",
  INSURANCE: "Insurance",
  CERTIFICATION: "Certification",
  OTHER: "Other",
};

export default function CompliancePage() {
  const toast = useToast();

  const [status, setStatus] = useState("ALL");

  const { data, isLoading, refetch } = trpc.compliance.list.useQuery({
    status,
  });

  const verifyMutation = trpc.compliance.verify.useMutation({
    onSuccess: () => refetch(),
  });
  const rejectMutation = trpc.compliance.reject.useMutation({
    onSuccess: () => refetch(),
  });
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const handleVerify = async (id: string) => {
    try {
      await verifyMutation.mutateAsync({ id });
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to verify document",
        "error",
      );
    }
  };

  const handleReject = async (id: string) => {
    if (!reason.trim()) {
      toast("Please provide a reason", "error");
      return;
    }
    try {
      await rejectMutation.mutateAsync({ id, reason: reason.trim() });
      setRejectingId(null);
      setReason("");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to reject document",
        "error",
      );
    }
  };

  const attentionCount =
    (data?.summary.expired ?? 0) +
    (data?.summary.expiringSoon ?? 0) +
    (data?.summary.pending ?? 0);

  const { data: agentStatus } = trpc.agents.status.useQuery();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance"
        description="Track documents, certifications, and regulatory compliance"
      />

      {agentStatus?.compliance.enabled && (
        <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
          <ShieldCheck className="h-3.5 w-3.5" />
          Compliance Agent active ({agentStatus.compliance.mode}) — automated
          monitoring 30/7/0 days
        </div>
      )}

      {/* Summary */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Verified"
          value={data?.summary.verified ?? 0}
          color="text-green-600 bg-green-50"
        />
        <StatCard
          label="Pending Review"
          value={data?.summary.pending ?? 0}
          color="text-yellow-600 bg-yellow-50"
        />
        <StatCard
          label="Expired"
          value={data?.summary.expired ?? 0}
          color="text-red-600 bg-red-50"
        />
        <StatCard
          label="Expiring Soon (30d)"
          value={data?.summary.expiringSoon ?? 0}
          color="text-orange-600 bg-orange-50"
        />
      </div>

      {/* Alert Banner */}
      {attentionCount > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100">
              <TriangleAlert className="h-4 w-4 text-red-600" />
            </span>
            <div>
              <p className="font-medium text-red-800">
                {attentionCount} document{attentionCount === 1 ? "" : "s"} need
                attention
              </p>
              <p className="text-sm text-red-600">
                {data?.summary.expired} expired, {data?.summary.expiringSoon}{" "}
                expiring soon, {data?.summary.pending} pending verification
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-primary-500 focus:outline-none"
        >
          <option value="ALL">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="VERIFIED">Verified</option>
          <option value="EXPIRED">Expired</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-card p-8 text-center text-sm text-slate-500">
          Loading...
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState
          title="No compliance records"
          description="Upload documents to start tracking compliance"
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Freelancer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Document
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Expiry
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
              {data.data.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">
                    {r.freelancer.firstName} {r.freelancer.lastName}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                      {TYPE_LABELS[r.type] ?? r.type}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                    {r.title}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                    {r.expiryDate ? (
                      <span
                        className={
                          r.expiringSoon
                            ? "font-medium text-orange-600"
                            : undefined
                        }
                      >
                        {formatDate(r.expiryDate)}
                        {r.expiringSoon && " ⏰"}
                      </span>
                    ) : (
                      "No expiry"
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {r.status === "PENDING" && (
                        <>
                          {rejectingId === r.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Reason..."
                                className="w-40 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
                                autoFocus
                              />
                              <button
                                onClick={() => handleReject(r.id)}
                                className="text-sm font-medium text-red-600 hover:text-red-500"
                              >
                                Confirm
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setRejectingId(r.id)}
                              className="text-sm font-medium text-red-600 hover:text-red-500"
                            >
                              Reject
                            </button>
                          )}
                          <button
                            onClick={() => handleVerify(r.id)}
                            className="text-sm font-medium text-primary-600 hover:text-primary-500"
                          >
                            Verify
                          </button>
                        </>
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
