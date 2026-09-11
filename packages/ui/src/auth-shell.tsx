import Link from "next/link";
import { Zap, CheckCircle2 } from "lucide-react";

const highlights = [
  "Contracts, timesheets & invoicing in one place",
  "Compliance engine with automated expiry alerts",
  "Real-time budget tracking & analytics",
];

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-bg">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-sidebar p-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #2dd4bf 0, transparent 40%), radial-gradient(circle at 80% 70%, #14b8a6 0, transparent 40%)",
          }}
        />
        <Link href="/" className="relative flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient shadow-lg shadow-primary-500/25">
            <Zap className="h-5 w-5 text-white" fill="currentColor" />
          </span>
          <span className="text-lg font-bold tracking-tight text-white">
            TalentFlow
          </span>
        </Link>

        <div className="relative max-w-md">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-white">
            The modern way to manage your{" "}
            <span className="bg-brand-gradient bg-clip-text text-transparent">
              freelance workforce
            </span>
          </h1>
          <ul className="mt-8 space-y-4">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary-400" />
                <span className="text-sm text-text-lo">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-text-mid">
          © {new Date().getFullYear()} TalentFlow. All rights reserved.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
