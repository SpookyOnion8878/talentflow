import { describe, expect, it } from "vitest";
import { findStoredCopilotSuggestion } from "../src/engine/copilot";

const STORED_STEPS = [
  {
    index: 1,
    kind: "message",
    output: {
      suggestions: [
        {
          id: "0",
          tool: "sendInvoiceReminder",
          label: "Send reminder",
          reason: "Invoice is overdue",
          params: { invoiceId: "invoice-1", tier: 1 },
        },
      ],
    },
  },
];

describe("findStoredCopilotSuggestion", () => {
  it("returns only a suggestion persisted in the referenced run", () => {
    expect(findStoredCopilotSuggestion(STORED_STEPS, "0")).toMatchObject({
      tool: "sendInvoiceReminder",
      params: { invoiceId: "invoice-1" },
    });
    expect(findStoredCopilotSuggestion(STORED_STEPS, "forged")).toBeNull();
  });

  it("rejects malformed stored data", () => {
    expect(
      findStoredCopilotSuggestion(
        [{ output: { suggestions: [{ id: "0", tool: "unsafe" }] } }],
        "0",
      ),
    ).toBeNull();
  });
});
