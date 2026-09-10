"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

const SKILL_OPTIONS = [
  "React",
  "TypeScript",
  "Node.js",
  "Python",
  "Django",
  "PostgreSQL",
  "Figma",
  "UI/UX",
  "DevOps",
  "AWS",
  "Java",
  "Spring Boot",
  "Go",
  "Rust",
];

const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Germany",
  "France",
  "Indonesia",
  "India",
  "Australia",
  "Japan",
  "Singapore",
  "Other",
];

export default function AddFreelancerPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "",
    city: "",
    currency: "USD",
    skills: [] as string[],
    bankName: "",
    bankAccount: "",
    taxId: "",
    notes: "",
  });
  const [error, setError] = useState("");

  const createMutation = trpc.freelancer.create.useMutation({
    onSuccess: () => router.push("/dashboard/freelancers"),
    onError: (err) => setError(err.message),
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const toggleSkill = (skill: string) => {
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    createMutation.mutate({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone || undefined,
      country: form.country || undefined,
      city: form.city || undefined,
      currency: form.currency,
      skills: form.skills,
      bankName: form.bankName || undefined,
      bankAccount: form.bankAccount || undefined,
      taxId: form.taxId || undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          href="/dashboard/freelancers"
          className="text-sm text-link hover:text-primary-700"
        >
          &larr; Back to Freelancers
        </Link>
        <h2 className="mt-2 text-2xl font-bold text-text-hi">
          Add New Freelancer
        </h2>
        <p className="text-sm text-text-mid">
          Fill in the details to onboard a new freelancer
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-500/10 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Personal Information */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <h3 className="text-lg font-semibold text-text-hi">
            Personal Information
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-text-mid">
                First Name *
              </label>
              <input
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Jane"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-mid">
                Last Name *
              </label>
              <input
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-mid">
                Email *
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="jane@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-mid">
                Phone
              </label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
        </div>

        {/* Location & Currency */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <h3 className="text-lg font-semibold text-text-hi">
            Location & Currency
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-text-mid">
                Country
              </label>
              <select
                name="country"
                value={form.country}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              >
                <option value="">Select country</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-mid">
                City
              </label>
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                placeholder="San Francisco"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-mid">
                Currency
              </label>
              <select
                name="currency"
                value={form.currency}
                onChange={handleChange}
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

        {/* Skills */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <h3 className="text-lg font-semibold text-text-hi">Skills</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {SKILL_OPTIONS.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => toggleSkill(skill)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  form.skills.includes(skill)
                    ? "bg-primary-600 text-white"
                    : "bg-surface-2 text-text-mid hover:bg-surface-2"
                }`}
              >
                {form.skills.includes(skill) ? "✓ " : "+ "}
                {skill}
              </button>
            ))}
          </div>
        </div>

        {/* Banking & Tax */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <h3 className="text-lg font-semibold text-text-hi">
            Banking & Tax Information
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-text-mid">
                Bank Name
              </label>
              <input
                name="bankName"
                value={form.bankName}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                placeholder="Chase Bank"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-mid">
                Bank Account Number
              </label>
              <input
                name="bankAccount"
                value={form.bankAccount}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                placeholder="****1234"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-text-mid">
                Tax ID
              </label>
              <input
                name="taxId"
                value={form.taxId}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                placeholder="Tax identification number"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <h3 className="text-lg font-semibold text-text-hi">
            Additional Notes
          </h3>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={3}
            className="mt-4 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            placeholder="Any additional notes about this freelancer..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link
            href="/dashboard/freelancers"
            className="rounded-lg border px-6 py-2.5 text-sm font-medium text-text-mid hover:bg-bg"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {createMutation.isPending ? "Adding..." : "Add Freelancer"}
          </button>
        </div>
      </form>
    </div>
  );
}
