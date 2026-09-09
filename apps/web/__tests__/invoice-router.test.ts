import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Router-level tests for the invoice lifecycle using the real tRPC routers
 * and a fake Prisma client injected at the @repo/db module boundary (the
 * isAuthed middleware resolves membership through that import, not through
 * the procedure context). These exercise the guard chain, status-transition
 * claims, and tenancy scoping as endpoints — the layer pure domain tests do
 * not cover (audit finding #10).
 */

const h = vi.hoisted(() => ({
  prisma: undefined as
    | {
        membership: { findFirst: ReturnType<typeof vi.fn> };
        invoice: Record<string, ReturnType<typeof vi.fn>>;
        auditLog: { create: ReturnType<typeof vi.fn> };
        $transaction: ReturnType<typeof vi.fn>;
        [key: string]: unknown;
      }
    | undefined,
  membershipRole: "FINANCE" as string,
}));

vi.mock("@repo/db", () => ({
  Prisma: {
    Decimal: class FakeDecimal {
      constructor(public v: string | number) {}
      toNumber() {
        return Number(this.v);
      }
      toString() {
        return String(this.v);
      }
      toFixed() {
        return String(this.v);
      }
      isZero() {
        return Number(this.v) === 0;
      }
    },
    TransactionIsolationLevel: { Serializable: "SERIALIZABLE" },
    PrismaClientKnownRequestError: class {},
    InvoiceWhereInput: {},
  },
  get prisma() {
    return h.prisma;
  },
  invoiceTransitions: {
    DRAFT: ["SENT", "CANCELLED"],
    SENT: ["VIEWED", "OVERDUE", "PAID", "CANCELLED"],
    VIEWED: ["OVERDUE", "PAID", "CANCELLED"],
    OVERDUE: ["PAID", "CANCELLED"],
    PAID: [],
    CANCELLED: [],
  },
  InvoiceStatus: {
    DRAFT: "DRAFT",
    SENT: "SENT",
    VIEWED: "VIEWED",
    PAID: "PAID",
    OVERDUE: "OVERDUE",
    CANCELLED: "CANCELLED",
  },
  canTransition: (
    map: Record<string, readonly string[]>,
    from: string,
    to: string,
  ) => map[from]?.includes(to) ?? false,
  decimalToNumber: (v: string | number) => Number(v),
  calculateInvoiceAmounts: () => ({
    lines: [],
    subtotal: "0",
    tax: "0",
    total: "0",
    taxRate: "0.11",
    calculationVersion: "invoice-v1",
  }),
  calculateOutstandingBalance: () => ({ isZero: () => false }),
}));

vi.mock("@repo/agents", () => ({
  enqueueAgentJob: vi.fn(),
  sendInvoiceNotification: vi.fn(),
}));

vi.mock("@repo/utils", () => ({
  generateInvoiceNumber: () => "INV-T",
  formatCurrency: () => "$0.00",
}));

vi.mock("../../freelancer-access", () => ({
  freelancerPublicSelect: { id: true },
}));

vi.mock("../../domain/transactions", () => ({
  withSerializableTransaction: async (
    _prisma: unknown,
    fn: (tx: unknown) => Promise<unknown>,
  ) => fn({}),
}));

function makeFakePrisma(invoiceOverrides: Record<string, unknown> = {}) {
  const invoice = {
    id: "inv-1",
    invoiceNo: "INV-1",
    companyId: "company-1",
    freelancerId: "fr-1",
    amount: "100",
    taxAmount: "11",
    totalAmount: "111",
    taxRate: "0.11",
    currency: "USD",
    status: "DRAFT",
    dueDate: null,
    paidAt: null,
    ...invoiceOverrides,
  };
  const state = {
    invoice,
    updateManyCalls: [] as Array<Record<string, unknown>>,
  };

  const prisma = {
    membership: {
      findFirst: vi.fn(async () => ({
        companyId: "company-1",
        role: h.membershipRole,
        status: "ACTIVE",
        joinedAt: new Date(0),
      })),
    },
    invoice: {
      findFirst: vi.fn(
        async ({ where }: { where: { id?: string; companyId?: string } }) => {
          if (
            where.id === state.invoice.id &&
            where.companyId === state.invoice.companyId
          ) {
            return {
              ...state.invoice,
              freelancer: { email: "f@x.dev" },
              company: { name: "Acme" },
            };
          }
          return null;
        },
      ),
      findUniqueOrThrow: vi.fn(async () => ({
        ...state.invoice,
        freelancer: { email: "f@x.dev" },
        company: { name: "Acme" },
      })),
      updateMany: vi.fn(
        async (args: {
          where: Record<string, unknown>;
          data: Record<string, unknown>;
        }) => {
          state.updateManyCalls.push(args);
          const w = args.where as { id?: string; status?: string };
          if (
            w.id === state.invoice.id &&
            (!w.status || w.status === state.invoice.status)
          ) {
            state.invoice = { ...state.invoice, ...args.data };
            return { count: 1 };
          }
          return { count: 0 };
        },
      ),
    },
    auditLog: { create: vi.fn(async () => ({})) },
    $transaction: vi.fn(async (fn: (tx: typeof prisma) => Promise<unknown>) =>
      fn(prisma),
    ),
  };
  return { prisma, state };
}

async function buildCaller() {
  const { invoiceRouter } = await import("../lib/trpc/routers/invoice");
  const { createCaller } = await import("../lib/trpc/server");
  return createCaller(invoiceRouter)({
    session: { user: { id: "user-1" }, expires: "" },
  } as never);
}

describe("invoice router (caller-level)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("allows FINANCE to send a DRAFT invoice and claims the transition", async () => {
    h.membershipRole = "FINANCE";
    const { prisma, state } = makeFakePrisma();
    h.prisma = prisma;

    const caller = await buildCaller();
    const result = await caller.send({ id: "inv-1" });

    expect(result.status).toBe("SENT");
    expect(state.updateManyCalls[0]?.where).toMatchObject({
      id: "inv-1",
      companyId: "company-1",
      status: "DRAFT",
    });
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it("rejects VIEWER for send with FORBIDDEN before touching the database", async () => {
    h.membershipRole = "VIEWER";
    const { prisma } = makeFakePrisma();
    h.prisma = prisma;

    const caller = await buildCaller();
    await expect(caller.send({ id: "inv-1" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(prisma.invoice.findFirst).not.toHaveBeenCalled();
  });

  it("rejects send for an invoice of another company (tenancy)", async () => {
    h.membershipRole = "FINANCE";
    const { state } = makeFakePrisma({ companyId: "company-OTHER" });
    h.prisma = makeFakePrisma().prisma; // membership stays company-1
    // point the findFirst mock at the OTHER-company invoice state
    h.prisma.invoice.findFirst.mockImplementation(async ({ where }) =>
      where.id === "inv-1" && where.companyId === "company-1"
        ? null
        : {
            ...state.invoice,
            freelancer: { email: "f@x.dev" },
            company: { name: "Acme" },
          },
    );

    const caller = await buildCaller();
    await expect(caller.send({ id: "inv-1" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("returns CONFLICT when the status changed concurrently", async () => {
    h.membershipRole = "ADMIN";
    const { prisma } = makeFakePrisma();
    prisma.invoice.updateMany.mockResolvedValueOnce({ count: 0 });
    h.prisma = prisma;

    const caller = await buildCaller();
    await expect(caller.send({ id: "inv-1" })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("rejects an invalid status filter with BAD_REQUEST, not a 500", async () => {
    h.membershipRole = "VIEWER";
    const { prisma } = makeFakePrisma();
    h.prisma = prisma;

    const caller = await buildCaller();
    await expect(
      caller.list({ page: 1, limit: 10, status: "NOT_A_STATUS" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
