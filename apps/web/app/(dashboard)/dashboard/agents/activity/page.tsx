"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@repo/ui/page-header";
import { EmptyState } from "@repo/ui/empty-state";
import { StatusBadge } from "@repo/ui/status-badge";
import { formatDate } from "@repo/utils";

export default function AgentActivityPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const limit = 20;

  const { data, isLoading } = trpc.agents.activity.useQuery({
    page,
    limit,
    status: status
      ? (status as "SUCCEEDED" | "FAILED" | "NEEDS_REVIEW")
      : undefined,
  });

  const runs = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity Log"
        description="History of all agent runs: status, steps, tokens, and errors"
      />

      <div className="flex gap-3">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-border px-4 py-2 text-sm focus:border-primary-500 focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="SUCCEEDED">SUCCEEDED</option>
          <option value="FAILED">FAILED</option>
          <option value="NEEDS_REVIEW">NEEDS_REVIEW</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-text-mid">Loading history…</p>
      ) : runs.length === 0 ? (
        <EmptyState
          title="No activity yet"
          description="Agent runs will appear here after a cron or chat is triggered."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-bg text-xs uppercase tracking-wide text-text-mid">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Trigger</th>
                <th className="px-4 py-3">Intent</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
                <th className="px-4 py-3 text-right">Token</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-bg/60">
                  <td className="px-4 py-3 text-text-mid">
                    {formatDate(run.startedAt)}
                  </td>
                  <td className="px-4 py-3 font-medium">{run.agentType}</td>
                  <td className="px-4 py-3 text-text-mid">{run.triggerType}</td>
                  <td className="px-4 py-3 text-text-mid">
                    {run.intent ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-text-mid">
                    {run.model ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="px-4 py-3 text-right text-text-mid">
                    {run._count.actions}
                  </td>
                  <td className="px-4 py-3 text-right text-text-mid">
                    {run.totalTokens.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-mid">
            Page {meta.page} of {meta.totalPages} ({meta.total} runs)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="rounded-lg border border-border px-3 py-1.5 font-medium disabled:opacity-40"
            >
              ← Previous
            </button>
            <button
              type="button"
              disabled={page >= meta.totalPages}
              onClick={() => setPage(page + 1)}
              className="rounded-lg border border-border px-3 py-1.5 font-medium disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
