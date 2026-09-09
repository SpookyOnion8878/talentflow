import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

// ─── Password Hashing (scrypt — zero dependency) ───
const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = parts[1]!;
  const hash = parts[2]!;
  const test = scryptSync(password, salt, SCRYPT_KEYLEN);
  const expected = Buffer.from(hash, "hex");
  return test.length === expected.length && timingSafeEqual(test, expected);
}

// ─── Currency Formatting ───
export function formatCurrency(
  amount: number | string | { toNumber(): number },
  currency: string = "USD",
): string {
  const numericAmount =
    typeof amount === "object" ? amount.toNumber() : Number(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(numericAmount);
}

// ─── Date Formatting ───
export function formatDate(
  date: Date | string,
  locale: string = "en-US",
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(
  date: Date | string,
  locale: string = "en-US",
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── String Helpers ───
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

export function generateInvoiceNumber(prefix: string = "INV"): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function generateContractNumber(): string {
  return generateInvoiceNumber("CTR");
}

// ─── Number Helpers ───
export function calculateInvoiceTotal(
  items: Array<{ quantity: number; rate: number }>,
): { subtotal: number; tax: number; total: number } {
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.rate,
    0,
  );
  const tax = subtotal * 0.11; // 11% default tax
  return { subtotal, tax, total: subtotal + tax };
}

export function calculateBudgetBurnRate(
  totalBudget: number,
  spent: number,
  projectDays: number,
  elapsedDays: number,
): {
  dailyRate: number;
  remainingDays: number;
  projectedTotal: number;
  onTrack: boolean;
} {
  const dailyRate = elapsedDays > 0 ? spent / elapsedDays : 0;
  const remainingDays = Math.max(0, projectDays - elapsedDays);
  const projectedTotal = spent + dailyRate * remainingDays;
  const onTrack = projectedTotal <= totalBudget;
  return { dailyRate, remainingDays, projectedTotal, onTrack };
}

// ─── Status Helpers ───
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: "text-green-600 bg-green-50",
    INACTIVE: "text-gray-500 bg-gray-100",
    PENDING: "text-yellow-600 bg-yellow-50",
    COMPLETED: "text-blue-600 bg-blue-50",
    REJECTED: "text-red-600 bg-red-50",
    DRAFT: "text-gray-600 bg-gray-50",
    OVERDUE: "text-red-600 bg-red-50",
    PAID: "text-green-600 bg-green-50",
    SIGNED: "text-blue-600 bg-blue-50",
    EXPIRED: "text-orange-600 bg-orange-50",
    SUSPENDED: "text-red-600 bg-red-50",
    BLACKLISTED: "text-red-600 bg-red-50",
    ON_HOLD: "text-amber-600 bg-amber-50",
    ARCHIVED: "text-gray-500 bg-gray-100",
    VIEWED: "text-blue-600 bg-blue-50",
    TERMINATED: "text-red-600 bg-red-50",
    APPROVED: "text-green-600 bg-green-50",
    REVISED: "text-amber-600 bg-amber-50",
    VERIFIED: "text-green-600 bg-green-50",
    PROCESSING: "text-blue-600 bg-blue-50",
    FAILED: "text-red-600 bg-red-50",
    REFUNDED: "text-gray-500 bg-gray-100",
    CANCELLED: "text-gray-500 bg-gray-100",
  };
  return colors[status] || "text-gray-600 bg-gray-50";
}

// ─── Pagination Helpers ───
export function paginate<T>(
  items: T[],
  page: number,
  limit: number,
): {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
} {
  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const data = items.slice(start, start + limit);
  return { data, meta: { page, limit, total, totalPages } };
}

// ─── Time Helpers ───
export function getDaysBetween(start: Date, end: Date): number {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function isOverdue(dueDate: Date): boolean {
  return new Date() > dueDate;
}
