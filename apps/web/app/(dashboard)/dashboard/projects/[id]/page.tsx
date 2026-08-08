import Link from "next/link";
import { notFound } from "next/navigation";
import { caller } from "@/lib/trpc/caller";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { formatCurrency, formatDate } from "@repo/utils";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const api = await caller();

  let project;
  let budget;
  try {
    [project, budget] = await Promise.all([
      api.project.getById({ id }),
      api.project.getBudgetSummary({ id }),
    ]);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/projects"
          className="text-sm text-primary-600 hover:text-primary-700"
        >
          &larr; Back to Projects
        </Link>
      </div>

      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {project.name}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {project.currency} ·{" "}
              {project.startDate
                ? formatDate(project.startDate)
                : "No start date"}{" "}
              → {project.endDate ? formatDate(project.endDate) : "Ongoing"}
            </p>
            <div className="mt-2">
              <StatusBadge status={project.status} />
            </div>
          </div>
        </div>
        {project.description && (
          <p className="mt-4 text-sm text-slate-600">{project.description}</p>
        )}

        {/* Budget summary */}
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Budget</p>
            <p className="text-lg font-semibold text-slate-900">
              {formatCurrency(budget.budget, project.currency)}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Spent</p>
            <p className="text-lg font-semibold text-slate-900">
              {formatCurrency(budget.spent, project.currency)}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Remaining</p>
            <p className="text-lg font-semibold text-slate-900">
              {formatCurrency(budget.remaining, project.currency)}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Total Hours</p>
            <p className="text-lg font-semibold text-slate-900">
              {budget.totalHours}h
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full ${budget.percentUsed > 90 ? "bg-red-500" : budget.percentUsed > 70 ? "bg-amber-500" : "bg-primary-600"}`}
              style={{ width: `${budget.percentUsed}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {budget.percentUsed}% of budget used
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Assignments */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Team</h3>
            <Link
              href={`/dashboard/projects/${project.id}/assign`}
              className="text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              Assign freelancer
            </Link>
          </div>
          {project.assignments.length === 0 ? (
            <EmptyState title="No team members" />
          ) : (
            <div className="mt-4 divide-y">
              {project.assignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between py-3"
                >
                  <Link
                    href={`/dashboard/freelancers/${a.freelancer.id}`}
                    className="flex items-center gap-3 text-sm font-medium text-slate-900 hover:text-primary-600"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                      {a.freelancer.firstName.charAt(0)}
                    </div>
                    <div>
                      <p>
                        {a.freelancer.firstName} {a.freelancer.lastName}
                      </p>
                      <p className="text-xs font-normal text-slate-500">
                        {a.role ?? "Team member"}
                      </p>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contracts */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          <h3 className="text-lg font-semibold text-slate-900">Contracts</h3>
          {project.contracts.length === 0 ? (
            <EmptyState title="No contracts" />
          ) : (
            <div className="mt-4 divide-y">
              {project.contracts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <Link
                      href={`/dashboard/freelancers/${c.freelancer.id}`}
                      className="text-sm font-medium text-slate-900 hover:text-primary-600"
                    >
                      {c.freelancer.firstName} {c.freelancer.lastName}
                    </Link>
                    <p className="text-xs text-slate-500">{c.title}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Timesheets */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          <h3 className="text-lg font-semibold text-slate-900">
            Recent Timesheets
          </h3>
          {project.timesheets.length === 0 ? (
            <EmptyState title="No timesheets" />
          ) : (
            <div className="mt-4 divide-y">
              {project.timesheets.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {formatDate(t.date)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t.hours}h · {t.freelancer?.firstName}{" "}
                      {t.freelancer?.lastName}
                    </p>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
