"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Global error boundary for the App Router. Server component exceptions on
 * any route render this instead of the framework default page.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replace with structured logging when observability lands.
    console.error("[app-error]", error.digest ?? "", error.message);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
        <AlertTriangle className="h-6 w-6 text-red-500" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-text-hi">
        Something went wrong
      </h2>
      <p className="mt-1 max-w-md text-sm text-text-mid">
        An unexpected error occurred. Your data is safe — try again, and if the
        problem persists, contact your workspace administrator.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-text-lo">
          Reference: {error.digest}
        </p>
      )}
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
      >
        <RotateCcw className="h-4 w-4" />
        Try again
      </button>
    </div>
  );
}
