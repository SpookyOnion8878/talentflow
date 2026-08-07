import Link from "next/link";

type PageHeaderProps = {
  title: string;
  description?: string;
  action?: { label: string; href: string };
};

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
