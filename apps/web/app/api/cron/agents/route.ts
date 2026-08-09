import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@repo/db";
import {
  enqueueAgentJob,
  processAvailableJobs,
  expireStaleActions,
} from "@repo/agents";

export const dynamic = "force-dynamic";

/**
 * Cron internal AgentOps (dipanggil pg_cron / Vercel Cron — lihat vercel.json).
 * 1) Kadaluarkan aksi PROPOSE yang sudah stale (>7 hari).
 * 2) Buat job CRON untuk perusahaan yang mengaktifkan agent.
 * 3) Proses job PENDING yang siap (BILLING mingguan, COMPLIANCE harian).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const isWeekly = request.nextUrl.searchParams.get("kind") === "weekly";

  const expired = await expireStaleActions(prisma);

  const configs = await prisma.agentConfig.findMany({
    where: { enabled: true },
    select: { companyId: true, agentType: true },
  });

  let enqueued = 0;
  for (const c of configs) {
    if (c.agentType === "GENERAL" || c.agentType === "OPS_COPILOT") continue;
    const billingWeekly = c.agentType === "BILLING";
    if (billingWeekly !== isWeekly) continue;
    const triggerType = billingWeekly ? "CRON_WEEKLY" : "CRON_DAILY";
    await enqueueAgentJob(prisma, {
      companyId: c.companyId,
      agentType: c.agentType,
      triggerType,
      dedupe: true,
    });
    enqueued++;
  }

  const processed = await processAvailableJobs(prisma, { limit: 10 });

  return NextResponse.json({
    enqueued,
    expiredActions: expired,
    processed: processed.processed,
    results: processed.results,
  });
}
