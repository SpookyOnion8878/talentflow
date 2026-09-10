import { caller } from "@/lib/trpc/caller";
import { PageHeader } from "@repo/ui/page-header";
import { formatCurrency } from "@repo/utils";
import {
  CHART_COLORS,
  InvoiceAgingChart,
  MonthlySpendChart,
  type AgingBucket,
  type SpendBucket,
} from "@/components/charts";

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

  // Monthly spend buckets: last 6 calendar months, paid vs outstanding.
  const bucketKey = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  const monthOrder: string[] = [];
  const monthBuckets = new Map<string, SpendBucket>();
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i, 1);
    const key = bucketKey(d);
    monthOrder.push(key);
    monthBuckets.set(key, { month: key, paid: 0, outstanding: 0 });
  }
  const mixedCurrency = new Set(invoices.data.map((i) => i.currency)).size > 1;
  for (const invoice of invoices.data) {
    const bucket = monthBuckets.get(bucketKey(new Date(invoice.createdAt)));
    if (!bucket) continue;
    if (invoice.status === "PAID") bucket.paid += invoice.totalAmount;
    else if (["SENT", "VIEWED", "OVERDUE"].includes(invoice.status))
      bucket.outstanding += invoice.totalAmount;
  }
  const spendData = monthOrder
    .map((k) => monthBuckets.get(k)!)
    .filter((b) => b.paid > 0 || b.outstanding > 0);

  // Aging donut from lifecycle status counts (all company invoices).
  const statusCounts = invoices.summary.statusCounts;
  const agingData: AgingBucket[] = [
    {
      name: "Open",
      value:
        (statusCounts.SENT ?? 0) +
        (statusCounts.VIEWED ?? 0) +
        (statusCounts.OVERDUE ?? 0),
      color: CHART_COLORS.open,
    },
    {
      name: "Draft",
      value: statusCounts.DRAFT ?? 0,
      color: CHART_COLORS.draft,
    },
    {
      name: "Paid",
      value: statusCounts.PAID ?? 0,
      color: CHART_COLORS.paid,
    },
    { name: "Cancelled", value: statusCounts.CANCELLED ?? 0, color: "#71717a" },
  ].filter((b) => b.value > 0);
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

  const financialEntries = Object.entries(stats.stats.financialByCurrency).sort(
    ([left], [right]) => left.localeCompare(right),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Insights into spending, utilization, and compliance"
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Spending */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <h3 className="text-lg font-semibold text-text-hi">
            Spending Overview
          </h3>
          <div className="mt-4 space-y-4">
            {financialEntries.length === 0 && (
              <p className="text-sm text-text-mid">
                No financial activity is available.
              </p>
            )}
            {financialEntries.map(([currency, summary]) => {
              const receivableTotal = summary.paid + summary.outstanding;
              const paidPercent =
                receivableTotal > 0
                  ? Math.round((summary.paid / receivableTotal) * 100)
                  : 0;
              return (
                <div
                  key={currency}
                  className="rounded-lg border border-border p-3"
                >
                  <p className="text-xs font-semibold uppercase text-text-mid">
                    {currency}
                  </p>
                  <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-text-mid">Monthly spend</dt>
                      <dd className="font-medium">
                        {formatCurrency(summary.monthlySpend, currency)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-text-mid">Paid</dt>
                      <dd className="font-medium text-green-600">
                        {formatCurrency(summary.paid, currency)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-text-mid">Outstanding</dt>
                      <dd className="font-medium text-yellow-600">
                        {formatCurrency(summary.outstanding, currency)}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-amber-500/20">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${paidPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Budget status */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <h3 className="text-lg font-semibold text-text-hi">
            Project Budgets
          </h3>
          <div className="mt-4 space-y-4">
            {stats.budgetOverview.length === 0 && (
              <p className="text-sm text-text-mid">No active projects.</p>
            )}
            {stats.budgetOverview.map((p) => (
              <div key={p.id}>
                <div className="flex justify-between text-sm">
                  <span className="text-text-mid">{p.name}</span>
                  <span className="font-medium">
                    {formatCurrency(p.spent, p.currency)} /{" "}
                    {formatCurrency(p.budget, p.currency)} ({p.percentUsed}%)
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-surface-2">
                  <div
                    className={`h-2 rounded-full ${p.percentUsed > 90 ? "bg-orange-500" : "bg-green-500"}`}
                    style={{ width: `${p.percentUsed}%` }}
                  />
                </div>
                {p.excludedCurrencyEntries > 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    {`${p.excludedCurrencyEntries} cross-currency ${
                      p.excludedCurrencyEntries === 1
                        ? "timesheet entry was"
                        : "timesheet entries were"
                    } excluded.`}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Invoice Aging */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <h3 className="text-lg font-semibold text-text-hi">Invoice Aging</h3>
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div className="rounded-lg bg-emerald-500/10 p-4">
              <p className="text-2xl font-bold text-green-700">
                {currentInvoices}
              </p>
              <p className="text-xs text-green-600">Open</p>
            </div>
            <div className="rounded-lg bg-amber-500/10 p-4">
              <p className="text-2xl font-bold text-yellow-700">
                {invoices.summary.statusCounts.DRAFT ?? 0}
              </p>
              <p className="text-xs text-yellow-600">Draft</p>
            </div>
            <div className="rounded-lg bg-red-500/10 p-4">
              <p className="text-2xl font-bold text-red-600">
                {overdueInvoices}
              </p>
              <p className="text-xs text-red-600">Overdue</p>
            </div>
          </div>
        </div>

        {/* Compliance Score */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <h3 className="text-lg font-semibold text-text-hi">
            Compliance Score
          </h3>
          <div className="mt-4 text-center">
            <div
              className={`inline-flex h-32 w-32 items-center justify-center rounded-full border-8 ${
                complianceScore >= 90
                  ? "border-green-200 bg-green-50"
                  : complianceScore >= 70
                    ? "border-yellow-200 bg-yellow-50"
                    : "border-red-200 bg-red-500/10"
              }`}
            >
              <span
                className={`text-3xl font-bold ${
                  complianceScore >= 90
                    ? "text-green-700"
                    : complianceScore >= 70
                      ? "text-yellow-700"
                      : "text-red-600"
                }`}
              >
                {complianceScore}%
              </span>
            </div>
            <p className="mt-4 text-sm text-text-mid">
              {compliance.summary.verified} of {compliance.summary.total}{" "}
              documents verified
            </p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <h3 className="text-base font-semibold text-text-hi">
            Monthly Invoiced Amount
          </h3>
          <p className="mt-0.5 text-xs text-text-lo">
            By invoice creation date —{" "}
            {mixedCurrency
              ? "amounts mix currencies (mixed-currency workspace)"
              : "single currency"}
          </p>
          <div className="mt-4">
            {spendData.length === 0 ? (
              <p className="text-sm text-text-mid">
                No invoices created in the last 6 months.
              </p>
            ) : (
              <MonthlySpendChart data={spendData} />
            )}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <h3 className="text-base font-semibold text-text-hi">
            Invoice Lifecycle
          </h3>
          <p className="mt-0.5 text-xs text-text-lo">
            All invoices in this workspace by stage
          </p>
          <div className="mt-4">
            {agingData.length === 0 ? (
              <p className="text-sm text-text-mid">No invoices yet.</p>
            ) : (
              <InvoiceAgingChart data={agingData} />
            )}
          </div>
        </div>
      </div>

      {/* Utilization */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
        <h3 className="text-base font-semibold text-text-hi">
          Timesheet Summary
        </h3>
        <div className="mt-4 grid gap-6 sm:grid-cols-3">
          <div className="rounded-lg bg-soft p-4 text-center">
            <p className="text-2xl font-bold text-primary-700">
              {timesheets.totalHours}h
            </p>
            <p className="text-xs text-link">Approved hours</p>
          </div>
          <div className="rounded-lg bg-amber-500/10 p-4 text-center">
            <p className="text-2xl font-bold text-yellow-700">
              {timesheets.pendingCount}
            </p>
            <p className="text-xs text-yellow-600">Pending approval</p>
          </div>
          <div className="rounded-lg bg-bg p-4 text-center">
            <p className="text-2xl font-bold text-text-mid">
              {timesheets.entryCount}
            </p>
            <p className="text-xs text-text-mid">Total entries</p>
          </div>
        </div>
      </div>

      {/* Activity feed */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
        <h3 className="text-lg font-semibold text-text-hi">Latest Activity</h3>
        <div className="mt-4 divide-y">
          {activity.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between py-2.5"
            >
              <p className="text-sm text-text-mid">
                <span className="font-medium text-text-hi">{entry.action}</span>
                <span className="text-text-lo"> — {entry.user}</span>
              </p>
              <span className="text-xs text-text-lo">
                {new Date(entry.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-text-lo">
        Data as of {new Date(now).toLocaleString()} — spend is calculated from
        approved timesheets × contract rates.
      </p>
    </div>
  );
}
