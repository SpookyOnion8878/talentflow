import { describe, it, expect } from "vitest";
import {
  loginSchema,
  registerSchema,
  freelancerSchema,
  projectSchema,
  timesheetSchema,
  invoiceSchema,
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
