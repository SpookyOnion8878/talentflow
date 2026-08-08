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
    <div
      className={clsx(
        "rounded-xl border border-slate-200 bg-white shadow-card",
        className,
      )}
    >
      {(title || description) && (
        <div className="border-b border-slate-100 px-6 py-4">
          {title && (
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          )}
          {description && (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          )}
        </div>
      )}
      <div className="p-6">{children}</div>
      {footer && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-4">
          {footer}
        </div>
      )}
    </div>
  );
}
