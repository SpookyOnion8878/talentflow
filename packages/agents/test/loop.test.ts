import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { runReActLoop } from "../src/engine/loop";
import type { ModelProvider } from "../src/providers/types";
import type { ToolDef } from "../src/types";

const REMINDER: ToolDef = {
  name: "sendInvoiceReminder",
  description: "Kirim reminder tagihan",
  inputSchema: z.object({ invoiceId: z.string(), tier: z.number() }),
  defaultMode: "AUTO",
  permission: ["SYSTEM"],
  execute: async () => ({ status: "reminded" }),
};

function makePrisma() {
  const actions: any[] = [];
  let runState: Record<string, unknown> = { id: "run-1", status: "RUNNING" };

  const prisma: any = {
    agentConfig: {
      findUnique: vi.fn().mockResolvedValue({
        enabled: true,
        monthlyTokenBudget: 5000,
        toolOverrides: {},
        autoActionThreshold: null,
      }),
    },
    agentRun: {
      create: vi.fn().mockResolvedValue({ id: "run-1" }),
      update: vi.fn().mockImplementation(async (args: { data: any }) => {
        runState = { id: "run-1", ...args.data };
        return runState;
      }),
      aggregate: vi.fn().mockResolvedValue({ _sum: { totalTokens: 0 } }),
    },
    agentAction: {
      create: vi.fn().mockImplementation(async (args: { data: any }) => {
        const a = { id: `action-${actions.length}`, ...args.data };
        actions.push(a);
        return a;
      }),
      update: vi
        .fn()
        .mockImplementation(async (args: { where: any; data: any }) => {
          const a = actions.find((x) => x.id === args.where.id);
          if (a) Object.assign(a, args.data);
          return a ?? args.data;
        }),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };

  return { prisma, actions, getRun: () => runState };
}

class ScriptedProvider implements ModelProvider {
  readonly name = "scripted";
  private i = 0;

  constructor(
    private calls: Array<{
      toolCall?: { name: string; args: Record<string, unknown> };
      text?: string;
    }>,
  ) {}

  async chat(): Promise<any> {
    const c = this.calls[this.i++];
    return c.toolCall
      ? {
          content: null,
          toolCall: {
            name: c.toolCall.name,
            arguments: JSON.stringify(c.toolCall.args),
          },
          totalTokens: 10,
        }
      : { content: c.text ?? "Selesai.", totalTokens: 10 };
  }

  async embed(): Promise<number[]> {
    return [];
  }
}

describe("runReActLoop", () => {
  it("memanggil tool AUTO lalu selesai dengan pesan final", async () => {
    const { prisma, actions, getRun } = makePrisma();
    const provider = new ScriptedProvider([
      {
        toolCall: {
          name: "sendInvoiceReminder",
          args: { invoiceId: "i1", tier: 1 },
        },
      },
      { text: "Selesai." },
    ]);

    const run = await runReActLoop({
      companyId: "acme",
      prisma,
      agentType: "BILLING",
      triggerType: "CRON_DAILY",
      intent: "test",
      systemPrompt: "Bantu dashboard",
      tools: [REMINDER],
      provider,
    });

    expect(run).not.toBeNull();
    expect(actions.length).toBe(1);
    expect(actions[0].tool).toBe("sendInvoiceReminder");
    expect(actions[0].status).toBe("AUTO_EXECUTED");

    const finalRun = getRun();
    expect(finalRun.status).toBe("SUCCEEDED");
    expect(finalRun.steps).toHaveLength(2);
  });

  it("tidak menjalankan apa pun jika konfigurasi agent non-aktif", async () => {
    const { prisma, actions } = makePrisma();
    prisma.agentConfig.findUnique.mockResolvedValue({
      enabled: false,
      monthlyTokenBudget: 5000,
      toolOverrides: {},
      autoActionThreshold: null,
    });

    const provider = new ScriptedProvider([
      {
        toolCall: {
          name: "sendInvoiceReminder",
          args: { invoiceId: "i1", tier: 2 },
        },
      },
    ]);

    const run = await runReActLoop({
      companyId: "acme",
      prisma,
      agentType: "BILLING",
      triggerType: "CRON_DAILY",
      intent: "test",
      systemPrompt: "x",
      tools: [REMINDER],
      provider,
    });

    expect(run).toBeNull();
    expect(actions.length).toBe(0);
  });
});
