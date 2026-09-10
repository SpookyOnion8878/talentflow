"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Zap, Mail, Lock, ArrowRight } from "lucide-react";
import { AuthShell } from "@repo/ui/auth-shell";

function isSafeRedirect(url: string | null): boolean {
  if (!url) return false;
  if (!url.startsWith("/")) return false;
  if (url.startsWith("//")) return false;
  return true;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    setLoading(false);

    if (!result?.ok) {
      setError("Invalid email or password");
      return;
    }

    const requestedUrl = searchParams.get("callbackUrl");
    const callbackUrl = isSafeRedirect(requestedUrl)
      ? requestedUrl!
      : "/dashboard";
    router.push(callbackUrl);
    router.refresh();
  };

  const inputClass =
    "mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-hi shadow-sm transition-all placeholder:text-text-lo focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30";

  return (
    <div className="space-y-6">
      <div className="text-center lg:text-left">
        <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gradient shadow-lg shadow-primary-500/25 lg:hidden">
          <Zap className="h-6 w-6 text-white" fill="currentColor" />
        </span>
        <h2 className="text-2xl font-bold tracking-tight text-text-hi">
          Welcome back
        </h2>
        <p className="mt-1.5 text-sm text-text-mid">
          Sign in to your account to continue.
        </p>
      </div>

      {searchParams.get("registered") && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">
          Account created successfully. Sign in to continue.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-text-mid"
          >
            Email address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-lo" />
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
              className={`${inputClass} pl-9`}
              placeholder="you@company.com"
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-text-mid"
          >
            Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-lo" />
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
              className={`${inputClass} pl-9`}
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign In"}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-bg px-2 text-text-lo">Or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="flex w-full items-center justify-center rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-mid shadow-sm transition-colors hover:bg-bg"
          >
            Google
          </button>
          <button
            type="button"
            onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
            className="flex w-full items-center justify-center rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-mid shadow-sm transition-colors hover:bg-bg"
          >
            GitHub
          </button>
        </div>

        <p className="text-center text-sm text-text-mid">
          New to TalentFlow?{" "}
          <Link
            href="/register"
            className="font-semibold text-link hover:text-link"
          >
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthShell>
        <LoginForm />
      </AuthShell>
    </Suspense>
  );
}
