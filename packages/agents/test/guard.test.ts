import { describe, expect, it, vi } from "vitest";
import { canApproveTool, evaluateGuard } from "../src/guards/pipeline";
import type { ToolDef } from "../src/types";
import { z } from "zod";

const FINANCIAL_TOOL: ToolDef = {
  name: "createDraftInvoice",
  description: "test",
  inputSchema: z.object({ amount: z.number() }),
  defaultMode: "PROPOSE",
  permission: ["SYSTEM"],
  monetary: (input) => (input as { amount: number }).amount ?? null,
  execute: async () => ({ ok: true }),
};

const REMINDER_TOOL: ToolDef = {
  name: "sendInvoiceReminder",
  description: "test",
  inputSchema: z.object({ invoiceId: z.string() }),
  defaultMode: "AUTO",
  permission: ["SYSTEM"],
  execute: async () => ({ ok: true }),
};

import type { ToolContext } from "../src/types";

function makeCtx(overrides: Partial<ToolContext> = {}) {
  return {
    companyId: "acme",
    prisma: {
      agentAction: { findFirst: vi.fn().mockResolvedValue(null) },
    } as any,
    ...overrides,
  };
}

const baseConfig: any = {
  enabled: true,
  mode: "PROPOSE",
  toolOverrides: {},
  autoActionThreshold: 10000,
};

describe("evaluateGuard", () => {
  it("rejects actions when the agent is disabled", async () => {
    const res = await evaluateGuard({
      tool: REMINDER_TOOL,
      ctx: makeCtx(),
      input: {},
      config: { ...baseConfig, enabled: false },
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain("is disabled");
  });

  it("forces monetary actions above the threshold to PROPOSE", async () => {
    const res = await evaluateGuard({
      tool: FINANCIAL_TOOL,
      ctx: makeCtx(),
      input: { amount: 50000 },
      config: { ...baseConfig, toolOverrides: { createDraftInvoice: "AUTO" } },
    });
    expect(res.allowed).toBe(true);
    expect(res.mode).toBe("PROPOSE");
  });

  it("keeps monetary actions below the threshold in the company mode", async () => {
    const res = await evaluateGuard({
      tool: FINANCIAL_TOOL,
      ctx: makeCtx(),
      input: { amount: 5000 },
      config: baseConfig,
    });
    expect(res.mode).toBe("PROPOSE");
  });

  it("uses the company-wide mode for mutating tools", async () => {
    const res = await evaluateGuard({
      tool: REMINDER_TOOL,
      ctx: makeCtx(),
      input: {},
      config: baseConfig,
    });
    expect(res.mode).toBe("PROPOSE");

    const automatic = await evaluateGuard({
      tool: REMINDER_TOOL,
      ctx: makeCtx(),
      input: {},
      config: { ...baseConfig, mode: "AUTO" },
    });
    expect(automatic.mode).toBe("AUTO");
  });

  it("keeps read-only tools automatic regardless of company mode", async () => {
    const res = await evaluateGuard({
      tool: { ...REMINDER_TOOL, readOnly: true },
      ctx: makeCtx(),
      input: {},
      config: baseConfig,
    });
    expect(res.mode).toBe("AUTO");
  });

  it("uses explicit human approval permissions instead of SYSTEM rights", async () => {
    expect(canApproveTool(REMINDER_TOOL, "OWNER")).toBe(false);
    const tool = {
      ...REMINDER_TOOL,
      approvalPermission: ["OWNER"] as const,
    } satisfies ToolDef;
    expect(canApproveTool(tool, "OWNER")).toBe(true);
    expect(canApproveTool(tool, "FINANCE")).toBe(false);

    const denied = await evaluateGuard({
      tool,
      ctx: makeCtx({ actorRole: "FINANCE", isApproval: true }),
      input: {},
      config: baseConfig,
    });
    expect(denied.allowed).toBe(false);
  });

  it("detects an already executed idempotency key", async () => {
    const ctx = makeCtx();
    ctx.prisma.agentAction.findFirst.mockResolvedValueOnce({ id: "x" });

    const tool: ToolDef = {
      ...REMINDER_TOOL,
      idempotencyKey: () => Promise.resolve("acme:reminder:inv-1:2"),
    };
    const res = await evaluateGuard({
      tool,
      ctx,
      input: { invoiceId: "inv-1" },
      config: baseConfig,
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain("duplicate");
  });
});
