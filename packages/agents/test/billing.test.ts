import { describe, expect, it } from "vitest";
import { calcInvoice, buildInvoiceNo } from "../src/tools/billing";

describe("calcInvoice (deterministik, tanpa LLM)", () => {
  it("menghitung amount, tax, dan total dengan benar", () => {
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

  it("bulat 2 desimal untuk jam tidak bulat", () => {
    const result = calcInvoice({
      hours: 7.5,
      ratePerHour: 90.5,
      taxRate: 0,
      currency: "USD",
    });
    expect(result.amount).toBe(678.75);
    expect(result.total).toBe(678.75);
  });

  it("tax default 0 bila tidak diberikan", () => {
    const result = calcInvoice({
      hours: 8,
      ratePerHour: 100,
      currency: "USD",
    });
    expect(result.tax).toBe(0);
  });
});

describe("buildInvoiceNo", () => {
  it("memformat counter dengan padding 3 digit", () => {
    expect(buildInvoiceNo(2026, 1)).toBe("INV-2026-001");
    expect(buildInvoiceNo(2026, 42)).toBe("INV-2026-042");
    expect(buildInvoiceNo(2026, 1000)).toBe("INV-2026-1000");
  });
});
