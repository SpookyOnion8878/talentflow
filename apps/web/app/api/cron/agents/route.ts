import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@repo/db";
import {
  enqueueAgentJob,
  processAvailableJobs,
  expireStaleActions,
  recoverStaleClaimedActions,
} from "@repo/agents";
import { authorizeCronRequest } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

/**
 * Runs the internal AgentOps schedule for pg_cron or Vercel Cron.
 * The endpoint expires stale proposals, enqueues enabled company jobs, and
 * processes the pending billing or compliance jobs for the requested cadence.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorization = authorizeCronRequest(
    request.headers.get("authorization"),
    secret,
  );

  if (authorization === "misconfigured") {
    console.error(
      "Agent cron is disabled because CRON_SECRET is missing or too short.",
    );
    return NextResponse.json(
      { error: "service unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (authorization === "unauthorized") {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const isWeekly = request.nextUrl.searchParams.get("kind") === "weekly";

  const [expired, recoveredClaims] = await Promise.all([
    expireStaleActions(prisma),
    recoverStaleClaimedActions(prisma),
  ]);

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

  return NextResponse.json(
    {
      enqueued,
      expiredActions: expired,
      recoveredClaims,
      processed: processed.processed,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
