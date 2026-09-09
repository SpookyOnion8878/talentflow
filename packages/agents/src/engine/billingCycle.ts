import type { PrismaClient, AgentRun } from "@repo/db";
import type { AgentTrigger, StepRecord } from "../types";
import { attachToolAction, endRun, startRun } from "./core";
import { fetchAgentConfig } from "../config";
import { calcInvoice, billingTools } from "../tools/billing";
import { DEFAULT_INVOICE_TAX_RATE } from "@repo/db";

const createInvoiceTool = billingTools.find(
  (t) => t.name === "createDraftInvoice",
)!;
const weeklySummaryTool = billingTools.find(
  (t) => t.name === "sendWeeklySummary",
)!;

export interface BillingPeriod {
  start?: Date;
  end?: Date;
}

/**
 * Deterministic workflow: collect approved timesheets for a period,
 * calculate invoices, and propose one action per freelancer and contract.
 * The language model never participates in financial calculations.
 */
export async function runBillingCycle(
  prisma: PrismaClient,
  companyId: string,
  triggerType: AgentTrigger,
  period?: BillingPeriod,
): Promise<AgentRun | null> {
  const config = await fetchAgentConfig(prisma, companyId, "BILLING");
  if (!config?.enabled) return null;

  const end = period?.end ?? new Date();
  const start = period?.start ?? new Date(end.getTime() - 7 * 86400000);

  const run = await startRun(prisma, {
    companyId,
    agentType: "BILLING",
    triggerType,
    intent: "generate_invoices_for_period",
    model: "deterministic",
  });

  const steps: StepRecord[] = [];

  try {
    const sheets = await prisma.timesheet.findMany({
      where: {
        status: "APPROVED",
        date: { gte: start, lte: end },
        freelancer: { companyId },
      },
      select: {
        hours: true,
        freelancer: { select: { id: true, currency: true } },
        contract: {
          select: { id: true, ratePerHour: true, currency: true },
        },
      },
    });

    const groups = new Map<
      string,
      {
        freelancerId: string;
        contractId?: string;
        ratePerHour: number;
        currency: string;
        hours: number;
      }
    >();

    for (const s of sheets) {
      if (!s.contract) continue;
      const key = `${s.freelancer.id}:${s.contract.id}`;
      const existing = groups.get(key);
      if (existing) {
        existing.hours += s.hours;
      } else {
        groups.set(key, {
          freelancerId: s.freelancer.id,
          contractId: s.contract.id,
          ratePerHour: s.contract.ratePerHour.toNumber(),
          currency: s.contract.currency ?? s.freelancer.currency,
          hours: s.hours,
        });
      }
    }

    let index = 0;
    for (const g of groups.values()) {
      const math = calcInvoice({
        hours: g.hours,
        ratePerHour: g.ratePerHour,
        // Match the default tax rate used by human-created invoices so agent
        // drafts and manual invoices compute tax identically (11%). Convert to
        // a number because calcInvoice works in plain JS arithmetic.
        taxRate: DEFAULT_INVOICE_TAX_RATE.toNumber(),
        currency: g.currency,
      });

      await attachToolAction({
        prisma,
        runId: run.id,
        companyId,
        agentType: "BILLING",
        tool: createInvoiceTool,
        input: {
          freelancerId: g.freelancerId,
          contractId: g.contractId,
          periodStart: start.toISOString(),
          periodEnd: end.toISOString(),
          hours: g.hours,
          rate: math.rate,
          taxRate: DEFAULT_INVOICE_TAX_RATE.toNumber(),
          currency: math.currency,
          items: [
            {
              description: `Working hours ${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`,
              quantity: g.hours,
              rate: math.rate,
            },
          ],
        },
        index,
        steps,
      });
      index++;
    }

    const params = {
      status: "SUCCEEDED" as const,
      steps,
      error: groups.size === 0 ? "no approved timesheets in period" : undefined,
    };
    return endRun(prisma, run.id, params);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return endRun(prisma, run.id, {
      status: "FAILED",
      steps,
      error: message,
    });
  }
}

/**
 * Sends the weekly finance summary independently from the invoice cycle.
 */
export async function runWeeklySummary(
  prisma: PrismaClient,
  companyId: string,
  triggerType: AgentTrigger,
): Promise<AgentRun | null> {
  const config = await fetchAgentConfig(prisma, companyId, "BILLING");
  if (!config?.enabled) return null;

  const run = await startRun(prisma, {
    companyId,
    agentType: "BILLING",
    triggerType,
    intent: "weekly_dso_summary",
    model: "deterministic",
  });

  const steps: StepRecord[] = [];
  try {
    await attachToolAction({
      prisma,
      runId: run.id,
      companyId,
      agentType: "BILLING",
      tool: weeklySummaryTool,
      input: {},
      index: 0,
      steps,
    });
    return endRun(prisma, run.id, { status: "SUCCEEDED", steps });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return endRun(prisma, run.id, { status: "FAILED", steps, error: message });
  }
}
