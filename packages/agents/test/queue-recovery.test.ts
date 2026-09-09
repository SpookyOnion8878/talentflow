import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unit tests for AgentJob queue recovery. The fake Prisma client records the
 * updateMany payload so the test asserts the recovery contract directly:
 * only LOCKED jobs older than the cutoff go back to PENDING.
 */

const updateMany = vi.fn(async () => ({ count: 2 }));

vi.mock("@repo/db", () => ({
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
      strings,
      values,
    }),
    empty: {},
    join: (parts: string[]) => parts.join(","),
  },
  PrismaClient: class {},
}));

import { recoverStaleLockedJobs } from "../src/jobs/queue";

function makePrisma() {
  return {
    agentJob: { updateMany },
  } as unknown as Parameters<typeof recoverStaleLockedJobs>[0];
}

describe("recoverStaleLockedJobs", () => {
  beforeEach(() => {
    updateMany.mockClear();
    updateMany.mockImplementation(async () => ({ count: 2 }));
  });

  it("re-queues only LOCKED jobs older than the staleness cutoff", async () => {
    const prisma = makePrisma();
    const recovered = await recoverStaleLockedJobs(prisma, 15);

    expect(recovered).toBe(2);
    expect(updateMany).toHaveBeenCalledTimes(1);
    const call = updateMany.mock.calls[0]![0] as {
      where: { status: string; createdAt: { lt: Date } };
      data: { status: string };
    };
    expect(call.where.status).toBe("LOCKED");
    expect(call.where.createdAt.lt.getTime()).toBeLessThanOrEqual(
      Date.now() - 15 * 60_000,
    );
    expect(call.data.status).toBe("PENDING");
  });

  it("uses a 15 minute default staleness window", async () => {
    const prisma = makePrisma();
    await recoverStaleLockedJobs(prisma);

    const call = updateMany.mock.calls[0]![0] as {
      where: { createdAt: { lt: Date } };
    };
    const cutoff = call.where.createdAt.lt.getTime();
    const expectedWindow = 15 * 60_000;
    // Cutoff must be ~now-15m (allow 5s of test execution drift).
    expect(Date.now() - cutoff).toBeGreaterThanOrEqual(expectedWindow);
    expect(Date.now() - cutoff).toBeLessThanOrEqual(expectedWindow + 5_000);
  });

  it("propagates database errors to the caller", async () => {
    updateMany.mockImplementation(async () => {
      throw new Error("db down");
    });
    const prisma = makePrisma();
    await expect(recoverStaleLockedJobs(prisma)).rejects.toThrow("db down");
  });
});
