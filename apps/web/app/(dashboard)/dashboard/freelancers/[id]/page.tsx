import Link from "next/link";
import { notFound } from "next/navigation";
import { caller } from "@/lib/trpc/caller";
import { StatusBadge } from "@repo/ui/status-badge";
import { EmptyState } from "@repo/ui/empty-state";
import { formatCurrency, formatDate } from "@repo/utils";

export const dynamic = "force-dynamic";

export default async function FreelancerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const api = await caller();

  let freelancer;
  try {
    freelancer = await api.freelancer.getById({ id });
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/freelancers"
          className="text-sm text-primary-600 hover:text-primary-700"
        >
          &larr; Back to Freelancers
        </Link>
      </div>

      {/* Profile header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-xl font-bold text-primary-700">
              {freelancer.firstName.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                {freelancer.firstName} {freelancer.lastName}
              </h2>
              <p className="text-sm text-slate-500">
                {freelancer.email}
                {freelancer.phone ? ` · ${freelancer.phone}` : ""}
                {freelancer.country ? ` · ${freelancer.country}` : ""}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge status={freelancer.status} />
                <span className="text-sm text-slate-600">
                  ⭐ {freelancer.rating.toFixed(1)}
                </span>
                <span className="text-sm text-slate-600">
                  {freelancer.currency}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1">
          {freelancer.skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
            >
              {skill}
            </span>
          ))}
        </div>

        {freelancer.notes && (
          <p className="mt-4 text-sm text-slate-600">{freelancer.notes}</p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Contracts */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          <h3 className="text-lg font-semibold text-slate-900">Contracts</h3>
          {freelancer.contracts.length === 0 ? (
            <EmptyState title="No contracts" />
          ) : (
            <div className="mt-4 divide-y">
              {freelancer.contracts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {c.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {c.contractNo} ·{" "}
                      {formatCurrency(c.ratePerHour, c.currency)}/hr ·{" "}
                      {c.project?.name ?? "No project"}
                    </p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Project assignments */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          <h3 className="text-lg font-semibold text-slate-900">
            Project Assignments
          </h3>
          {freelancer.projectAssignments.length === 0 ? (
            <EmptyState title="No assignments" />
          ) : (
            <div className="mt-4 divide-y">
              {freelancer.projectAssignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <Link
                      href={`/dashboard/projects/${a.project.id}`}
                      className="text-sm font-medium text-primary-600 hover:text-primary-500"
                    >
                      {a.project.name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {a.role ?? "Team member"}
                    </p>
                  </div>
                  <StatusBadge status={a.project.status} />
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
          {freelancer.timesheets.length === 0 ? (
            <EmptyState title="No timesheets" />
          ) : (
            <div className="mt-4 divide-y">
              {freelancer.timesheets.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {formatDate(t.date)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t.hours}h · {t.project?.name ?? "No project"}
                    </p>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Compliance */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          <h3 className="text-lg font-semibold text-slate-900">
            Compliance Records
          </h3>
          {freelancer.complianceRecords.length === 0 ? (
            <EmptyState title="No compliance records" />
          ) : (
            <div className="mt-4 divide-y">
              {freelancer.complianceRecords.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {r.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {r.expiryDate
                        ? `Expires ${formatDate(r.expiryDate)}`
                        : "No expiry"}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Invoices */}
      {freelancer.invoices.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          <h3 className="text-lg font-semibold text-slate-900">
            Recent Invoices
          </h3>
          <div className="mt-4 divide-y">
            {freelancer.invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {inv.invoiceNo}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDate(inv.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    {formatCurrency(inv.totalAmount, inv.currency)}
                  </span>
                  <StatusBadge status={inv.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
