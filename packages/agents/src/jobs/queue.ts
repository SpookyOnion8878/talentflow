import { Prisma, PrismaClient } from "@repo/db";
import type { AgentJob } from "@repo/db";
import type { AgentTrigger, AgentType } from "../types";
import { runBillingCycle, runWeeklySummary } from "../engine/billingCycle";
import { runComplianceScan } from "../engine/complianceScan";
import { expireStaleActions } from "../engine/actions";

const MAX_ATTEMPTS = 3;

export interface EnqueueParams {
  companyId: string;
  agentType: AgentType;
  triggerType: AgentTrigger;
  /** true → skip bila sudah ada job PENDING sama hari ini */
  dedupe?: boolean;
}

export async function enqueueAgentJob(
  prisma: PrismaClient,
  params: EnqueueParams,
): Promise<AgentJob> {
  if (params.dedupe) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const existing = await prisma.agentJob.findFirst({
      where: {
        companyId: params.companyId,
        agentType: params.agentType,
        triggerType: params.triggerType,
        status: "PENDING",
        runAt: { gte: startOfDay },
      },
    });
    if (existing) return existing;
  }

  return prisma.agentJob.create({
    data: {
      companyId: params.companyId,
      agentType: params.agentType,
      triggerType: params.triggerType,
      status: "PENDING",
    },
  });
}

/**
 * Klaim job PENDING dengan advisory lock (FOR UPDATE SKIP LOCKED)
 * sehingga dua worker serverless tidak memproses job yang sama.
 */
export async function claimPendingJobs(
  prisma: PrismaClient,
  limit = 3,
  companyId?: string,
): Promise<AgentJob[]> {
  return prisma.$transaction(async (tx) => {
    const ids = await tx.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT id FROM "agent_jobs"
                 WHERE status = 'PENDING'
                 ${companyId ? Prisma.sql`AND "companyId" = ${companyId}` : Prisma.empty}
                 ORDER BY "runAt" ASC
                 LIMIT ${limit}
                 FOR UPDATE SKIP LOCKED`,
    );
    if (!ids.length) return [];

    const list = await tx.agentJob.findMany({
      where: { id: { in: ids.map((r) => r.id) } },
    });
    await tx.agentJob.updateMany({
      where: { id: { in: ids.map((r) => r.id) } },
      data: { status: "LOCKED" },
    });
    return list;
  });
}

export async function dispatchJob(
  prisma: PrismaClient,
  job: AgentJob,
): Promise<{ id: string; status: string; attempts?: number }> {
  try {
    if (job.agentType === "BILLING") {
      await runBillingCycle(prisma, job.companyId, job.triggerType);
      if (job.triggerType === "CRON_WEEKLY") {
        await runWeeklySummary(prisma, job.companyId, job.triggerType);
      }
    } else if (job.agentType === "COMPLIANCE") {
      await runComplianceScan(prisma, job.companyId, job.triggerType);
    }
    // OPS_COPILOT / GENERAL: diproses via chat, bukan job queue.

    await prisma.agentJob.update({
      where: { id: job.id },
      data: { status: "PROCESSED" },
    });
    return { id: job.id, status: "PROCESSED" };
  } catch (err) {
    const attempts = job.attempts + 1;
    const failed = attempts >= MAX_ATTEMPTS;
    await prisma.agentJob.update({
      where: { id: job.id },
      data: {
        attempts,
        status: failed ? "FAILED" : "PENDING",
        error: err instanceof Error ? err.message : String(err),
      },
    });
    return {
      id: job.id,
      status: failed ? "FAILED" : "RETRY",
      attempts,
    };
  }
}

export async function processAvailableJobs(
  prisma: PrismaClient,
  opts: { limit?: number; companyId?: string } = {},
): Promise<{
  processed: number;
  results: Array<{ id: string; status: string; attempts?: number }>;
}> {
  const jobs = await claimPendingJobs(prisma, opts.limit ?? 3, opts.companyId);
  const results: Array<{ id: string; status: string; attempts?: number }> = [];
  for (const job of jobs) {
    results.push(await dispatchJob(prisma, job));
  }
  return { processed: results.length, results };
}
