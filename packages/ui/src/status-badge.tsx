const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  SUSPENDED: "Suspended",
  BLACKLISTED: "Blacklisted",
  DRAFT: "Draft",
  SENT: "Sent",
  VIEWED: "Viewed",
  SIGNED: "Signed",
  COMPLETED: "Completed",
  TERMINATED: "Terminated",
  EXPIRED: "Expired",
  ON_HOLD: "On Hold",
  ARCHIVED: "Archived",
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  REVISED: "Revised",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
  VERIFIED: "Verified",
  PROCESSING: "Processing",
  FAILED: "Failed",
  REFUNDED: "Refunded",
  BANK_TRANSFER: "Bank Transfer",
  STRIPE: "Stripe",
  PAYPAL: "PayPal",
  WISE: "Wise",
  OTHER: "Other",
};

const STATUS_DOT: Record<string, string> = {
  ACTIVE: "bg-emerald-500",
  VERIFIED: "bg-emerald-500",
  APPROVED: "bg-emerald-500",
  PAID: "bg-emerald-500",
  COMPLETED: "bg-emerald-500",
  SIGNED: "bg-emerald-500",
  SENT: "bg-blue-500",
  PROCESSING: "bg-blue-500",
  VIEWED: "bg-blue-500",
  REVISED: "bg-blue-500",
  PENDING: "bg-amber-500",
  ON_HOLD: "bg-amber-500",
  DRAFT: "bg-slate-400",
  INACTIVE: "bg-slate-400",
  ARCHIVED: "bg-slate-400",
  OTHER: "bg-slate-400",
  BANK_TRANSFER: "bg-slate-400",
  STRIPE: "bg-violet-500",
  PAYPAL: "bg-violet-500",
  WISE: "bg-violet-500",
  SUSPENDED: "bg-red-500",
  BLACKLISTED: "bg-red-500",
  EXPIRED: "bg-red-500",
  REJECTED: "bg-red-500",
  TERMINATED: "bg-red-500",
  CANCELLED: "bg-red-500",
  OVERDUE: "bg-red-500",
  FAILED: "bg-red-500",
  REFUNDED: "bg-red-500",
};

export function StatusBadge({ status }: { status: string }) {
  const dot = STATUS_DOT[status] ?? "bg-slate-400";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-soft/60 px-2.5 py-0.5 text-xs font-medium text-text-mid ring-1 ring-primary-500/10">
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`}
        aria-hidden
      />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
