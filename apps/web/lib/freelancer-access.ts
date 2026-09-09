import { Prisma } from "@repo/db";
import type { MembershipRole } from "@repo/db";

export const freelancerPublicSelect = {
  id: true,
  userId: true,
  companyId: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  avatar: true,
  skills: true,
  country: true,
  city: true,
  timezone: true,
  currency: true,
  status: true,
  rating: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.FreelancerSelect;

const FINANCIAL_FIELDS = [
  "taxId",
  "bankName",
  "bankAccount",
  "bankRouting",
] as const;

type FreelancerSensitiveFields = {
  taxId: string | null;
  bankName: string | null;
  bankAccount: string | null;
  bankRouting: string | null;
  notes: string | null;
};

export function hasRestrictedFinancialMutation(
  role: MembershipRole,
  data: Record<string, unknown>,
): boolean {
  if (role === "OWNER" || role === "ADMIN") {
    return false;
  }

  return FINANCIAL_FIELDS.some(
    (field) =>
      Object.prototype.hasOwnProperty.call(data, field) &&
      data[field] !== undefined,
  );
}

export function redactFreelancerSensitiveFields<
  T extends FreelancerSensitiveFields,
>(freelancer: T, role: MembershipRole): T {
  const canViewFinancial = ["OWNER", "ADMIN", "FINANCE"].includes(role);
  const canViewNotes = ["OWNER", "ADMIN", "MANAGER"].includes(role);

  return {
    ...freelancer,
    taxId: canViewFinancial ? freelancer.taxId : null,
    bankName: canViewFinancial ? freelancer.bankName : null,
    bankAccount: canViewFinancial ? freelancer.bankAccount : null,
    bankRouting: canViewFinancial ? freelancer.bankRouting : null,
    notes: canViewNotes ? freelancer.notes : null,
  };
}
