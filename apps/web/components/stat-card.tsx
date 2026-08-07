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
  color = "text-blue-600 bg-blue-50",
}: StatCardProps) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        {hint && (
          <span className={`rounded-lg px-2 py-1 text-xs font-medium ${color}`}>
            {hint}
          </span>
        )}
      </div>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
