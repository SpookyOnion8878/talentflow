import { getStatusColor } from "@repo/utils";

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

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(status)}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
