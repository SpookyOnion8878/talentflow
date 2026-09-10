import { FileQuestion } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2">
        <FileQuestion className="h-6 w-6 text-text-lo" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-text-hi">
        Page not found
      </h2>
      <p className="mt-1 max-w-md text-sm text-text-mid">
        The page you are looking for does not exist or you do not have access to
        it.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
