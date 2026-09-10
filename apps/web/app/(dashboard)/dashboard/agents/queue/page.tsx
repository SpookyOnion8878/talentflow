"use client";

import { useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@repo/ui/page-header";
import { EmptyState } from "@repo/ui/empty-state";
import { useToast } from "@/components/toast";

const TOOL_LABELS: Record<string, string> = {
  createDraftInvoice: "Create Draft Invoice",
  sendInvoiceReminder: "Send Invoice Reminder",
  sendComplianceReminder: "Send Compliance Reminder",
  markComplianceExpired: "Mark Document Expired",
  suspendFreelancer: "Suspend Freelancer (Compliance)",
  getApprovedTimesheets: "Fetch Approved Timesheets",
  getUnpaidInvoices: "List Unpaid Invoices",
  getAgingReport: "Aging Report",
  sendWeeklySummary: "Send Weekly Summary",
};

function ToolName({ tool }: { tool: string }) {
  return <span className="font-semibold">{TOOL_LABELS[tool] ?? tool}</span>;
}

export default function AgentQueuePage() {
  const toast = useToast();

  const { data: actions, isLoading, refetch } = trpc.agents.queue.useQuery();
  const approveMutation = trpc.agents.approve.useMutation({
    onSuccess: () => refetch(),
  });
  const rejectMutation = trpc.agents.reject.useMutation({
    onSuccess: () => refetch(),
  });
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setBusyId(id);
    try {
      const res = await approveMutation.mutateAsync({ actionId: id });
      toast(
        res.deniedReason
          ? `Auto-rejected by guardrail: ${res.deniedReason}`
          : res.executeError
            ? `Action failed to execute: ${res.executeError}`
            : "Action approved & executed.",
        res.deniedReason || res.executeError ? "error" : "success",
      );
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to approve", "error");
    }
    setBusyId(null);
  };

  const handleReject = async (id: string) => {
    if (!reason.trim()) {
      toast("Please enter a rejection reason.", "error");
      return;
    }
    try {
      await rejectMutation.mutateAsync({ actionId: id, reason: reason.trim() });
      setRejectingId(null);
      setReason("");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to reject", "error");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approval Queue"
        description="Actions proposed by agents await approval before they are executed"
      />

      {isLoading ? (
        <p className="text-sm text-text-mid">Loading queue…</p>
      ) : !actions?.length ? (
        <EmptyState
          title="No pending actions"
          description="The queue is empty. Run an agent from the Config Agents page to generate proposals."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {actions.map((action) => (
            <div
              key={action.id}
              className="rounded-xl border border-border bg-surface p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <ToolName tool={action.tool} />
                  <p className="mt-0.5 text-xs text-text-mid">
                    {action.run.agentType} · {action.run.intent ?? "no intent"}{" "}
                    · run {action.run.id.slice(0, 8)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    action.mode === "AUTO"
                      ? "bg-green-50 text-green-700"
                      : "bg-amber-500/10 text-amber-700"
                  }`}
                >
                  {action.mode}
                </span>
              </div>

              <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-bg p-3 text-xs text-text-mid">
                {JSON.stringify(action.input, null, 2)}
              </pre>

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => handleApprove(action.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setRejectingId(rejectingId === action.id ? null : action.id)
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-text-mid transition-colors hover:bg-bg"
                >
                  Reject
                </button>
              </div>

              {rejectingId === action.id && (
                <div className="mt-3 space-y-2 rounded-lg border border-border bg-bg p-3">
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Rejection reason (required for audit)"
                    rows={2}
                    className="w-full rounded-lg border border-border p-2 text-sm focus:border-primary-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleReject(action.id)}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                  >
                    Confirm Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="flex items-center gap-1.5 text-xs text-text-mid">
        <ShieldCheck className="h-3.5 w-3.5" />
        Every execution still passes through the guardrail & is recorded in the
        Audit Log.
      </p>
    </div>
  );
}
