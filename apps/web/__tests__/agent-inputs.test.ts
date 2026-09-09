import { describe, expect, it } from "vitest";
import { agentActivityInputSchema } from "@/lib/agent-inputs";

describe("agent activity input", () => {
  it("applies safe pagination defaults", () => {
    expect(agentActivityInputSchema.parse({})).toMatchObject({
      page: 1,
      limit: 20,
    });
  });

  it("rejects unbounded, fractional, and invalid pagination", () => {
    expect(() =>
      agentActivityInputSchema.parse({ page: 0, limit: 20 }),
    ).toThrow();
    expect(() =>
      agentActivityInputSchema.parse({ page: 1.5, limit: 20 }),
    ).toThrow();
    expect(() =>
      agentActivityInputSchema.parse({ page: 1, limit: 101 }),
    ).toThrow();
  });
});
