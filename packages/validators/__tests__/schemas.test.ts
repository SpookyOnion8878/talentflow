import { describe, it, expect } from "vitest";
import {
  loginSchema,
  registerSchema,
  freelancerSchema,
  projectSchema,
  timesheetSchema,
  invoiceSchema,
  paymentSchema,
  contractSchema,
  paginationSchema,
} from "../src/index";

describe("loginSchema", () => {
  it("accepts valid input", () => {
    const result = loginSchema.safeParse({
      email: "test@test.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({
      email: "invalid",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = loginSchema.safeParse({
      email: "test@test.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("accepts valid input", () => {
    const result = registerSchema.safeParse({
      email: "test@test.com",
      password: "password123",
      name: "John Doe",
      companyName: "Acme Corp",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short name", () => {
    const result = registerSchema.safeParse({
      email: "test@test.com",
      password: "password123",
      name: "J",
      companyName: "Acme Corp",
    });
    expect(result.success).toBe(false);
  });
});

describe("freelancerSchema", () => {
  it("accepts valid input", () => {
    const result = freelancerSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing firstName", () => {
    const result = freelancerSchema.safeParse({
      lastName: "Doe",
      email: "jane@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("defaults currency to USD", () => {
    const result = freelancerSchema.parse({
      firstName: "Jane",
      lastName: "Doe",
      email: "j@e.com",
    });
    expect(result.currency).toBe("USD");
  });
});

describe("timesheetSchema", () => {
  it("accepts valid input", () => {
    const result = timesheetSchema.safeParse({
      freelancerId: "clx123456789012345678",
      date: "2024-08-01",
      hours: 8,
    });
    expect(result.success).toBe(true);
  });

  it("rejects hours > 24", () => {
    const result = timesheetSchema.safeParse({
      freelancerId: "clx123456789012345678",
      date: "2024-08-01",
      hours: 25,
    });
    expect(result.success).toBe(false);
  });
});

describe("paginationSchema", () => {
  it("uses defaults when empty", () => {
    const result = paginationSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.sortOrder).toBe("desc");
  });

  it("rejects limit > 100", () => {
    const result = paginationSchema.safeParse({ limit: 200 });
    expect(result.success).toBe(false);
  });
});

describe("financial schemas", () => {
  it("removes client-provided invoice amounts", () => {
    const result = invoiceSchema.parse({
      freelancerId: "clx123456789012345678",
      currency: "usd",
      items: [
        {
          description: "Consulting",
          quantity: 2,
          rate: 50,
          amount: 1,
        },
      ],
    });

    expect(result.currency).toBe("USD");
    expect(result.items[0]).toEqual({
      description: "Consulting",
      quantity: 2,
      rate: 50,
    });
  });

  it("rejects empty invoices and zero-value payments", () => {
    expect(
      invoiceSchema.safeParse({
        freelancerId: "clx123456789012345678",
        items: [],
      }).success,
    ).toBe(false);
    expect(
      paymentSchema.safeParse({
        invoiceId: "clx123456789012345678",
        amount: 0,
        method: "BANK_TRANSFER",
      }).success,
    ).toBe(false);
  });

  it("rejects reversed contract dates", () => {
    expect(
      contractSchema.safeParse({
        freelancerId: "clx123456789012345678",
        title: "Consulting",
        ratePerHour: 100,
        startDate: "2026-08-10",
        endDate: "2026-08-01",
      }).success,
    ).toBe(false);
  });
});
