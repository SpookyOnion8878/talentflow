"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { StatusBadge } from "@/components/status-badge";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MANAGER: "Manager",
  FINANCE: "Finance",
  VIEWER: "Viewer",
};

type MemberRole = "ADMIN" | "MANAGER" | "FINANCE" | "VIEWER";

export default function SettingsPage() {
  const { data: company, isLoading: companyLoading } =
    trpc.company.get.useQuery();
  const {
    data: members,
    refetch: refetchMembers,
    error: membersError,
  } = trpc.membership.list.useQuery();

  const [form, setForm] = useState({ name: "", website: "", industry: "" });
  const [saved, setSaved] = useState(false);

  const updateMutation = trpc.company.update.useMutation({
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });
  const roleMutation = trpc.membership.updateRole.useMutation({
    onSuccess: () => refetchMembers(),
  });
  const inviteMutation = trpc.membership.invite.useMutation({
    onSuccess: () => {
      refetchMembers();
      setInviteEmail("");
      setInviteRole("VIEWER");
      setInviteError("");
    },
  });

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("VIEWER");
  const [inviteError, setInviteError] = useState("");

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name,
        website: company.website ?? "",
        industry: company.industry ?? "",
      });
    }
  }, [company]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({
        name: form.name,
        website: form.website,
        industry: form.industry,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save settings");
    }
  };

  const handleRoleChange = async (membershipId: string, role: MemberRole) => {
    try {
      await roleMutation.mutateAsync({ membershipId, role });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update role");
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    try {
      await inviteMutation.mutateAsync({
        email: inviteEmail,
        role: inviteRole,
      });
    } catch (err) {
      setInviteError(
        err instanceof Error ? err.message : "Failed to invite member",
      );
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-500">
          Manage your account, company, and team settings
        </p>
      </div>

      {/* Company Settings */}
      <form
        onSubmit={handleSave}
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-card"
      >
        <h3 className="text-lg font-semibold text-slate-900">
          Company Information
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Company Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Industry
            </label>
            <input
              type="text"
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              Website
            </label>
            <input
              type="url"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-3">
          {saved && <span className="text-sm text-green-600">Saved ✓</span>}
          <button
            type="submit"
            disabled={updateMutation.isPending || companyLoading}
            className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>

      {/* Plan & Billing */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
        <h3 className="text-lg font-semibold text-slate-900">Plan & Billing</h3>
        <div className="mt-4 flex items-center justify-between rounded-lg bg-primary-50 p-4">
          <div>
            <p className="font-medium text-primary-900">
              {company?.plan === "PRO"
                ? "Pro Plan"
                : company?.plan === "ENTERPRISE"
                  ? "Enterprise Plan"
                  : "Free Plan"}
            </p>
            <p className="text-sm text-primary-700">
              {company?.plan === "FREE"
                ? "$0/month"
                : company?.plan === "PRO"
                  ? "$29/month"
                  : "$99/month"}
            </p>
          </div>
          <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700">
            {company?.plan}
          </span>
        </div>
      </div>

      {/* Team Members */}
      {!membersError && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">
              Team Members
            </h3>
          </div>

          <form
            onSubmit={handleInvite}
            className="mt-4 flex items-end gap-3 rounded-lg bg-slate-50 p-4"
          >
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700">
                Invite by email
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@company.com"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as MemberRole)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              >
                <option value="ADMIN">Admin</option>
                <option value="MANAGER">Manager</option>
                <option value="FINANCE">Finance</option>
                <option value="VIEWER">Viewer</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={inviteMutation.isPending}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {inviteMutation.isPending ? "Inviting..." : "+ Invite"}
            </button>
          </form>
          {inviteError && (
            <p className="mt-2 text-sm text-red-600">{inviteError}</p>
          )}

          <div className="mt-4 divide-y">
            {members?.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {member.user.name ?? member.user.email}
                  </p>
                  <p className="text-xs text-slate-500">{member.user.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={member.status} />
                  {member.role === "OWNER" ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {ROLE_LABELS[member.role]}
                    </span>
                  ) : (
                    <select
                      value={member.role}
                      onChange={(e) =>
                        handleRoleChange(
                          member.id,
                          e.target.value as MemberRole,
                        )
                      }
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-primary-500 focus:outline-none"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="MANAGER">Manager</option>
                      <option value="FINANCE">Finance</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  )}
                </div>
              </div>
            ))}
            {members?.length === 0 && (
              <p className="py-3 text-sm text-slate-500">
                No team members yet.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
