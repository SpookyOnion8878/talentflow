import Link from "next/link";
import {
  Timer,
  Banknote,
  FileText,
  ShieldCheck,
  User,
  Folder,
  ReceiptText,
  Building2,
  Settings,
  Activity,
} from "lucide-react";
import { caller } from "@/lib/trpc/caller";
import { StatCard } from "@repo/ui/stat-card";
import { formatCurrency, formatDateTime } from "@repo/utils";

const ACTIVITY_ICONS = [
  { key: "timesheet", icon: Timer },
  { key: "payment", icon: Banknote },
  { key: "contract", icon: FileText },
  { key: "compliance", icon: ShieldCheck },
  { key: "freelancer", icon: User },
  { key: "project", icon: Folder },
  { key: "invoice", icon: ReceiptText },
  { key: "company", icon: Building2 },
  { key: "system", icon: Settings },
] as const;

function ActivityIcon({ type }: { type: string }) {
  const match = ACTIVITY_ICONS.find((a) => a.key === type);
  const Icon = match?.icon ?? Activity;
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-soft text-link">
      <Icon className="h-4 w-4" />
    </div>
  );
}

type FinancialMetric = "monthlySpend" | "outstanding" | "paid";

function formatFinancialBreakdown(
  summaries: Record<
    string,
    { monthlySpend: number; outstanding: number; paid: number }
  >,
  metric: FinancialMetric,
): string {
  const values = Object.entries(summaries)
    .filter(([, summary]) => summary[metric] !== 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, summary]) => formatCurrency(summary[metric], currency));
  return values.length > 0 ? values.join(" · ") : "—";
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const api = await caller();
  const [stats, activity] = await Promise.all([
    api.dashboard.getStats(),
    api.dashboard.getRecentActivity(),
  ]);
  const monthlySpendLabel = formatFinancialBreakdown(
    stats.stats.financialByCurrency,
    "monthlySpend",
  );
  const outstandingLabel = formatFinancialBreakdown(
    stats.stats.financialByCurrency,
    "outstanding",
  );
  const paidLabel = formatFinancialBreakdown(
    stats.stats.financialByCurrency,
    "paid",
  );

  return (
    <div className="space-y-6">
      {/* Focus: outstanding cash + secondary metrics */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Link
          href="/dashboard/invoices"
          className="group flex flex-col justify-between rounded-xl border border-border bg-surface p-6 shadow-card transition-shadow hover:shadow-card-hover"
        >
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-text-mid">
              Outstanding invoices
            </p>
            <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-amber-600">
              {stats.stats.pendingInvoices} unpaid
            </span>
          </div>
          <p className="mt-3 text-4xl font-semibold leading-none tracking-tight text-text-hi tabular-nums">
            {outstandingLabel}
          </p>
          <p className="mt-4 text-sm font-medium text-link group-hover:underline">
            Review invoices →
          </p>
        </Link>
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          <StatCard
            label="Active Freelancers"
            value={stats.stats.activeFreelancers}
            hint={`${stats.stats.freelancers} total`}
          />
          <StatCard
            label="Active Projects"
            value={stats.stats.activeProjects}
            hint={`${stats.stats.projects} total`}
            color="text-emerald-600 bg-emerald-500/10"
          />
          <StatCard
            label="Pending Approvals"
            value={stats.stats.pendingTimesheets}
            hint={`${stats.stats.pendingInvoices} invoices not yet paid`}
            color="text-amber-600 bg-amber-500/10"
          />
          <StatCard
            label="Monthly Spend"
            value={monthlySpendLabel}
            color="text-violet-600 bg-violet-500/10"
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Budget Overview */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-text-hi">
              Budget Overview
            </h3>
            <Link
              href="/dashboard/projects"
              className="text-sm font-medium text-link transition-colors hover:text-link"
            >
              View all
            </Link>
          </div>
          <div className="mt-5 space-y-5">
            {stats.budgetOverview.length === 0 && (
              <p className="text-sm text-text-mid">No active projects yet.</p>
            )}
            {stats.budgetOverview.map((p) => (
              <div key={p.id}>
                <div className="flex justify-between text-sm">
                  <Link
                    href={`/dashboard/projects/${p.id}`}
                    className="font-medium text-text-mid transition-colors hover:text-link"
                  >
                    {p.name}
                  </Link>
                  <span className="text-text-mid">
                    {formatCurrency(p.spent, p.currency)} /{" "}
                    {formatCurrency(p.budget, p.currency)}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className={`h-full rounded-full ${
                      p.percentUsed > 90
                        ? "bg-red-500"
                        : p.percentUsed > 70
                          ? "bg-amber-500"
                          : "bg-primary-600"
                    }`}
                    style={{ width: `${p.percentUsed}%` }}
                  />
                </div>
                {p.excludedCurrencyEntries > 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    {`${p.excludedCurrencyEntries} ${
                      p.excludedCurrencyEntries === 1
                        ? "timesheet entry was"
                        : "timesheet entries were"
                    } excluded because the contract currency differs from the project currency.`}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Compliance + Finance Snapshot */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
            <h3 className="text-base font-semibold text-text-hi">Finance</h3>
            <div className="mt-5 space-y-5">
              <div>
                <p className="text-sm text-text-mid">Total Paid</p>
                <p className="mt-0.5 text-xl font-bold text-emerald-600">
                  {paidLabel}
                </p>
              </div>
              <div>
                <p className="text-sm text-text-mid">Monthly Spend</p>
                <p className="mt-0.5 text-xl font-bold text-text-hi">
                  {monthlySpendLabel}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
            <h3 className="text-base font-semibold text-text-hi">Compliance</h3>
            <div className="mt-5 space-y-5">
              <div>
                <p className="text-sm text-text-mid">Pending review</p>
                <p
                  className={`mt-0.5 text-xl font-bold ${
                    stats.stats.compliancePending > 0
                      ? "text-amber-600"
                      : "text-text-hi"
                  }`}
                >
                  {stats.stats.compliancePending}
                </p>
              </div>
              <div>
                <p className="text-sm text-text-mid">Expired</p>
                <p
                  className={`mt-0.5 text-xl font-bold ${
                    stats.stats.complianceExpired > 0
                      ? "text-red-600"
                      : "text-text-hi"
                  }`}
                >
                  {stats.stats.complianceExpired}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-text-hi">
            Recent Activity
          </h3>
          <Link
            href="/dashboard/reports"
            className="text-sm font-medium text-link transition-colors hover:text-link"
          >
            Reports
          </Link>
        </div>
        <div className="mt-4 divide-y divide-border">
          {activity.length === 0 && (
            <p className="py-3 text-sm text-text-mid">No activity yet.</p>
          )}
          {activity.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div className="flex items-center gap-3">
                <ActivityIcon type={entry.type} />
                <div>
                  <p className="text-sm font-medium text-text-hi">
                    {entry.action}
                  </p>
                  <p className="text-xs text-text-mid">{entry.user}</p>
                </div>
              </div>
              <span className="shrink-0 text-xs text-text-lo">
                {formatDateTime(entry.createdAt)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
