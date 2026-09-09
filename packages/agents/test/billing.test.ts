import { Prisma } from "@repo/db";
import { describe, expect, it, vi } from "vitest";
import {
  billingTools,
  calcInvoice,
  buildInvoiceNo,
} from "../src/tools/billing";

const createDraftInvoice = billingTools.find(
  (tool) => tool.name === "createDraftInvoice",
)!;

describe("calcInvoice (deterministic, without a language model)", () => {
  it("calculates amount, tax, and total correctly", () => {
    const result = calcInvoice({
      hours: 40,
      ratePerHour: 85,
      taxRate: 0.11,
      currency: "USD",
    });
    expect(result.amount).toBe(3400);
    expect(result.tax).toBe(374);
    expect(result.total).toBe(3774);
    expect(result.currency).toBe("USD");
  });

  it("handles fractional hours with decimal arithmetic", () => {
    const result = calcInvoice({
      hours: 7.5,
      ratePerHour: 90.5,
      taxRate: 0,
      currency: "USD",
    });
    expect(result.amount).toBe(678.75);
    expect(result.total).toBe(678.75);
  });

  it("defaults tax to zero when it is omitted", () => {
    const result = calcInvoice({
      hours: 8,
      ratePerHour: 100,
      currency: "USD",
    });
    expect(result.tax).toBe(0);
  });
});

describe("buildInvoiceNo", () => {
  it("formats the counter with three-digit padding", () => {
    expect(buildInvoiceNo(2026, 1)).toBe("INV-2026-001");
    expect(buildInvoiceNo(2026, 42)).toBe("INV-2026-042");
    expect(buildInvoiceNo(2026, 1000)).toBe("INV-2026-1000");
  });
});

describe("createDraftInvoice", () => {
  it("uses server-calculated line totals for limits and persistence", async () => {
    const invoiceCreate = vi.fn().mockImplementation(({ data }) => ({
      id: "invoice-1",
      ...data,
      totalAmount: new Prisma.Decimal(data.totalAmount),
    }));
    const auditCreate = vi.fn().mockResolvedValue({ id: "audit-1" });
    const transaction = {
      invoice: { create: invoiceCreate },
      auditLog: { create: auditCreate },
    };
    const ctx = {
      companyId: "company-1",
      triggeredBy: "user-1",
      prisma: {
        freelancer: { findFirst: vi.fn().mockResolvedValue({ id: "f-1" }) },
        contract: {
          findFirst: vi.fn().mockResolvedValue({
            id: "contract-1",
            currency: "USD",
          }),
        },
        invoice: { count: vi.fn().mockResolvedValue(0) },
        $transaction: vi.fn(
          async (callback: (client: typeof transaction) => unknown) =>
            callback(transaction),
        ),
      },
    } as never;
    const input = {
      freelancerId: "f-1",
      contractId: "contract-1",
      periodStart: "2026-08-01",
      periodEnd: "2026-08-07",
      hours: 1,
      rate: 1,
      taxRate: 0.1,
      currency: "USD",
      items: [{ description: "Authoritative work", quantity: 2, rate: 10 }],
      amount: 1,
      totalAmount: 1.1,
    };

    expect(createDraftInvoice.monetary?.(input)).toBe(22);
    await expect(createDraftInvoice.execute(ctx, input)).resolves.toEqual(
      expect.objectContaining({ invoiceId: "invoice-1", totalAmount: 22 }),
    );
    expect(invoiceCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        amount: expect.objectContaining({ toFixed: expect.any(Function) }),
        taxAmount: expect.objectContaining({ toFixed: expect.any(Function) }),
        totalAmount: expect.objectContaining({ toFixed: expect.any(Function) }),
        calculationVersion: "invoice-v1",
      }),
    });
    const persisted = invoiceCreate.mock.calls[0]![0].data;
    expect(persisted.amount.toFixed(4)).toBe("20.0000");
    expect(persisted.taxAmount.toFixed(4)).toBe("2.0000");
    expect(persisted.totalAmount.toFixed(4)).toBe("22.0000");
    expect(auditCreate).toHaveBeenCalledOnce();
  });
});
