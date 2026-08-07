import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatDate,
  slugify,
  truncate,
  generateInvoiceNumber,
  generateContractNumber,
  calculateInvoiceTotal,
  calculateBudgetBurnRate,
  getStatusColor,
  getDaysBetween,
  isOverdue,
} from "../src/index";

describe("formatCurrency", () => {
  it("formats USD correctly", () => {
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
  });

  it("formats EUR correctly", () => {
    const result = formatCurrency(1000, "EUR");
    expect(result).toContain("1,000");
  });

  it("handles zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });
});

describe("slugify", () => {
  it("converts text to slug", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("handles special characters", () => {
    expect(slugify("Acme Corp! @#$")).toBe("acme-corp");
  });

  it("removes leading/trailing dashes", () => {
    expect(slugify("--test--")).toBe("test");
  });
});

describe("truncate", () => {
  it("truncates long text", () => {
    expect(truncate("Hello World", 8)).toBe("Hello...");
  });

  it("does not truncate short text", () => {
    expect(truncate("Hello", 10)).toBe("Hello");
  });
});

describe("generateInvoiceNumber", () => {
  it("generates with INV prefix", () => {
    const num = generateInvoiceNumber();
    expect(num).toMatch(/^INV-/);
  });

  it("generates unique numbers", () => {
    const a = generateInvoiceNumber();
    const b = generateInvoiceNumber();
    expect(a).not.toBe(b);
  });
});

describe("generateContractNumber", () => {
  it("generates with CTR prefix", () => {
    const num = generateContractNumber();
    expect(num).toMatch(/^CTR-/);
  });
});

describe("calculateInvoiceTotal", () => {
  it("calculates subtotal and tax correctly", () => {
    const items = [
      { quantity: 10, rate: 100 },
      { quantity: 5, rate: 50 },
    ];
    const result = calculateInvoiceTotal(items);
    expect(result.subtotal).toBe(1250);
    expect(result.tax).toBeCloseTo(137.5);
    expect(result.total).toBeCloseTo(1387.5);
  });

  it("handles empty items", () => {
    const result = calculateInvoiceTotal([]);
    expect(result.subtotal).toBe(0);
    expect(result.total).toBe(0);
  });
});

describe("calculateBudgetBurnRate", () => {
  it("calculates burn rate correctly", () => {
    const result = calculateBudgetBurnRate(50000, 25000, 100, 50);
    expect(result.dailyRate).toBe(500);
    expect(result.remainingDays).toBe(50);
    expect(result.projectedTotal).toBe(50000);
    expect(result.onTrack).toBe(true);
  });

  it("detects over-budget projects", () => {
    const result = calculateBudgetBurnRate(10000, 8000, 100, 50);
    expect(result.dailyRate).toBe(160);
    expect(result.projectedTotal).toBe(16000);
    expect(result.onTrack).toBe(false);
  });
});

describe("getStatusColor", () => {
  it("returns correct color for ACTIVE", () => {
    expect(getStatusColor("ACTIVE")).toContain("green");
  });

  it("returns default for unknown status", () => {
    expect(getStatusColor("UNKNOWN")).toContain("gray");
  });
});

describe("getDaysBetween", () => {
  it("calculates days correctly", () => {
    const start = new Date("2024-01-01");
    const end = new Date("2024-01-31");
    expect(getDaysBetween(start, end)).toBe(30);
  });
});

describe("isOverdue", () => {
  it("returns true for past dates", () => {
    expect(isOverdue(new Date("2020-01-01"))).toBe(true);
  });

  it("returns false for future dates", () => {
    expect(isOverdue(new Date("2099-12-31"))).toBe(false);
  });
});
