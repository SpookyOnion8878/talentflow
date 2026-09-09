"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/components/toast";

export default function FreelancersPage() {
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
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

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete freelancer ${name}? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync({ id });
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to delete freelancer",
        "error",
      );
    }
  };

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
          className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-primary-500 focus:outline-none"
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="BLACKLISTED">Blacklisted</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-card p-8 text-center text-sm text-slate-500">
          Loading...
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState
          title="No freelancers found"
          description="Add your first freelancer to get started"
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Skills
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Country
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Contracts
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data.data.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                        {`${f.firstName.charAt(0)}${f.lastName.charAt(0)}`}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {f.firstName} {f.lastName}
                        </p>
                        <p className="text-xs text-slate-500">{f.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex max-w-xs flex-wrap gap-1">
                      {f.skills.slice(0, 3).map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                        >
                          {skill}
                        </span>
                      ))}
                      {f.skills.length > 3 && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-400">
                          +{f.skills.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                    {f.country ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <StatusBadge status={f.status} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                    ⭐ {f.rating.toFixed(1)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                    {f._count.contracts}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/dashboard/freelancers/${f.id}`}
                        className="text-sm font-medium text-primary-600 hover:text-primary-500"
                      >
                        View
                      </Link>
                      <button
                        onClick={() =>
                          handleDelete(f.id, `${f.firstName} ${f.lastName}`)
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
    </div>
  );
}
