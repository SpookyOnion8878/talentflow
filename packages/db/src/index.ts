export { PrismaClient } from "@prisma/client";
export { Prisma } from "@prisma/client";
export * from "./money";
export * from "./transitions";
export type {
  User,
  Company,
  Membership,
  Freelancer,
  Project,
  ProjectAssignment,
  Contract,
  Timesheet,
  Invoice,
  Payment,
  ComplianceRecord,
  AuditLog,
  Notification,
  AgentJob,
  AgentRun,
  AgentAction,
  AgentConfig,
} from "@prisma/client";

export {
  UserRole,
  CompanyPlan,
  MembershipRole,
  MembershipStatus,
  FreelancerStatus,
  ProjectStatus,
  ContractStatus,
  TimesheetStatus,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  ComplianceType,
  ComplianceStatus,
  AgentType,
  AgentTrigger,
  AgentJobStatus,
  AgentRunStatus,
  AgentActionMode,
  AgentActionStatus,
} from "@prisma/client";

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
