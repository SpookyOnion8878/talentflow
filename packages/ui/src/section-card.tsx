import { Lock } from "lucide-react";

/**
 * Form section: titled card with optional hint and a "restricted" badge
 * for fields with role-gated write access on the server.
 */
export function SectionCard({
  title,
  hint,
  restricted = false,
  children,
}: {
  title: string;
  hint?: string;
  restricted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-xl border border-border bg-surface p-6 shadow-card"
      aria-label={title}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-text-hi">{title}</h3>
          {hint && <p className="mt-0.5 text-xs text-text-lo">{hint}</p>}
        </div>
        {restricted && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600">
            <Lock className="h-3 w-3" aria-hidden />
            Owner/Admin only
          </span>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
