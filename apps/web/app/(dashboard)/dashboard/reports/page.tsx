import { caller } from "@/lib/trpc/caller";
import { PageHeader } from "@/components/page-header";
import { formatCurrency } from "@repo/utils";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const api = await caller();
  const [stats, activity, invoices, compliance, timesheets] = await Promise.all(
    [
      api.dashboard.getStats(),
      api.dashboard.getRecentActivity(),
      api.invoice.list({ page: 1, limit: 100 }),
      api.compliance.list({}),
      api.timesheet.getSummary({}),
    ],
  );

  const now = Date.now();
  const overdueInvoices = invoices.data.filter(
    (i) => i.status === "OVERDUE",
  ).length;
  const currentInvoices = invoices.data.filter(
    (i) => !["PAID", "OVERDUE", "CANCELLED"].includes(i.status),
  ).length;
  const complianceScore =
    compliance.summary.total > 0
      ? Math.round(
          (compliance.summary.verified / compliance.summary.total) * 100,
        )
      : 100;

  const totalBudget = stats.budgetOverview.reduce(
    (sum, p) => sum + p.budget,
    0,
  );
  const spendPercent =
    totalBudget > 0
      ? Math.min(
          100,
          Math.round((stats.stats.monthlySpend / totalBudget) * 100),
        )
      : 0;
  const receivableTotal = stats.stats.totalPaid + stats.stats.totalOutstanding;
  const paidPercent =
    receivableTotal > 0
      ? Math.round((stats.stats.totalPaid / receivableTotal) * 100)
      : 0;
  const outstandingPercent = 100 - paidPercent;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Insights into spending, utilization, and compliance"
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Spending */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          <h3 className="text-lg font-semibold text-slate-900">
            Spending Overview
          </h3>
          <div className="mt-4 space-y-4">
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">
                  Monthly spend (approved hours)
                </span>
                <span className="font-medium">
                  {stats.stats.monthlySpendLabel}
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-slate-200">
                <div
                  className="h-2 rounded-full bg-primary-500"
                  style={{ width: `${spendPercent}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Total paid</span>
                <span className="font-medium">
                  {stats.stats.totalPaidLabel}
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-slate-200">
                <div
                  className="h-2 rounded-full bg-green-500"
                  style={{ width: `${paidPercent}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Outstanding</span>
                <span className="font-medium text-yellow-600">
                  {stats.stats.totalOutstandingLabel}
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-slate-200">
                <div
                  className="h-2 rounded-full bg-yellow-500"
                  style={{ width: `${outstandingPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Budget status */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          <h3 className="text-lg font-semibold text-slate-900">
            Project Budgets
          </h3>
          <div className="mt-4 space-y-4">
            {stats.budgetOverview.length === 0 && (
              <p className="text-sm text-slate-500">No active projects.</p>
            )}
            {stats.budgetOverview.map((p) => (
              <div key={p.id}>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">{p.name}</span>
                  <span className="font-medium">
                    {formatCurrency(p.spent)} / {formatCurrency(p.budget)} (
                    {p.percentUsed}%)
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-slate-200">
                  <div
                    className={`h-2 rounded-full ${p.percentUsed > 90 ? "bg-orange-500" : "bg-green-500"}`}
                    style={{ width: `${p.percentUsed}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invoice Aging */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          <h3 className="text-lg font-semibold text-slate-900">
            Invoice Aging
          </h3>
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div className="rounded-lg bg-green-50 p-4">
              <p className="text-2xl font-bold text-green-700">
                {currentInvoices}
              </p>
              <p className="text-xs text-green-600">Open</p>
            </div>
            <div className="rounded-lg bg-yellow-50 p-4">
              <p className="text-2xl font-bold text-yellow-700">
                {invoices.summary.totalDraft}
              </p>
              <p className="text-xs text-yellow-600">Draft</p>
            </div>
            <div className="rounded-lg bg-red-50 p-4">
              <p className="text-2xl font-bold text-red-700">
                {overdueInvoices}
              </p>
              <p className="text-xs text-red-600">Overdue</p>
            </div>
          </div>
        </div>

        {/* Compliance Score */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          <h3 className="text-lg font-semibold text-slate-900">
            Compliance Score
          </h3>
          <div className="mt-4 text-center">
            <div
              className={`inline-flex h-32 w-32 items-center justify-center rounded-full border-8 ${
                complianceScore >= 90
                  ? "border-green-200 bg-green-50"
                  : complianceScore >= 70
                    ? "border-yellow-200 bg-yellow-50"
                    : "border-red-200 bg-red-50"
              }`}
            >
              <span
                className={`text-3xl font-bold ${
                  complianceScore >= 90
                    ? "text-green-700"
                    : complianceScore >= 70
                      ? "text-yellow-700"
                      : "text-red-700"
                }`}
              >
                {complianceScore}%
              </span>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              {compliance.summary.verified} of {compliance.summary.total}{" "}
              documents verified
            </p>
          </div>
        </div>
      </div>

      {/* Utilization */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
        <h3 className="text-base font-semibold text-slate-900">
          Timesheet Summary
        </h3>
        <div className="mt-4 grid gap-6 sm:grid-cols-3">
          <div className="rounded-lg bg-primary-50 p-4 text-center">
            <p className="text-2xl font-bold text-primary-700">
              {timesheets.totalHours}h
            </p>
            <p className="text-xs text-primary-600">Approved hours</p>
          </div>
          <div className="rounded-lg bg-yellow-50 p-4 text-center">
            <p className="text-2xl font-bold text-yellow-700">
              {timesheets.pendingCount}
            </p>
            <p className="text-xs text-yellow-600">Pending approval</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 text-center">
            <p className="text-2xl font-bold text-slate-700">
              {timesheets.entryCount}
            </p>
            <p className="text-xs text-slate-600">Total entries</p>
          </div>
        </div>
      </div>

      {/* Activity feed */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
        <h3 className="text-lg font-semibold text-slate-900">
          Latest Activity
        </h3>
        <div className="mt-4 divide-y">
          {activity.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between py-2.5"
            >
              <p className="text-sm text-slate-700">
                <span className="font-medium text-slate-900">
                  {entry.action}
                </span>
                <span className="text-slate-400"> — {entry.user}</span>
              </p>
              <span className="text-xs text-slate-400">
                {new Date(entry.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Data as of {new Date(now).toLocaleString()} — spend is calculated from
        approved timesheets × contract rates.
      </p>
    </div>
  );
}
