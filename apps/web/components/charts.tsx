"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Theme-agnostic chart palette (mid tones readable in light and dark).
 * Axis/tooltip text uses slate-400/500 so both themes stay legible.
 */
const SERIES = {
  paid: "#10b981", // emerald-500
  outstanding: "#f59e0b", // amber-500
  draft: "#94a3b8", // slate-400
  overdue: "#ef4444", // red-500
  open: "#6366f1", // indigo-500
};

const AXIS = { fontSize: 12, fill: "#94a3b8" };
const TOOLTIP_STYLE = {
  contentStyle: {
    borderRadius: 10,
    border: "1px solid rgb(var(--border-channel))",
    background: "rgb(var(--surface-channel))",
    color: "rgb(var(--text-hi-channel))",
    fontSize: 12,
  },
} as const;

export interface SpendBucket {
  month: string;
  paid: number;
  outstanding: number;
}

export function MonthlySpendChart({ data }: { data: SpendBucket[] }) {
  return (
    <div
      style={{ width: "100%", height: 260 }}
      role="img"
      aria-label="Paid versus outstanding invoice amount per month"
    >
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgb(var(--border-channel))"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tick={AXIS}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} width={70} />
          <Tooltip
            {...TOOLTIP_STYLE}
            cursor={{ fill: "rgb(var(--surface-2-channel) / 0.5)" }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            dataKey="paid"
            name="Paid"
            stackId="amount"
            fill={SERIES.paid}
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="outstanding"
            name="Outstanding"
            stackId="amount"
            fill={SERIES.outstanding}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface AgingBucket {
  name: string;
  value: number;
  color: string;
}

export function InvoiceAgingChart({ data }: { data: AgingBucket[] }) {
  return (
    <div
      style={{ width: "100%", height: 260 }}
      role="img"
      aria-label="Invoice count by lifecycle stage"
    >
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={58}
            outerRadius={88}
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip {...TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export const CHART_COLORS = SERIES;
