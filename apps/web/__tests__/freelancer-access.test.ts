import { describe, expect, it } from "vitest";
import {
  freelancerPublicSelect,
  hasRestrictedFinancialMutation,
  redactFreelancerSensitiveFields,
} from "@/lib/freelancer-access";

const FREELANCER = {
  id: "freelancer-1",
  taxId: "tax-123",
  bankName: "Example Bank",
  bankAccount: "1234567890",
  bankRouting: "routing-1",
  notes: "Internal performance note",
};

describe("freelancer access policy", () => {
  it("keeps nested freelancer projections free of financial PII and notes", () => {
    const fields = Object.keys(freelancerPublicSelect);
    expect(fields).not.toEqual(
      expect.arrayContaining([
        "taxId",
        "bankName",
        "bankAccount",
        "bankRouting",
        "notes",
      ]),
    );
  });

  it("shows financial PII only to owner, admin, and finance roles", () => {
    expect(
      redactFreelancerSensitiveFields(FREELANCER, "FINANCE").bankAccount,
    ).toBe("1234567890");
    expect(
      redactFreelancerSensitiveFields(FREELANCER, "MANAGER").bankAccount,
    ).toBeNull();
    expect(
      redactFreelancerSensitiveFields(FREELANCER, "VIEWER").taxId,
    ).toBeNull();
  });

  it("shows internal notes only to owner, admin, and manager roles", () => {
    expect(redactFreelancerSensitiveFields(FREELANCER, "MANAGER").notes).toBe(
      "Internal performance note",
    );
    expect(
      redactFreelancerSensitiveFields(FREELANCER, "FINANCE").notes,
    ).toBeNull();
    expect(
      redactFreelancerSensitiveFields(FREELANCER, "VIEWER").notes,
    ).toBeNull();
  });

  it("prevents managers from mutating financial PII", () => {
    expect(
      hasRestrictedFinancialMutation("MANAGER", { bankAccount: "new-value" }),
    ).toBe(true);
    expect(hasRestrictedFinancialMutation("MANAGER", { notes: "safe" })).toBe(
      false,
    );
    expect(
      hasRestrictedFinancialMutation("MANAGER", { bankAccount: undefined }),
    ).toBe(false);
    expect(
      hasRestrictedFinancialMutation("OWNER", { bankAccount: "new-value" }),
    ).toBe(false);
  });
});
