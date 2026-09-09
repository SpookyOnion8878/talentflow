"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { StatusBadge } from "@repo/ui/status-badge";

export default function AssignFreelancerPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const project = trpc.project.getById.useQuery({ id: projectId });
  const freelancers = trpc.freelancer.list.useQuery({
    page: 1,
    limit: 100,
    status: "ACTIVE",
  });

  const assignedIds = new Set(
    project.data?.assignments.map((a) => a.freelancer.id) ?? [],
  );
  const available = (freelancers.data?.data ?? []).filter(
    (f) => !assignedIds.has(f.id),
  );

  const assignMutation = trpc.project.assignFreelancer.useMutation({
    onSuccess: () => {
      setSuccess("Freelancer assigned");
      setRole("");
      project.refetch();
      setTimeout(() => setSuccess(""), 2000);
    },
    onError: (err) => setError(err.message),
  });

  const handleAssign = (freelancerId: string) => {
    setError("");
    assignMutation.mutate({ projectId, freelancerId, role: role || undefined });
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/dashboard/projects/${projectId}`}
          className="text-sm text-primary-600 hover:text-primary-700"
        >
          &larr; Back to {project.data?.name ?? "Project"}
        </Link>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">
          Assign Freelancer
        </h2>
        <p className="text-sm text-slate-500">
          Add a freelancer to this project team
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700">
            Role (optional)
          </label>
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="e.g. Frontend Developer"
          />
        </div>

        {freelancers.isLoading ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Loading freelancers...
          </p>
        ) : available.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-600">
              No unassigned freelancers available.
            </p>
            <Link
              href="/dashboard/freelancers/new"
              className="mt-2 inline-block text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              + Add a new freelancer
            </Link>
          </div>
        ) : (
          <div className="divide-y">
            {available.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                    {f.firstName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {f.firstName} {f.lastName}
                    </p>
                    <p className="text-xs text-slate-500">{f.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={f.status} />
                  <button
                    onClick={() => handleAssign(f.id)}
                    disabled={assignMutation.isPending}
                    className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                  >
                    Assign
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
