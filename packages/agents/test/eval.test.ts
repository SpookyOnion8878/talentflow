import { describe, it, expect } from "vitest";
import { routeIntent } from "../src/engine/router";

/**
 * Golden intent-routing set with realistic billing, compliance, and general scenarios.
 * MVP accuracy target: at least 85% (PRD KPI).
 */
const GOLDEN: Array<[string, string, string]> = [
  // Billing — unpaid
  ["how much is still unpaid this month?", "check_unpaid_invoices", "BILLING"],
  ["which invoices are still unpaid?", "check_unpaid_invoices", "BILLING"],
  ["total outstanding invoices?", "check_unpaid_invoices", "BILLING"],
  [
    "are there invoices the client has not paid?",
    "check_unpaid_invoices",
    "BILLING",
  ],
  ["follow up on unpaid invoices", "check_unpaid_invoices", "BILLING"],
  // Billing — aging / DSO
  ["create an invoice aging report", "aging_report", "BILLING"],
  ["what is our current DSO?", "aging_report", "BILLING"],
  ["which invoices are overdue?", "aging_report", "BILLING"],
  // Billing — draft
  [
    "create a draft invoice for this freelancer",
    "create_invoice_draft",
    "BILLING",
  ],
  ["generate an invoice this week", "create_invoice_draft", "BILLING"],
  // Billing — budget
  [
    "how much of this month's budget has been used?",
    "budget_and_cost",
    "BILLING",
  ],
  ["summarize agent tokens this month", "budget_and_cost", "BILLING"],
  // Compliance
  ["which documents are about to expire?", "compliance_status", "COMPLIANCE"],
  ["which freelancer visas are expiring?", "compliance_status", "COMPLIANCE"],
  [
    "which work compliance records have expired?",
    "compliance_status",
    "COMPLIANCE",
  ],
  [
    "send reminders for expiring documents",
    "compliance_reminder",
    "COMPLIANCE",
  ],
  [
    "remind me about expiring work permits",
    "compliance_reminder",
    "COMPLIANCE",
  ],
  // General
  ["hello, what can you help with?", "general_question", "GENERAL"],
  ["who are you?", "general_question", "GENERAL"],
  ["how do I sign in to the application?", "general_question", "GENERAL"],
];

describe("eval: intent router (golden set)", () => {
  it("reaches accuracy >= 85% on 20 golden scenarios", () => {
    let correct = 0;
    for (const [message, expectIntent, expectAgent] of GOLDEN) {
      const d = routeIntent(message);
      if (d.intent === expectIntent && d.agentType === expectAgent) {
        correct++;
      }
    }
    const accuracy = correct / GOLDEN.length;
    expect(accuracy).toBeGreaterThanOrEqual(0.85);
    expect(accuracy).toBe(1); // The deterministic rules must be perfect on the golden set.
  });

  it("falls back to GENERAL for out-of-domain questions", () => {
    const d = routeIntent("please review my performance dashboard");
    expect(d.agentType).toBe("GENERAL");
  });

  it("prioritizes financial intent over compliance on mixed queries", () => {
    const d = routeIntent(
      "an invoice is unpaid and a compliance document is expiring",
    );
    expect(d.intent).toBe("check_unpaid_invoices");
    expect(d.agentType).toBe("BILLING");
  });
});
