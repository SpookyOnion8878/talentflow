import { Inbox } from "lucide-react";

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-500/10 ring-4 ring-primary-500/5">
        <Inbox className="h-6 w-6 text-primary-600" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-text-hi">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-text-mid">{description}</p>
      )}
    </div>
  );
}
