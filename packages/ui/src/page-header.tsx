import Link from "next/link";
import { Plus } from "lucide-react";

type PageHeaderProps = {
  title: string;
  description?: string;
  action?: { label: string; href: string };
};

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-text-hi">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-text-mid">{description}</p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary-500/25 transition-transform hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" />
          {action.label}
        </Link>
      )}
    </div>
  );
}
