import { describe, expect, it } from "vitest";
import { z } from "zod";
import { Prisma } from "@repo/db";
import { attachToolAction } from "../src/engine/core";
import type { ToolDef } from "../src/types";

/**
 * Property stress test: guard idempotensi + unique index (tool, idempotencyKey)
 * tidak boleh menghasilkan invoice duplikat meski dipanggil 100x /
 * bersamaan. Fake prisma menyimulasikan perilaku Postgres: create yang
 * melanggar unique (P2002) dilempar, findFirst IDEMPOTENT status executed.
 */

const INVOICE_TOOL: ToolDef = {
  name: "createDraftInvoice",
  description: "test",
  inputSchema: z.object({
    periodStart: z.string(),
    freelancerId: z.string(),
    contractId: z.string().nullable().optional(),
    amount: z.number(),
  }),
  defaultMode: "PROPOSE",
  permission: ["SYSTEM", "OWNER", "ADMIN", "FINANCE"],
  monetary: (input) => (input as { amount: number }).amount ?? null,
  idempotencyKey: (ctx, input) => {
    const i = input as {
      periodStart: string;
      freelancerId: string;
      contractId?: string | null;
    };
    return Promise.resolve(
      `${ctx.companyId}:invoice:${i.periodStart}:${i.freelancerId}:${i.contractId ?? "none"}`,
    );
  },
  execute: async () => ({ invoiceId: "inv-x", invoiceNo: "INV-2026-001" }),
};

const INPUT = {
  periodStart: "2026-08-01",
  freelancerId: "f-1",
  contractId: null,
  amount: 2500,
};

const BASE = {
  enabled: true,
  mode: "PROPOSE",
  toolOverrides: {},
  autoActionThreshold: 10000,
};

const CONFIG = {
  enabled: true,
  mode: "PROPOSE",
  toolOverrides: {},
  autoActionThreshold: 10000,
};

function makeFakeDb() {
  const store: Array<{
    id: string;
    tool: string;
    idempotencyKey: string | null;
    status: string;
  }> = [];
  let seq = 0;

  const agentAction = {
    findFirst: async (args: {
      where: { tool: string; idempotencyKey: string; status: { in: string[] } };
    }) => {
      const hit = store.find(
        (a) =>
          a.tool === args.where.tool &&
          a.idempotencyKey === args.where.idempotencyKey &&
          args.where.status.in.includes(a.status),
      );
      return hit ?? null;
    },
    create: async (params: {
      data: { tool: string; idempotencyKey: string | null };
    }) => {
      const dup = store.some(
        (a) =>
          a.tool === params.data.tool &&
          a.idempotencyKey != null &&
          a.idempotencyKey === params.data.idempotencyKey,
      );
      if (dup) {
        throw new Prisma.PrismaClientKnownRequestError(
          "Unique constraint failed",
          { code: "P2002", clientVersion: "test" },
        );
      }
      const row = {
        id: `act-${++seq}`,
        tool: params.data.tool,
        idempotencyKey: params.data.idempotencyKey,
        status: "PENDING",
      };
      store.push(row);
      return { ...row, mode: "PROPOSE", runId: "run-1" };
    },
    update: async (params: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => {
      const row = store.find((a) => a.id === params.where.id);
      if (row) Object.assign(row, params.data);
      return row;
    },
  };

  const prisma = {
    agentConfig: {
      findUnique: async () => BASE,
    },
    agentAction,
    auditLog: { create: async () => ({}) },
  };

  return { prisma, actions: store, count: () => store.length };
}

describe("guardrail: stress idempotency (100 iterasi, tanpa invoice duplikat)", () => {
  it("run simultan 100x → tepat 1 aksi berhasil, 99 terdeteksi duplikat", async () => {
    const { prisma, count } = makeFakeDb();
    const results = await Promise.all(
      Array.from({ length: 100 }, (_, i) =>
        attachToolAction({
          prisma: prisma as never,
          runId: "run-1",
          companyId: "acme",
          agentType: "BILLING",
          tool: INVOICE_TOOL,
          input: INPUT,
          index: i,
          actorRole: "SYSTEM",
          steps: [],
        }),
      ),
    );

    const executed = results.filter((r) => r.action && !r.deniedReason);
    const denied = results.filter((r) => r.deniedReason);
    expect(executed).toHaveLength(1);
    expect(denied).toHaveLength(99);
    expect(denied.every((d) => d.deniedReason!.includes("duplicate"))).toBe(
      true,
    );
    expect(count()).toBe(1);
  });

  it("sekuensial 100x dengan key sama → hanya 1 proyek yang tersimpan", async () => {
    const { prisma, count } = makeFakeDb();
    for (let i = 0; i < 100; i++) {
      await attachToolAction({
        prisma: prisma as never,
        runId: "run-1",
        companyId: "acme",
        agentType: "BILLING",
        tool: INVOICE_TOOL,
        input: INPUT,
        index: i,
        steps: [],
      });
    }
    expect(count()).toBe(1);
  });

  it("period berbeda → draft diperbolehkan lagi (bukan duplikat)", async () => {
    const { prisma, count } = makeFakeDb();
    for (const periodStart of ["2026-08-01", "2026-08-15"]) {
      await attachToolAction({
        prisma: prisma as never,
        runId: "run-1",
        companyId: "acme",
        agentType: "BILLING",
        tool: INVOICE_TOOL,
        input: { ...INPUT, periodStart },
        index: 0,
        steps: [],
      });
    }
    expect(count()).toBe(2);
  });
});
