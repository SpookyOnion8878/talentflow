import Link from "next/link";
import { Users } from "lucide-react";
import { caller } from "@/lib/trpc/caller";
import { PageHeader } from "@repo/ui/page-header";
import { EmptyState } from "@repo/ui/empty-state";
import { StatusBadge } from "@repo/ui/status-badge";
import { formatCurrency } from "@repo/utils";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const api = await caller();
  const { data } = await api.project.list({ page: 1, limit: 50 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Track projects, budgets, and team assignments"
        action={{ label: "New Project", href: "/dashboard/projects/new" }}
      />

      {data.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create your first project to start tracking"
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/projects/${p.id}`}
              className="group rounded-xl border border-border bg-surface p-6 shadow-card transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold text-text-hi group-hover:text-link">
                  {p.name}
                </h3>
                <StatusBadge status={p.status} />
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-text-mid">
                {p.description || "No description"}
              </p>
              <div className="mt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-text-mid">Budget</span>
                  <span className="font-medium">
                    {p.budget ? formatCurrency(p.budget, p.currency) : "—"}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-text-mid">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {p.assignments.length > 0
                    ? `${p.assignments.length} freelancers`
                    : "No assignments"}
                </span>
                <span>{p._count.timesheets} timesheets</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
