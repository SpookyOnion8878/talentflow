import type { PrismaClient, AgentRun } from "@repo/db";
import type { AgentTrigger, StepRecord } from "../types";
import { attachToolAction, endRun, startRun } from "./core";
import { fetchAgentConfig } from "../config";
import { complianceTools, REQUIRED_ACTIVE_TYPES } from "../tools/compliance";

const DAY_MS = 86400000;

type ComplianceRow = {
  id: string;
  type: string;
  expiryDate: Date | null;
  status: string;
  freelancer: { id: string };
};

async function loadRecords(
  prisma: PrismaClient,
  companyId: string,
): Promise<{ now: number; records: ComplianceRow[] }> {
  const now = Date.now();
  const records = await prisma.complianceRecord.findMany({
    where: {
      freelancer: { companyId },
      expiryDate: { not: null },
    },
    select: {
      id: true,
      type: true,
      expiryDate: true,
      status: true,
      freelancer: { select: { id: true } },
    },
  });
  return { now, records };
}

/**
 * Deterministic workflow: scans compliance documents, sends reminders 30, 7,
 * and 0 days before expiry, then expires mandatory records and suspends the
 * freelancer when required documents are no longer valid.
 */
export async function runComplianceScan(
  prisma: PrismaClient,
  companyId: string,
  triggerType: AgentTrigger,
): Promise<AgentRun | null> {
  const config = await fetchAgentConfig(prisma, companyId, "COMPLIANCE");
  if (!config?.enabled) return null;

  const run = await startRun(prisma, {
    companyId,
    agentType: "COMPLIANCE",
    triggerType,
    intent: "scan_document_expiry",
    model: "deterministic",
  });

  const steps: StepRecord[] = [];
  let index = 0;

  try {
    const { now, records } = await loadRecords(prisma, companyId);

    const reminderTool = complianceTools.find(
      (t) => t.name === "sendComplianceReminder",
    )!;
    const expiredTool = complianceTools.find(
      (t) => t.name === "markComplianceExpired",
    )!;
    const suspendTool = complianceTools.find(
      (t) => t.name === "suspendFreelancer",
    )!;

    for (const r of records) {
      if (!r.expiryDate) continue;
      const daysLeft = Math.floor((r.expiryDate.getTime() - now) / DAY_MS);

      // Reminder bertingkat: 30 / 7 / 0 hari sebelum expiry.
      if (r.status === "VERIFIED" && daysLeft >= 0 && daysLeft <= 30) {
        const stage = daysLeft > 7 ? "30" : daysLeft > 0 ? "7" : "0";
        await attachToolAction({
          prisma,
          runId: run.id,
          companyId,
          agentType: "COMPLIANCE",
          tool: reminderTool,
          input: { recordId: r.id, daysLeft, stage },
          index,
          steps,
        });
        index++;
      }

      // Expire overdue records and suspend the freelancer for required documents.
      if (
        r.status === "VERIFIED" &&
        daysLeft < 0 &&
        r.expiryDate.getTime() < now
      ) {
        await attachToolAction({
          prisma,
          runId: run.id,
          companyId,
          agentType: "COMPLIANCE",
          tool: expiredTool,
          input: { recordId: r.id },
          index,
          steps,
        });
        index++;

        if (
          REQUIRED_ACTIVE_TYPES.includes(
            r.type as (typeof REQUIRED_ACTIVE_TYPES)[number],
          )
        ) {
          await attachToolAction({
            prisma,
            runId: run.id,
            companyId,
            agentType: "COMPLIANCE",
            tool: suspendTool,
            input: {
              freelancerId: r.freelancer.id,
              reason: `Required document expired: ${r.type}`,
            },
            index,
            steps,
          });
          index++;
        }
      }
    }

    return endRun(prisma, run.id, { status: "SUCCEEDED", steps });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return endRun(prisma, run.id, {
      status: "FAILED",
      steps,
      error: message,
    });
  }
}
