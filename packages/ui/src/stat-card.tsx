type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  color?: string;
};

export function StatCard({
  label,
  value,
  hint,
  color = "text-primary-600 bg-primary-50",
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
        {hint && (
          <span
            className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${color}`}
          >
            {hint}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[28px] font-bold leading-none tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}
