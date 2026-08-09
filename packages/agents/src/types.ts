import { z } from "zod";
import type { PrismaClient } from "@repo/db";
import type { AgentActionMode } from "@repo/db";

export type AgentType = "BILLING" | "COMPLIANCE" | "OPS_COPILOT" | "GENERAL";
export type AgentTrigger =
  | "TIMESHEET_APPROVED"
  | "INVOICE_STATUS_CHANGED"
  | "COMPLIANCE_UPDATED"
  | "CRON_DAILY"
  | "CRON_WEEKLY"
  | "USER_CHAT";

export type Role =
  | "OWNER"
  | "ADMIN"
  | "MANAGER"
  | "FINANCE"
  | "VIEWER"
  | "SYSTEM";

export interface ToolContext {
  companyId: string;
  prisma: PrismaClient;
  triggeredBy?: string | null;
  actorRole?: Role;
}

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: z.ZodType<unknown>;
  defaultMode: AgentActionMode;
  permission: Role[];
  /** value in currency, used for auto-action threshold guard */
  monetary?: (input: unknown) => number | null;
  idempotencyKey?: (ctx: ToolContext, input: unknown) => Promise<string | null>;
  execute: (ctx: ToolContext, input: unknown) => Promise<unknown>;
}

export interface GuardResult {
  allowed: boolean;
  reason?: string;
  mode: AgentActionMode;
  idempotencyKey?: string | null;
}

export type StepRecord = {
  index: number;
  tool?: string;
  kind: "tool" | "message" | "invalid" | "denied" | "error";
  output?: unknown;
};

export const agentTypeSchema = z.enum([
  "BILLING",
  "COMPLIANCE",
  "OPS_COPILOT",
  "GENERAL",
]);
