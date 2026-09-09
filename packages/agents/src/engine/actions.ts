import type { PrismaClient, AgentAction } from "@repo/db";
import type { ToolContext } from "../types";
import type { Role } from "../types";
import { canApproveTool, evaluateGuard } from "../guards/pipeline";
import { fetchAgentConfig } from "../config";
import { getTool } from "../tools/registry";
import { ExecuteResult, executeToolAction } from "./core";

export interface ApproveResult {
  action: AgentAction;
  deniedReason?: string;
  executeResult?: ExecuteResult;
}

export class AgentAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentAuthorizationError";
  }
}

/**
 * Re-evaluates and atomically claims a proposed action before execution.
 * The real approver role is preserved so a human cannot inherit SYSTEM rights.
 */
export async function executeProposedAction(
  prisma: PrismaClient,
  actionId: string,
  approverUserId: string,
  companyId: string,
  approverRole: Role,
): Promise<ApproveResult> {
  const action = await prisma.agentAction.findUnique({
    where: { id: actionId },
    include: { run: true },
  });
  if (!action || action.run.companyId !== companyId) {
    throw new Error("Action not found");
  }
  if (action.status !== "PENDING") {
    throw new Error(`Action already has status ${action.status}`);
  }

  const tool = getTool(action.tool);
  if (!tool) throw new Error(`Tool ${action.tool} is unknown`);
  if (!canApproveTool(tool, approverRole)) {
    throw new AgentAuthorizationError(
      `Role ${approverRole} is not allowed to approve tool ${action.tool}`,
    );
  }

  const ctx: ToolContext = {
    companyId: action.run.companyId,
    prisma,
    triggeredBy: approverUserId,
    actorRole: approverRole,
    isApproval: true,
  };

  const config = await fetchAgentConfig(
    prisma,
    action.run.companyId,
    action.run.agentType,
  );

  const parsed = tool.inputSchema.safeParse(action.input);
  if (!parsed.success) {
    const rejected = await rejectPendingAction(prisma, action.id, {
      reason: "Guardrail at execution: stored action input is invalid",
      approvedBy: approverUserId,
      approvedAt: new Date(),
    });
    return { action: rejected, deniedReason: "stored action input is invalid" };
  }

  const guard = await evaluateGuard({
    tool,
    ctx,
    input: parsed.data,
    config,
  });

  const now = new Date();

  if (!guard.allowed) {
    const rejected = await rejectPendingAction(prisma, action.id, {
      reason: `Guardrail at execution: ${guard.reason}`,
      approvedBy: approverUserId,
      approvedAt: now,
    });
    return { action: rejected, deniedReason: guard.reason };
  }

  const claimed = await prisma.agentAction.updateMany({
    where: { id: action.id, status: "PENDING" },
    data: {
      status: "APPROVED",
      approvedBy: approverUserId,
      approvedAt: now,
    },
  });
  if (claimed.count !== 1) {
    throw new Error("Action was already claimed by another approver");
  }

  const executeResult = await executeToolAction(
    prisma,
    ctx,
    tool,
    parsed.data,
    {
      ...action,
      status: "APPROVED",
      approvedBy: approverUserId,
      approvedAt: now,
    },
    "PROPOSE",
  );

  const updated = await prisma.agentAction.findUnique({
    where: { id: action.id },
  });
  if (!updated) throw new Error("Claimed action could not be reloaded");

  return { action: updated, executeResult };
}

async function rejectPendingAction(
  prisma: PrismaClient,
  actionId: string,
  data: { reason: string; approvedBy: string; approvedAt: Date },
): Promise<AgentAction> {
  const result = await prisma.agentAction.updateMany({
    where: { id: actionId, status: "PENDING" },
    data: { status: "REJECTED", ...data },
  });
  if (result.count !== 1) {
    throw new Error("Action was already claimed by another approver");
  }
  const action = await prisma.agentAction.findUnique({
    where: { id: actionId },
  });
  if (!action) throw new Error("Rejected action could not be reloaded");
  return action;
}

export async function rejectProposedAction(
  prisma: PrismaClient,
  actionId: string,
  approverUserId: string,
  reason: string,
  companyId: string,
  approverRole: Role,
): Promise<AgentAction> {
  const action = await prisma.agentAction.findUnique({
    where: { id: actionId },
    include: { run: true },
  });
  if (
    !action ||
    action.status !== "PENDING" ||
    action.run.companyId !== companyId
  ) {
    throw new Error("Action not found or not PENDING");
  }
  const tool = getTool(action.tool);
  if (!tool || !canApproveTool(tool, approverRole)) {
    throw new AgentAuthorizationError(
      `Role ${approverRole} is not allowed to reject tool ${action.tool}`,
    );
  }
  return rejectPendingAction(prisma, actionId, {
    reason,
    approvedBy: approverUserId,
    approvedAt: new Date(),
  });
}

/** Marks abandoned approval claims as failed without risking a duplicate retry. */
export async function recoverStaleClaimedActions(
  prisma: PrismaClient,
  minutes = 15,
): Promise<number> {
  const cutoff = new Date(Date.now() - minutes * 60_000);
  const result = await prisma.agentAction.updateMany({
    where: {
      status: "APPROVED",
      executedAt: null,
      approvedAt: { lt: cutoff },
    },
    data: {
      status: "FAILED",
      error:
        "Execution did not complete after the approval claim; manual review is required",
    },
  });
  return result.count;
}

/** Marks stale proposed actions as expired. */
export async function expireStaleActions(
  prisma: PrismaClient,
  days = 7,
): Promise<number> {
  const cutoff = new Date(Date.now() - days * 86400000);
  const result = await prisma.agentAction.updateMany({
    where: { status: "PENDING", createdAt: { lt: cutoff } },
    data: { status: "EXPIRED" },
  });
  return result.count;
}
