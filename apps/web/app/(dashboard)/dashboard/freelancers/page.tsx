"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { StatusBadge } from "@repo/ui/status-badge";
import { EmptyState } from "@repo/ui/empty-state";
import { PageHeader } from "@repo/ui/page-header";
import { ConfirmDialog } from "@repo/ui/confirm-dialog";
import { StatusSelect } from "@repo/ui/status-select";
import { useToast } from "@/components/toast";

export default function FreelancersPage() {
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, refetch } = trpc.freelancer.list.useQuery({
    page: 1,
    limit: 50,
    search: debouncedSearch || undefined,
    status,
  });

  const deleteMutation = trpc.freelancer.delete.useMutation({
    onSuccess: () => refetch(),
  });

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteTarget.id });
      toast("Freelancer deleted.", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to delete freelancer",
        "error",
      );
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Freelancers"
        description="Manage your freelancers and contractors"
        action={{
          label: "Add Freelancer",
          href: "/dashboard/freelancers/new",
        }}
      />

      {/* Filters */}
      <div className="flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search freelancers..."
          className="flex-1 rounded-lg border border-border px-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <StatusSelect
          value={status}
          onChange={setStatus}
          ariaLabel="Filter by status"
          options={[
            { value: "ALL", label: "All Status" },
            { value: "ACTIVE", label: "Active" },
            { value: "INACTIVE", label: "Inactive" },
            { value: "SUSPENDED", label: "Suspended" },
            { value: "BLACKLISTED", label: "Blacklisted" },
          ]}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="rounded-xl border border-border bg-surface shadow-card p-8 text-center text-sm text-text-mid">
          Loading...
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState
          title="No freelancers found"
          description="Add your first freelancer to get started"
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-bg">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-mid">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-mid">
                  Skills
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-mid">
                  Country
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-mid">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-mid">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-mid">
                  Contracts
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-mid">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-surface">
              {data.data.map((f) => (
                <tr key={f.id} className="hover:bg-bg">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-soft text-sm font-bold text-primary-700">
                        {`${f.firstName.charAt(0)}${f.lastName.charAt(0)}`}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-hi">
                          {f.firstName} {f.lastName}
                        </p>
                        <p className="text-xs text-text-mid">{f.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex max-w-xs flex-wrap gap-1">
                      {f.skills.slice(0, 3).map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-text-mid"
                        >
                          {skill}
                        </span>
                      ))}
                      {f.skills.length > 3 && (
                        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-text-lo">
                          +{f.skills.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-text-mid">
                    {f.country ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <StatusBadge status={f.status} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-text-mid">
                    ⭐ {f.rating.toFixed(1)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-text-mid">
                    {f._count.contracts}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/dashboard/freelancers/${f.id}`}
                        className="text-sm font-medium text-link hover:text-link"
                      >
                        View
                      </Link>
                      <button
                        onClick={() =>
                          setDeleteTarget({
                            id: f.id,
                            name: `${f.firstName} ${f.lastName}`,
                          })
                        }
                        className="text-sm font-medium text-red-600 hover:text-red-500"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete freelancer?"
        description={
          deleteTarget
            ? `“${deleteTarget.name}” and their records will be permanently removed. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
