"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { StatusBadge } from "@repo/ui/status-badge";
import { EmptyState } from "@repo/ui/empty-state";
import { PageHeader } from "@repo/ui/page-header";
import { formatDate } from "@repo/utils";
import { useToast } from "@/components/toast";

export default function TimesheetsPage() {
  const toast = useToast();

  const [status, setStatus] = useState("ALL");

  const { data, isLoading, refetch } = trpc.timesheet.list.useQuery({
    page: 1,
    limit: 50,
    status,
  });

  const approveMutation = trpc.timesheet.approve.useMutation({
    onSuccess: () => refetch(),
  });
  const rejectMutation = trpc.timesheet.reject.useMutation({
    onSuccess: () => refetch(),
  });
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const handleApprove = async (id: string) => {
    try {
      await approveMutation.mutateAsync({ id });
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to approve timesheet",
        "error",
      );
    }
  };

  const handleReject = async (id: string) => {
    if (!reason.trim()) {
      toast("Please provide a reason for rejection", "error");
      return;
    }
    try {
      await rejectMutation.mutateAsync({ id, reason: reason.trim() });
      setRejectingId(null);
      setReason("");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to reject timesheet",
        "error",
      );
    }
  };

  const pendingCount =
    data?.data.filter((t) => t.status === "PENDING").length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timesheets"
        description="Review and approve time entries"
      />

      {/* Status filter */}
      <div className="flex items-center gap-2">
        {["ALL", "PENDING", "APPROVED", "REJECTED"].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              status === s
                ? "bg-primary-600 text-white"
                : "border border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            {s === "PENDING" && pendingCount > 0 && (
              <span className="ml-1 rounded-full bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-700">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-card p-8 text-center text-sm text-slate-500">
          Loading...
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState
          title="No timesheets found"
          description="Timesheets will appear here once submitted"
        />
      ) : (
        <div className="space-y-3">
          {data.data.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-slate-200 bg-white shadow-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                    {t.freelancer.firstName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {t.freelancer.firstName} {t.freelancer.lastName}
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        {formatDate(t.date)}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {t.project?.name ?? "No project"} • {t.hours}h
                      {t.contract && ` • ${t.contract.contractNo}`}
                    </p>
                    {t.description && (
                      <p className="mt-1 text-xs text-slate-600">
                        {t.description}
                      </p>
                    )}
                    {t.rejectReason && (
                      <p className="mt-1 text-xs text-red-600">
                        Rejected: {t.rejectReason}
                      </p>
                    )}
                  </div>
                </div>
                <StatusBadge status={t.status} />
              </div>

              {t.status === "PENDING" && (
                <div className="mt-4 flex justify-end gap-3 border-t pt-4">
                  {rejectingId === t.id ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Reason for rejection..."
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleReject(t.id)}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => {
                          setRejectingId(null);
                          setReason("");
                        }}
                        className="rounded-lg border px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setRejectingId(t.id)}
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleApprove(t.id)}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                      >
                        Approve
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
