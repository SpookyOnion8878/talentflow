import { describe, expect, it, vi } from "vitest";
import { billingTools } from "../src/tools/billing";
import { complianceTools } from "../src/tools/compliance";

const createDraftInvoice = billingTools.find(
  (tool) => tool.name === "createDraftInvoice",
)!;
const sendComplianceReminder = complianceTools.find(
  (tool) => tool.name === "sendComplianceReminder",
)!;
const markComplianceExpired = complianceTools.find(
  (tool) => tool.name === "markComplianceExpired",
)!;

const invoiceInput = {
  freelancerId: "freelancer-other-tenant",
  contractId: "contract-other-tenant",
  periodStart: "2026-08-01",
  periodEnd: "2026-08-07",
  hours: 8,
  rate: 100,
  amount: 800,
  totalAmount: 800,
  currency: "USD",
};

describe("agent tool tenant boundaries", () => {
  it("rejects an invoice target outside the active company", async () => {
    const freelancerFindFirst = vi.fn().mockResolvedValue(null);
    const invoiceCreate = vi.fn();
    const ctx = {
      companyId: "company-1",
      prisma: {
        freelancer: { findFirst: freelancerFindFirst },
        invoice: { create: invoiceCreate },
      },
    } as never;

    await expect(createDraftInvoice.execute(ctx, invoiceInput)).rejects.toThrow(
      "not found",
    );
    expect(freelancerFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "freelancer-other-tenant",
          companyId: "company-1",
        },
      }),
    );
    expect(invoiceCreate).not.toHaveBeenCalled();
  });

  it("rejects a contract that is not owned by the company and freelancer", async () => {
    const contractFindFirst = vi.fn().mockResolvedValue(null);
    const invoiceCreate = vi.fn();
    const ctx = {
      companyId: "company-1",
      prisma: {
        freelancer: { findFirst: vi.fn().mockResolvedValue({ id: "f-1" }) },
        contract: { findFirst: contractFindFirst },
        invoice: { create: invoiceCreate },
      },
    } as never;

    await expect(createDraftInvoice.execute(ctx, invoiceInput)).rejects.toThrow(
      "is not valid",
    );
    expect(contractFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "contract-other-tenant",
          companyId: "company-1",
          freelancerId: "freelancer-other-tenant",
        },
      }),
    );
    expect(invoiceCreate).not.toHaveBeenCalled();
  });

  it("tenant-scopes compliance reminders before reading PII", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const ctx = {
      companyId: "company-1",
      prisma: { complianceRecord: { findFirst } },
    } as never;

    await expect(
      sendComplianceReminder.execute(ctx, {
        recordId: "record-other-tenant",
        daysLeft: 7,
        stage: "7",
      }),
    ).rejects.toThrow("not found");
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "record-other-tenant",
          freelancer: { companyId: "company-1" },
        },
      }),
    );
  });

  it("tenant-scopes compliance expiration mutations", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const update = vi.fn();
    const ctx = {
      companyId: "company-1",
      prisma: { complianceRecord: { findFirst, update } },
    } as never;

    await expect(
      markComplianceExpired.execute(ctx, {
        recordId: "record-other-tenant",
      }),
    ).rejects.toThrow("not found");
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "record-other-tenant",
          freelancer: { companyId: "company-1" },
        },
      }),
    );
    expect(update).not.toHaveBeenCalled();
  });
});
