import { describe, expect, it } from "vitest";
import {
  MoneyInvariantError,
  assertTransition,
  calculateInvoiceAmounts,
  calculateOutstandingBalance,
  contractTransitions,
  invoiceTransitions,
  timesheetTransitions,
} from "@repo/db";

describe("financial domain invariants", () => {
  it("calculates authoritative invoice totals with decimal arithmetic", () => {
    const result = calculateInvoiceAmounts([
      { description: "Consulting", quantity: "0.1", rate: "0.2" },
      { description: "Delivery", quantity: "3", rate: "10.005" },
    ]);

    expect(result.lines).toEqual([
      {
        description: "Consulting",
        quantity: "0.1",
        rate: "0.2000",
        amount: "0.0200",
      },
      {
        description: "Delivery",
        quantity: "3",
        rate: "10.0050",
        amount: "30.0150",
      },
    ]);
    expect(result.subtotal.toFixed(4)).toBe("30.0350");
    expect(result.tax.toFixed(4)).toBe("3.3039");
    expect(result.total.toFixed(4)).toBe("33.3389");
  });

  it("calculates partial-payment balances without closing the invoice", () => {
    expect(
      calculateOutstandingBalance("100.0000", ["25", "30.125"]).toFixed(4),
    ).toBe("44.8750");
  });

  it("rejects empty invoices and overpaid ledgers", () => {
    expect(() => calculateInvoiceAmounts([])).toThrow(MoneyInvariantError);
    expect(() => calculateOutstandingBalance("10", ["10.0001"])).toThrow(
      MoneyInvariantError,
    );
  });
});

describe("state transition matrices", () => {
  it("allows expected contract, invoice, and timesheet transitions", () => {
    expect(() =>
      assertTransition("Contract", contractTransitions, "SENT", "SIGNED"),
    ).not.toThrow();
    expect(() =>
      assertTransition("Invoice", invoiceTransitions, "OVERDUE", "PAID"),
    ).not.toThrow();
    expect(() =>
      assertTransition(
        "Timesheet",
        timesheetTransitions,
        "PENDING",
        "APPROVED",
      ),
    ).not.toThrow();
  });

  it("rejects transitions out of terminal states", () => {
    expect(() =>
      assertTransition("Contract", contractTransitions, "TERMINATED", "SENT"),
    ).toThrow("Contract cannot transition from TERMINATED to SENT");
    expect(() =>
      assertTransition("Invoice", invoiceTransitions, "PAID", "CANCELLED"),
    ).toThrow("Invoice cannot transition from PAID to CANCELLED");
    expect(() =>
      assertTransition(
        "Timesheet",
        timesheetTransitions,
        "APPROVED",
        "REJECTED",
      ),
    ).toThrow("Timesheet cannot transition from APPROVED to REJECTED");
  });
});
