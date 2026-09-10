import Link from "next/link";
import { notFound } from "next/navigation";
import { caller } from "@/lib/trpc/caller";
import { StatusBadge } from "@repo/ui/status-badge";
import { EmptyState } from "@repo/ui/empty-state";
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
          className="text-sm text-link hover:text-primary-700"
        >
          &larr; Back to Projects
        </Link>
      </div>

      {/* Header */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-text-hi">{project.name}</h2>
            <p className="mt-1 text-sm text-text-mid">
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
          <p className="mt-4 text-sm text-text-mid">{project.description}</p>
        )}

        {/* Budget summary */}
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-bg p-4">
            <p className="text-xs text-text-mid">Budget</p>
            <p className="text-lg font-semibold text-text-hi">
              {formatCurrency(budget.budget, project.currency)}
            </p>
          </div>
          <div className="rounded-lg bg-bg p-4">
            <p className="text-xs text-text-mid">Spent</p>
            <p className="text-lg font-semibold text-text-hi">
              {formatCurrency(budget.spent, project.currency)}
            </p>
          </div>
          <div className="rounded-lg bg-bg p-4">
            <p className="text-xs text-text-mid">Remaining</p>
            <p className="text-lg font-semibold text-text-hi">
              {formatCurrency(budget.remaining, project.currency)}
            </p>
          </div>
          <div className="rounded-lg bg-bg p-4">
            <p className="text-xs text-text-mid">Total Hours</p>
            <p className="text-lg font-semibold text-text-hi">
              {budget.totalHours}h
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className={`h-full rounded-full ${budget.percentUsed > 90 ? "bg-red-500" : budget.percentUsed > 70 ? "bg-amber-500" : "bg-primary-600"}`}
              style={{ width: `${budget.percentUsed}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-text-mid">
            {budget.percentUsed}% of budget used
          </p>
          {budget.excludedCurrencyEntries > 0 && (
            <p className="mt-1 text-xs text-amber-600">
              {`${budget.excludedCurrencyEntries} ${
                budget.excludedCurrencyEntries === 1
                  ? "timesheet entry was"
                  : "timesheet entries were"
              } excluded because the contract currency differs from the project currency.`}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Assignments */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-hi">Team</h3>
            <Link
              href={`/dashboard/projects/${project.id}/assign`}
              className="text-sm font-medium text-link hover:text-link"
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
                    className="flex items-center gap-3 text-sm font-medium text-text-hi hover:text-link"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-soft text-sm font-bold text-primary-700">
                      {a.freelancer.firstName.charAt(0)}
                    </div>
                    <div>
                      <p>
                        {a.freelancer.firstName} {a.freelancer.lastName}
                      </p>
                      <p className="text-xs font-normal text-text-mid">
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
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <h3 className="text-lg font-semibold text-text-hi">Contracts</h3>
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
                      className="text-sm font-medium text-text-hi hover:text-link"
                    >
                      {c.freelancer.firstName} {c.freelancer.lastName}
                    </Link>
                    <p className="text-xs text-text-mid">{c.title}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Timesheets */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <h3 className="text-lg font-semibold text-text-hi">
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
                    <p className="text-sm font-medium text-text-hi">
                      {formatDate(t.date)}
                    </p>
                    <p className="text-xs text-text-mid">
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
