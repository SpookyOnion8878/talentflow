import { describe, it, expect } from "vitest";
import {
  buildCopilotContext,
  buildCopilotResponse,
} from "../src/engine/copilot";
import type { CopilotContext } from "../src/engine/copilot";

function ctx(overrides: Partial<CopilotContext> = {}): CopilotContext {
  return {
    unpaid: {
      count: 0,
      totalsByCurrency: {},
      top: [],
      oldest: null,
    },
    expiring: [],
    pendingActions: 0,
    draftInvoices: 0,
    monthTotalsByCurrency: {},
    ...overrides,
  };
}

describe("copilot: buildCopilotResponse (deterministic)", () => {
  it("answers unpaid count & total, suggests tier 1 reminder per invoice", () => {
    const res = buildCopilotResponse(
      "check_unpaid_invoices",
      ctx({
        unpaid: {
          count: 2,
          totalsByCurrency: { USD: 1250 },
          top: [
            { id: "inv-1", invoiceNo: "INV-2026-001", dueDate: "2026-08-15" },
            { id: "inv-2", invoiceNo: "INV-2026-002", dueDate: "2026-08-20" },
          ],
          oldest: {
            id: "inv-1",
            invoiceNo: "INV-2026-001",
            dueDate: "2026-08-15",
            amount: 750,
            currency: "USD",
          },
        },
      }),
    );
    expect(res.answer).toContain("2 unpaid invoices");
    expect(res.answer).toContain("USD 1,250.00");
    expect(res.answer).toContain("INV-2026-001");
    expect(res.suggestions).toHaveLength(2);
    expect(res.suggestions[0].tool).toBe("sendInvoiceReminder");
    expect(res.suggestions[0].params).toMatchObject({
      invoiceId: "inv-1",
      tier: 1,
    });
  });

  it("returns a clean answer without suggestions when nothing is unpaid", () => {
    const res = buildCopilotResponse("check_unpaid_invoices", ctx());
    expect(res.answer).toContain("no unpaid invoices");
    expect(res.suggestions).toHaveLength(0);
  });

  it("compliance: suggests 30/7/0 reminders by days left", () => {
    const res = buildCopilotResponse(
      "compliance_status",
      ctx({
        expiring: [
          {
            id: "c1",
            type: "VISA",
            title: "Visa A",
            daysLeft: 25,
            freelancerName: "Budi",
          },
          {
            id: "c2",
            type: "WORK_PERMIT",
            title: "WP B",
            daysLeft: 5,
            freelancerName: "Sari",
          },
        ],
      }),
    );
    expect(res.answer).toContain("2 compliance document(s)");
    expect(res.suggestions).toHaveLength(2);
    const stages = res.suggestions.map((s) => s.params.stage);
    expect(stages).toContain("30");
    expect(stages).toContain("7");
  });

  it("budget: answers month total + draft + pending", () => {
    const res = buildCopilotResponse(
      "budget_and_cost",
      ctx({
        monthTotalsByCurrency: { EUR: 2500, USD: 9000 },
        draftInvoices: 3,
        pendingActions: 4,
      }),
    );
    expect(res.answer).toContain("USD 9,000.00");
    expect(res.answer).toContain("EUR 2,500.00");
    expect(res.answer).toContain("3 draft invoice(s)");
    expect(res.answer).toContain("4 agent action(s)");
  });

  it("general: offers help topics", () => {
    const res = buildCopilotResponse("general_question", ctx());
    expect(res.answer).toContain("Unpaid invoice status");
    expect(res.suggestions).toHaveLength(0);
  });
});

describe("copilot: buildCopilotContext (numbers from DB, not LLM)", () => {
  it("aggregates unpaid/expiring/pending from prisma", async () => {
    const prisma = {
      invoice: {
        findMany: async () => [
          {
            id: "i1",
            invoiceNo: "INV-1",
            amount: 100,
            dueDate: new Date("2026-08-20"),
            currency: "USD",
            createdAt: new Date(),
          },
          {
            id: "i2",
            invoiceNo: "INV-2",
            amount: 50,
            dueDate: new Date(),
            currency: "USD",
            createdAt: new Date(),
          },
        ],
        count: async () => 2,
        groupBy: async () => [{ currency: "USD", _sum: { totalAmount: 150 } }],
      },
      complianceRecord: {
        findMany: async () => [
          {
            id: "c1",
            type: "VISA",
            title: "Visa",
            expiryDate: new Date(Date.now() + 3 * 86400000 + 2000),
            freelancer: { firstName: "B", lastName: "S" },
          },
          {
            id: "c2",
            type: "TAX_ID",
            title: "NPWP",
            expiryDate: new Date(Date.now() + 60 * 86400000),
            freelancer: { firstName: "C", lastName: "D" },
          },
        ],
      },
      agentAction: { count: async () => 5 },
    } as never;

    const result = await buildCopilotContext(prisma as never, "company-1");
    expect(result.unpaid.count).toBe(2);
    expect(result.unpaid.totalsByCurrency).toEqual({ USD: 150 });
    expect(result.expiring).toHaveLength(1);
    expect(result.expiring[0].daysLeft).toBe(3);
    expect(result.pendingActions).toBe(5);
    expect(result.draftInvoices).toBe(2);
    expect(result.monthTotalsByCurrency).toEqual({ USD: 150 });
  });
});
