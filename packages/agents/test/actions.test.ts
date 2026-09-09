import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const executeSpy = vi.hoisted(() => vi.fn());

vi.mock("../src/tools/registry", () => ({
  getTool: () => ({
    name: "sensitiveAction",
    description: "A sensitive test action",
    inputSchema: z.object({ recordId: z.string() }),
    defaultMode: "PROPOSE",
    permission: ["SYSTEM"],
    approvalPermission: ["OWNER", "ADMIN"],
    execute: executeSpy,
  }),
}));

import {
  executeProposedAction,
  recoverStaleClaimedActions,
  rejectProposedAction,
} from "../src/engine/actions";

function makeDatabase() {
  const action: Record<string, any> = {
    id: "action-1",
    runId: "run-1",
    tool: "sensitiveAction",
    input: { recordId: "record-1" },
    output: null,
    mode: "PROPOSE",
    status: "PENDING",
    idempotencyKey: null,
    reason: null,
    approvedBy: null,
    approvedAt: null,
    error: null,
    createdAt: new Date(),
    executedAt: null,
    run: { id: "run-1", companyId: "company-1", agentType: "COMPLIANCE" },
  };

  const prisma = {
    agentAction: {
      findUnique: vi.fn(async () => ({ ...action })),
      findFirst: vi.fn(async () => null),
      updateMany: vi.fn(async ({ where, data }: any) => {
        if (action.id !== where.id || action.status !== where.status) {
          return { count: 0 };
        }
        Object.assign(action, data);
        return { count: 1 };
      }),
      update: vi.fn(async ({ data }: any) => {
        Object.assign(action, data);
        return { ...action };
      }),
    },
    agentConfig: {
      findUnique: vi.fn(async () => ({
        enabled: true,
        mode: "PROPOSE",
        toolOverrides: {},
        autoActionThreshold: null,
      })),
    },
    auditLog: { create: vi.fn(async () => ({})) },
  };

  return { prisma, action };
}

describe("executeProposedAction", () => {
  beforeEach(() => {
    executeSpy.mockReset();
    executeSpy.mockResolvedValue({ ok: true });
  });

  it("allows only one concurrent approver to claim and execute an action", async () => {
    const { prisma, action } = makeDatabase();
    const calls = await Promise.allSettled([
      executeProposedAction(
        prisma as never,
        "action-1",
        "owner-1",
        "company-1",
        "OWNER",
      ),
      executeProposedAction(
        prisma as never,
        "action-1",
        "owner-2",
        "company-1",
        "OWNER",
      ),
    ]);

    expect(calls.filter((call) => call.status === "fulfilled")).toHaveLength(1);
    expect(calls.filter((call) => call.status === "rejected")).toHaveLength(1);
    expect(executeSpy).toHaveBeenCalledTimes(1);
    expect(action.status).toBe("APPROVED");
    expect(action.executedAt).toBeInstanceOf(Date);
  });

  it("blocks an unauthorized approver without mutating proposal state", async () => {
    const { prisma, action } = makeDatabase();

    await expect(
      executeProposedAction(
        prisma as never,
        "action-1",
        "finance-1",
        "company-1",
        "FINANCE",
      ),
    ).rejects.toThrow("not allowed to approve");
    expect(executeSpy).not.toHaveBeenCalled();
    expect(action.status).toBe("PENDING");
  });

  it("does not let an unauthorized role reject a hidden proposal by ID", async () => {
    const { prisma, action } = makeDatabase();

    await expect(
      rejectProposedAction(
        prisma as never,
        "action-1",
        "finance-1",
        "Not approved",
        "company-1",
        "FINANCE",
      ),
    ).rejects.toThrow("not allowed to reject");
    expect(action.status).toBe("PENDING");
  });

  it("marks abandoned approval claims as failed for manual review", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 2 });
    const recovered = await recoverStaleClaimedActions(
      { agentAction: { updateMany } } as never,
      15,
    );

    expect(recovered).toBe(2);
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "APPROVED",
          executedAt: null,
        }),
        data: expect.objectContaining({ status: "FAILED" }),
      }),
    );
  });
});
