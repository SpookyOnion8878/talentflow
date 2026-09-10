import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatDate,
  slugify,
  truncate,
  generateInvoiceNumber,
  generateContractNumber,
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
