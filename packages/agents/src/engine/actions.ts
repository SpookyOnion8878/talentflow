import type { PrismaClient, AgentAction } from "@repo/db";
import type { ToolContext } from "../types";
import { evaluateGuard } from "../guards/pipeline";
import { fetchAgentConfig } from "../config";
import { getTool } from "../tools/registry";
import { ExecuteResult, executeToolAction } from "./core";

export interface ApproveResult {
  action: AgentAction;
  deniedReason?: string;
  executeResult?: ExecuteResult;
}

/**
 * Eksekusi aksi PROPOSE yang disetujui user (Approval Queue).
 * Guardrails dijalankan ULANG pada saat eksekusi; jika kondisi berubah,
 * aksi ditolak otomatis (stale-safe).
 */
export async function executeProposedAction(
  prisma: PrismaClient,
  actionId: string,
  approverUserId: string,
  companyId: string,
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

  const ctx: ToolContext = {
    companyId: action.run.companyId,
    prisma,
    triggeredBy: approverUserId,
    actorRole: "SYSTEM",
  };

  const config = await fetchAgentConfig(
    prisma,
    action.run.companyId,
    action.run.agentType,
  );

  const guard = await evaluateGuard({
    tool,
    ctx,
    input: action.input as unknown,
    config,
  });

  const now = new Date();

  if (!guard.allowed) {
    const rejected = await prisma.agentAction.update({
      where: { id: action.id },
      data: {
        status: "REJECTED",
        reason: `Guardrail at execution: ${guard.reason}`,
        approvedBy: approverUserId,
        approvedAt: now,
      },
    });
    return { action: rejected, deniedReason: guard.reason };
  }

  const executeResult = await executeToolAction(
    prisma,
    ctx,
    tool,
    action.input as unknown,
    action,
    "PROPOSE",
  );

  const updated = await prisma.agentAction.update({
    where: { id: action.id },
    data: {
      approvedBy: approverUserId,
      approvedAt: now,
    },
  });

  return { action: updated, executeResult };
}

export async function rejectProposedAction(
  prisma: PrismaClient,
  actionId: string,
  approverUserId: string,
  reason: string,
  companyId: string,
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
  return prisma.agentAction.update({
    where: { id: actionId },
    data: {
      status: "REJECTED",
      reason,
      approvedBy: approverUserId,
      approvedAt: new Date(),
    },
  });
}

/** Menandai aksi PROPOSE yang terlalu lama (stale) sebagai EXPIRED. */
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
