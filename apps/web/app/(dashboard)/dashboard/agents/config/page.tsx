"use client";

import { useState } from "react";
import { Database, Play, Save } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@repo/ui/page-header";
import type { AgentType } from "@repo/agents";
import { useToast } from "@/components/toast";

const AGENT_META: Record<string, { title: string; description: string }> = {
  BILLING: {
    title: "Billing Agent",
    description:
      "Invoice cycle from approved timesheets + tiered payment reminders & weekly summary.",
  },
  COMPLIANCE: {
    title: "Compliance Agent",
    description:
      "Monitors document expiry; 30/7/0-day reminders, marks EXPIRED, suspends freelancers.",
  },
  OPS_COPILOT: {
    title: "Ops Copilot",
    description:
      "Chat with company data; answers ops questions & suggests actions (proposals).",
  },
  GENERAL: {
    title: "General LLM",
    description: "General questions (not used yet).",
  },
};

export default function AgentConfigPage() {
  const toast = useToast();

  const { data, isLoading, refetch } = trpc.agents.configList.useQuery();
  const { data: cost } = trpc.agents.costDashboard.useQuery();
  const { data: roleData } = trpc.membership.myRole.useQuery();
  const configUpdate = trpc.agents.configUpdate.useMutation({
    onSuccess: () => refetch(),
  });
  const runNow = trpc.agents.runNow.useMutation({
    onSuccess: (res) => toast(res.message ?? "Process completed.", "success"),
    onError: (err) => toast(err.message, "error"),
  });
  const reindex = trpc.agents.reindexEmbeddings.useMutation({
    onSuccess: (res) =>
      toast(
        `Embeddings reindexed: ${res.indexed} chunk(s), ${res.deleted} removed.`,
        "success",
      ),
    onError: (err) => toast(err.message, "error"),
  });

  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [mode, setMode] = useState<Record<string, "PROPOSE" | "AUTO">>({});
  const [budget, setBudget] = useState<Record<string, number>>({});
  const [threshold, setThreshold] = useState<Record<string, number | null>>({});

  const canEdit = roleData?.role === "OWNER" || roleData?.role === "ADMIN";

  const handleSave = async (agentType: string) => {
    try {
      await configUpdate.mutateAsync({
        agentType: agentType as AgentType,
        enabled: enabled[agentType],
        mode: mode[agentType],
        monthlyTokenBudget: budget[agentType],
        autoActionThreshold: threshold[agentType] ?? null,
      });
      toast("Configuration saved.", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save", "error");
    }
  };

  const configs = data?.configs ?? [];
  const runs = data?.runs ?? [];
  const runTotal = (agentType: string) =>
    runs.find((r) => r.agentType === agentType);

  if (isLoading) {
    return <p className="text-sm text-text-mid">Loading configuration…</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent Configuration"
        description="Enable agents, set mode (propose/auto), token budget, and auto-execution threshold"
      />

      {!canEdit && (
        <p className="rounded-lg border border-amber-200 bg-amber-500/10 px-4 py-3 text-sm text-amber-800">
          Read-only mode — only OWNER/ADMIN can change agent configuration.
        </p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-text-mid">
          Semantic search index (RAG) — freelancers, projects, invoices, and
          compliance records are embedded for the Ops Copilot chat.
        </p>
        <button
          type="button"
          onClick={() => reindex.mutate()}
          disabled={reindex.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-mid hover:bg-bg disabled:opacity-40"
        >
          <Database className="h-4 w-4" />
          Reindex Embeddings
        </button>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text-hi">
            Token usage (this month)
          </h3>
          <p className="text-sm text-text-mid">
            Total: {(cost?.monthTotal ?? 0).toLocaleString()} tokens
          </p>
        </div>
        <div className="mt-4 space-y-4">
          {(cost?.usage ?? []).map((u) => (
            <div key={u.agentType}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-text-mid">{u.agentType}</span>
                <span
                  className={
                    u.alert ? "font-semibold text-red-600" : "text-text-mid"
                  }
                >
                  {u.used.toLocaleString()} / {u.budget.toLocaleString()} tokens
                  ({u.percent}%)
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className={
                    u.alert
                      ? "h-full rounded-full bg-red-500"
                      : "h-full rounded-full bg-primary-600"
                  }
                  style={{ width: `${Math.min(u.percent, 100)}%` }}
                />
              </div>
              {u.alert && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  Alert: 80%+ of monthly token budget reached — review usage or
                  raise the budget.
                </p>
              )}
            </div>
          ))}
          {(cost?.usage ?? []).length === 0 && (
            <p className="text-sm text-text-mid">
              No agent configurations yet.
            </p>
          )}
        </div>
        {(cost?.weekly ?? []).length > 0 && (
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-lo">
              Last weeks
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {cost!.weekly.map((w) => (
                <div
                  key={w.weekStart}
                  className="rounded-lg border border-border px-3 py-2 text-xs"
                >
                  <p className="font-medium text-text-mid">{w.weekStart}</p>
                  <p className="text-text-mid">
                    {w.total.toLocaleString()} tokens
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {configs.map((config) => {
          const isEnabled = enabled[config.agentType] ?? config.enabled;
          const curMode = mode[config.agentType] ?? config.mode;
          const meta = AGENT_META[config.agentType] ?? {
            title: config.agentType,
            description: "",
          };
          const runInfo = runTotal(config.agentType);

          return (
            <div
              key={config.agentType}
              className="rounded-xl border border-border bg-surface p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-text-hi">
                    {meta?.title ?? config.agentType}
                  </h3>
                  <p className="mt-1 text-sm text-text-mid">
                    {meta?.description ?? ""}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    disabled={!canEdit}
                    onChange={(e) =>
                      setEnabled((s) => ({
                        ...s,
                        [config.agentType]: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-border accent-primary-600"
                  />
                  Active
                </label>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-medium text-text-mid">
                  Execution mode
                  <select
                    value={curMode}
                    disabled={!canEdit}
                    onChange={(e) =>
                      setMode((s) => ({
                        ...s,
                        [config.agentType]: e.target.value as
                          | "PROPOSE"
                          | "AUTO",
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50"
                  >
                    <option value="PROPOSE">PROPOSE (human approval)</option>
                    <option value="AUTO">AUTO (execute directly)</option>
                  </select>
                </label>
                <label className="block text-xs font-medium text-text-mid">
                  Token budget / month
                  <input
                    type="number"
                    value={
                      budget[config.agentType] ??
                      config.monthlyTokenBudget ??
                      100000
                    }
                    disabled={!canEdit}
                    onChange={(e) =>
                      setBudget((s) => ({
                        ...s,
                        [config.agentType]: Number(e.target.value),
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50"
                  />
                </label>
              </div>

              <label className="mt-3 block text-xs font-medium text-text-mid">
                Auto-execution threshold (max financial value for AUTO; empty =
                unlimited)
                <input
                  type="number"
                  value={
                    threshold[config.agentType] ??
                    config.autoActionThreshold ??
                    ""
                  }
                  disabled={!canEdit}
                  placeholder="e.g. 10000"
                  onChange={(e) =>
                    setThreshold((s) => ({
                      ...s,
                      [config.agentType]:
                        e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50"
                />
              </label>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-text-mid">
                  {runInfo
                    ? `${runInfo._count} run · ${(runInfo._sum.totalTokens ?? 0).toLocaleString()} token`
                    : "No runs yet"}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => handleSave(config.agentType)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-40"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      runNow.mutate({
                        agentType: config.agentType as AgentType,
                      })
                    }
                    disabled={runNow.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-mid hover:bg-bg disabled:opacity-40"
                  >
                    <Play className="h-4 w-4" />
                    Run Now
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
