import { type JSX } from "react";
import { clsx } from "clsx";

interface CardProps {
  className?: string;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Card({
  className,
  title,
  description,
  children,
  footer,
}: CardProps): JSX.Element {
  return (
    <div className={clsx("rounded-xl border bg-white shadow-sm", className)}>
      {(title || description) && (
        <div className="border-b px-6 py-4">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          )}
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
      )}
      <div className="p-6">{children}</div>
      {footer && <div className="border-t bg-gray-50 px-6 py-4">{footer}</div>}
    </div>
  );
}
