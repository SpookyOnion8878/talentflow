import { decimalToNumber } from "@repo/db";
import type { PrismaClient } from "@repo/db";
import type { AgentType, StepRecord } from "../types";
import { endRun, startRun } from "./core";
import { searchEmbeddings, type SearchHit } from "../rag";
import { getEmbeddingProvider } from "../providers/registry";
import { canProcessCompanyDataWithProvider } from "../providers/data-governance";

export interface CopilotSuggestion {
  tool: string;
  label: string;
  params: Record<string, unknown>;
  reason: string;
}

export interface StoredCopilotSuggestion extends CopilotSuggestion {
  id: string;
}

export interface CopilotContext {
  unpaid: {
    count: number;
    totalsByCurrency: Record<string, number>;
    top: Array<{ id: string; invoiceNo: string; dueDate: string }>;
    oldest: {
      id: string;
      invoiceNo: string;
      dueDate: string;
      amount: number;
      currency: string;
    } | null;
  };
  expiring: Array<{
    id: string;
    type: string;
    title: string;
    daysLeft: number;
    freelancerName: string;
  }>;
  pendingActions: number;
  draftInvoices: number;
  monthTotalsByCurrency: Record<string, number>;
}

/** Builds verified company context with deterministic calculations. */
export async function buildCopilotContext(
  prisma: PrismaClient,
  companyId: string,
): Promise<CopilotContext> {
  const [
    unpaidInvoices,
    expiringRecords,
    pendingActions,
    draftInvoices,
    monthInvoices,
  ] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        companyId,
        status: { in: ["SENT", "VIEWED", "OVERDUE"] },
      },
      select: {
        id: true,
        invoiceNo: true,
        amount: true,
        dueDate: true,
        currency: true,
        createdAt: true,
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.complianceRecord.findMany({
      where: {
        freelancer: { companyId },
        status: "VERIFIED",
        expiryDate: { not: null },
      },
      select: {
        id: true,
        type: true,
        title: true,
        expiryDate: true,
        freelancer: {
          select: { firstName: true, lastName: true },
        },
      },
    }),
    prisma.agentAction.count({
      where: { run: { companyId }, status: "PENDING" },
    }),
    prisma.invoice.count({
      where: { companyId, status: "DRAFT" },
    }),
    prisma.invoice.groupBy({
      by: ["currency"],
      _sum: { totalAmount: true },
      where: {
        companyId,
        createdAt: { gte: new Date(new Date().setDate(1)) },
      },
    }),
  ]);

  const now = Date.now();
  const expiring = expiringRecords
    .map((r) => {
      const expiry = r.expiryDate as Date;
      const daysLeft = Math.floor((expiry.getTime() - now) / 86400000);
      return {
        id: r.id,
        type: r.type,
        title: r.title,
        daysLeft,
        freelancerName: `${r.freelancer.firstName} ${r.freelancer.lastName}`,
      };
    })
    .filter((r) => r.daysLeft >= 0 && r.daysLeft <= 30)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  return {
    unpaid: {
      count: unpaidInvoices.length,
      totalsByCurrency: unpaidInvoices.reduce<Record<string, number>>(
        (totals, invoice) => {
          totals[invoice.currency] =
            (totals[invoice.currency] ?? 0) + decimalToNumber(invoice.amount);
          return totals;
        },
        {},
      ),
      top: unpaidInvoices.slice(0, 3).map((i) => ({
        id: i.id,
        invoiceNo: i.invoiceNo,
        dueDate: (i.dueDate ?? i.createdAt).toISOString().slice(0, 10),
      })),
      oldest: unpaidInvoices[0]
        ? {
            id: unpaidInvoices[0].id,
            invoiceNo: unpaidInvoices[0].invoiceNo,
            dueDate: (unpaidInvoices[0].dueDate ?? unpaidInvoices[0].createdAt)
              .toISOString()
              .slice(0, 10),
            amount: decimalToNumber(unpaidInvoices[0].amount),
            currency: unpaidInvoices[0].currency,
          }
        : null,
    },
    expiring,
    pendingActions,
    draftInvoices,
    monthTotalsByCurrency: Object.fromEntries(
      monthInvoices.map((group) => [
        group.currency,
        decimalToNumber(group._sum.totalAmount ?? 0),
      ]),
    ),
  };
}

function tierFor(daysLeft: number): "30" | "7" | "0" {
  return daysLeft > 7 ? "30" : daysLeft > 0 ? "7" : "0";
}

function fmtAmount(value: number, currency: string): string {
  return `${currency} ${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtAmountBreakdown(totals: Record<string, number>): string {
  const values = Object.entries(totals)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, amount]) => fmtAmount(amount, currency));
  return values.length > 0 ? values.join("; ") : fmtAmount(0, "USD");
}

// Deterministic response and suggestion generation from verified company data.

export function buildCopilotResponse(
  intent: string,
  ctx: CopilotContext,
  related: SearchHit[] = [],
): { answer: string; suggestions: CopilotSuggestion[] } {
  const suggestions: CopilotSuggestion[] = [];

  if (intent === "check_unpaid_invoices" || intent === "aging_report") {
    const u = ctx.unpaid;
    if (u.count === 0) {
      return {
        answer:
          "There are no unpaid invoices right now. All invoices are paid or still in draft.",
        suggestions,
      };
    }
    for (const inv of u.top) {
      suggestions.push({
        tool: "sendInvoiceReminder",
        label: `Send reminder for invoice ${inv.invoiceNo} (tier 1)`,
        params: { invoiceId: inv.id, tier: 1 },
        reason: `Invoice ${inv.invoiceNo} is unpaid (due ${inv.dueDate}).`,
      });
    }
    const oldestLine = u.oldest
      ? `Oldest invoice: ${u.oldest.invoiceNo} (${fmtAmount(u.oldest.amount, u.oldest.currency)}) due ${u.oldest.dueDate}.`
      : "";
    return {
      answer: `There are ${u.count} unpaid invoices totaling ${fmtAmountBreakdown(
        u.totalsByCurrency,
      )}. ${oldestLine}\nI can send automatic reminders — proposals land in the Approval Queue for your approval.`,
      suggestions,
    };
  }

  if (intent === "create_invoice_draft") {
    return {
      answer:
        "Draft invoices are created by the Billing Agent from approved timesheets on a weekly cycle (numbers are computed deterministically, not by the LLM). For manual initiative, use Invoices → Generate Invoice; the weekly schedule runs automatically via cron.",
      suggestions,
    };
  }

  if (intent === "compliance_status" || intent === "compliance_reminder") {
    const expiring = ctx.expiring;
    if (expiring.length === 0) {
      return {
        answer:
          "No compliance documents expire within the next 30 days. All documents are healthy.",
        suggestions,
      };
    }
    const list = expiring
      .slice(0, 5)
      .map(
        (e) => `• ${e.title} (${e.freelancerName}) — ${e.daysLeft} days left`,
      )
      .join("\n");
    for (const e of expiring.slice(0, 3)) {
      suggestions.push({
        tool: "sendComplianceReminder",
        label: `Remind about ${e.title} (${e.freelancerName})`,
        params: {
          recordId: e.id,
          daysLeft: e.daysLeft,
          stage: tierFor(e.daysLeft),
        },
        reason: `Compliance document ${e.title} expires in ${e.daysLeft} days.`,
      });
    }
    return {
      answer: `${expiring.length} compliance document(s) expire within 30 days:\n${list}\nI can send automatic reminders — proposals land in the Approval Queue.`,
      suggestions,
    };
  }

  if (intent === "budget_and_cost") {
    return {
      answer: `Total invoiced this month: ${fmtAmountBreakdown(
        ctx.monthTotalsByCurrency,
      )}. There are ${ctx.draftInvoices} draft invoice(s) waiting to be sent, and ${
        ctx.pendingActions
      } agent action(s) awaiting approval in the Approval Queue.`,
      suggestions,
    };
  }

  void ctx;
  const base = {
    answer:
      "I can help with your company data:\n• Unpaid invoice status & reminder proposals\n• Compliance document health (expiry within 30 days)\n• Monthly budget summary\nExample: ask “how much is unpaid this month?”",
    suggestions,
  };
  if (related.length === 0) return base;
  const snippets = related
    .slice(0, 3)
    .map((r) => `• ${r.content}`)
    .join("\n");
  return {
    ...base,
    answer: `${base.answer}\n\nRelated records found in your company data:\n${snippets}`,
  };
}

export function findStoredCopilotSuggestion(
  steps: unknown,
  suggestionId: string,
): StoredCopilotSuggestion | null {
  if (!Array.isArray(steps)) return null;

  for (const step of steps) {
    if (!step || typeof step !== "object" || !("output" in step)) continue;
    const output = step.output;
    if (!output || typeof output !== "object" || !("suggestions" in output)) {
      continue;
    }
    const suggestions = output.suggestions;
    if (!Array.isArray(suggestions)) continue;

    const candidate = suggestions.find(
      (suggestion) =>
        suggestion &&
        typeof suggestion === "object" &&
        "id" in suggestion &&
        suggestion.id === suggestionId,
    );
    if (
      candidate &&
      typeof candidate === "object" &&
      "id" in candidate &&
      typeof candidate.id === "string" &&
      "tool" in candidate &&
      typeof candidate.tool === "string" &&
      "label" in candidate &&
      typeof candidate.label === "string" &&
      "reason" in candidate &&
      typeof candidate.reason === "string" &&
      "params" in candidate &&
      candidate.params !== null &&
      typeof candidate.params === "object" &&
      !Array.isArray(candidate.params)
    ) {
      return candidate as StoredCopilotSuggestion;
    }
  }
  return null;
}

/** Runs deterministic company-data chat and stores server-issued suggestions. */
export async function runCopilotChat(
  prisma: PrismaClient,
  companyId: string,
  decision: { intent: string; agentType: AgentType },
  rawMessage?: string,
): Promise<{
  runId: string;
  answer: string;
  suggestions: StoredCopilotSuggestion[];
}> {
  const run = await startRun(prisma, {
    companyId,
    agentType: "OPS_COPILOT",
    triggerType: "USER_CHAT",
    intent: decision.intent,
    model: "rule-based",
  });

  const steps: StepRecord[] = [
    {
      index: 0,
      kind: "tool",
      output: { intent: decision.intent, agentType: decision.agentType },
    },
  ];

  try {
    const ctx = await buildCopilotContext(prisma, companyId);
    let related: SearchHit[] = [];
    if (decision.intent === "general_question") {
      try {
        const provider = getEmbeddingProvider();
        if (canProcessCompanyDataWithProvider(companyId, provider)) {
          related = await searchEmbeddings(
            prisma,
            companyId,
            rawMessage ?? "company records",
            provider,
            3,
          );
        }
      } catch {
        related = [];
      }
    }
    const { answer, suggestions } = buildCopilotResponse(
      decision.intent,
      ctx,
      related,
    );
    const storedSuggestions = suggestions.map((suggestion, index) => ({
      ...suggestion,
      id: String(index),
    }));

    steps.push({
      index: 1,
      kind: "message",
      output: {
        suggestions: storedSuggestions,
        pendingActions: ctx.pendingActions,
        ragHits: related.length,
      },
    });

    await endRun(prisma, run.id, {
      status: "SUCCEEDED",
      steps,
    });
    return { runId: run.id, answer, suggestions: storedSuggestions };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await endRun(prisma, run.id, { status: "FAILED", steps, error });
    throw err;
  }
}
