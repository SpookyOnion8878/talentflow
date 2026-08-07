import Link from "next/link";
import { caller } from "@/lib/trpc/caller";
import { StatCard } from "@/components/stat-card";
import { formatCurrency, formatDateTime } from "@repo/utils";

const ACTIVITY_ICONS: Record<string, string> = {
  timesheet: "⏱️",
  payment: "💰",
  contract: "📝",
  compliance: "🛡️",
  freelancer: "👤",
  project: "📁",
  invoice: "🧾",
  company: "🏢",
  system: "⚙️",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const api = await caller();
  const [stats, activity] = await Promise.all([
    api.dashboard.getStats(),
    api.dashboard.getRecentActivity(),
  ]);

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Freelancers"
          value={stats.stats.activeFreelancers}
          hint={`${stats.stats.freelancers} total`}
        />
        <StatCard
          label="Active Projects"
          value={stats.stats.activeProjects}
          hint={`${stats.stats.projects} total`}
          color="text-green-600 bg-green-50"
        />
        <StatCard
          label="Pending Approvals"
          value={stats.stats.pendingTimesheets}
          hint={`${stats.stats.pendingInvoices} invoices not yet paid`}
          color="text-yellow-600 bg-yellow-50"
        />
        <StatCard
          label="Monthly Spend"
          value={stats.stats.monthlySpendLabel}
          color="text-purple-600 bg-purple-50"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Budget Overview */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Budget Overview
            </h3>
            <Link
              href="/dashboard/projects"
              className="text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-4">
            {stats.budgetOverview.length === 0 && (
              <p className="text-sm text-gray-500">No active projects yet.</p>
            )}
            {stats.budgetOverview.map((p) => (
              <div key={p.id}>
                <div className="flex justify-between text-sm">
                  <Link
                    href={`/dashboard/projects/${p.id}`}
                    className="font-medium text-gray-700 hover:text-primary-600"
                  >
                    {p.name}
                  </Link>
                  <span className="text-gray-600">
                    {formatCurrency(p.spent, p.currency)} /{" "}
                    {formatCurrency(p.budget, p.currency)}
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-gray-200">
                  <div
                    className={`h-2 rounded-full ${p.percentUsed > 90 ? "bg-orange-500" : p.percentUsed > 70 ? "bg-yellow-500" : "bg-blue-500"}`}
                    style={{ width: `${p.percentUsed}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance + Finance Snapshot */}
        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">Finance</h3>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm text-gray-500">Outstanding</p>
                <p className="text-xl font-bold text-gray-900">
                  {stats.stats.totalOutstandingLabel}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Paid</p>
                <p className="text-xl font-bold text-green-600">
                  {stats.stats.totalPaidLabel}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">Compliance</h3>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm text-gray-500">Pending review</p>
                <p
                  className={`text-xl font-bold ${stats.stats.compliancePending > 0 ? "text-yellow-600" : "text-gray-900"}`}
                >
                  {stats.stats.compliancePending}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Expired</p>
                <p
                  className={`text-xl font-bold ${stats.stats.complianceExpired > 0 ? "text-red-600" : "text-gray-900"}`}
                >
                  {stats.stats.complianceExpired}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Activity
          </h3>
          <Link
            href="/dashboard/reports"
            className="text-sm font-medium text-primary-600 hover:text-primary-500"
          >
            Reports
          </Link>
        </div>
        <div className="mt-4 divide-y">
          {activity.length === 0 && (
            <p className="py-3 text-sm text-gray-500">No activity yet.</p>
          )}
          {activity.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm">
                  {ACTIVITY_ICONS[entry.type] ?? "•"}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {entry.action}
                  </p>
                  <p className="text-xs text-gray-500">{entry.user}</p>
                </div>
              </div>
              <span className="text-xs text-gray-400">
                {formatDateTime(entry.createdAt)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
