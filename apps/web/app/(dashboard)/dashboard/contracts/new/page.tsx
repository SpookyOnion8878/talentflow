"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

export default function GenerateContractPage() {
  const router = useRouter();
  const { data: freelancers } = trpc.freelancer.list.useQuery({
    page: 1,
    limit: 100,
  });
  const { data: projects } = trpc.project.list.useQuery({
    page: 1,
    limit: 100,
  });

  const [form, setForm] = useState({
    freelancerId: "",
    projectId: "",
    title: "",
    startDate: "",
    endDate: "",
    ratePerHour: "",
    currency: "USD",
    description: "",
  });
  const [error, setError] = useState("");

  const createMutation = trpc.contract.create.useMutation({
    onSuccess: () => router.push("/dashboard/contracts"),
    onError: (err) => setError(err.message),
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    createMutation.mutate({
      freelancerId: form.freelancerId,
      projectId: form.projectId || undefined,
      title: form.title,
      description: form.description || undefined,
      ratePerHour: parseFloat(form.ratePerHour),
      currency: form.currency,
      startDate: new Date(form.startDate),
      endDate: form.endDate ? new Date(form.endDate) : undefined,
      terms: {},
    });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          href="/dashboard/contracts"
          className="text-sm text-link hover:text-primary-700"
        >
          &larr; Back to Contracts
        </Link>
        <h2 className="mt-2 text-2xl font-bold text-text-hi">
          Generate New Contract
        </h2>
        <p className="text-sm text-text-mid">
          Create a contract for a freelancer
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-500/10 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Contract Details */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <h3 className="text-lg font-semibold text-text-hi">
            Contract Details
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-text-mid">
                Contract Title *
              </label>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Frontend Development Agreement"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-mid">
                Freelancer *
              </label>
              <select
                name="freelancerId"
                value={form.freelancerId}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              >
                <option value="">Select freelancer</option>
                {freelancers?.data.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.firstName} {f.lastName} - {f.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-mid">
                Project (Optional)
              </label>
              <select
                name="projectId"
                value={form.projectId}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              >
                <option value="">No specific project</option>
                {projects?.data.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Duration */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <h3 className="text-lg font-semibold text-text-hi">
            Contract Duration
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-text-mid">
                Start Date *
              </label>
              <input
                name="startDate"
                type="date"
                value={form.startDate}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-mid">
                End Date (Optional)
              </label>
              <input
                name="endDate"
                type="date"
                value={form.endDate}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Payment Terms */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <h3 className="text-lg font-semibold text-text-hi">Payment Terms</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-text-mid">
                Rate per Hour *
              </label>
              <input
                name="ratePerHour"
                type="number"
                step="0.01"
                min="0"
                value={form.ratePerHour}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="100.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-mid">
                Currency *
              </label>
              <select
                name="currency"
                value={form.currency}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="IDR">IDR - Indonesian Rupiah</option>
                <option value="JPY">JPY - Japanese Yen</option>
              </select>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <h3 className="text-lg font-semibold text-text-hi">
            Contract Description
          </h3>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={5}
            className="mt-4 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            placeholder="Describe the scope of work, deliverables, and any special terms..."
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/dashboard/contracts"
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-mid hover:bg-bg"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {createMutation.isPending ? "Generating..." : "Generate Contract"}
          </button>
        </div>
      </form>
    </div>
  );
}
