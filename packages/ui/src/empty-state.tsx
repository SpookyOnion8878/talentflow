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
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2">
        <Inbox className="h-6 w-6 text-text-lo" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-text-hi">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-text-mid">{description}</p>
      )}
    </div>
  );
}
