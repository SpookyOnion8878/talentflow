import { describe, it, expect } from "vitest";
import { MockProvider } from "../src/providers/mock";
import { buildChunks } from "../src/rag/chunks";

const mockPrisma = (overrides: Record<string, unknown> = {}) => {
  const data = {
    freelancer: {
      findMany: async () => [
        {
          id: "f1",
          firstName: "Alice",
          lastName: "Johnson",
          skills: ["react", "typescript"],
          country: "UK",
          currency: "GBP",
          status: "ACTIVE",
          notes: null,
        },
      ],
    },
    project: {
      findMany: async () => [
        {
          id: "p1",
          name: "Security Audit",
          description: "Annual security audit",
          status: "ACTIVE",
          budget: 5000,
          currency: "USD",
        },
      ],
    },
    invoice: {
      findMany: async () => [
        {
          id: "i1",
          invoiceNo: "INV-2026-001",
          amount: 1900,
          totalAmount: 1900,
          currency: "EUR",
          status: "OVERDUE",
          dueDate: new Date("2026-07-28"),
          notes: null,
          freelancer: { firstName: "Bob", lastName: "Wilson" },
        },
      ],
    },
    complianceRecord: {
      findMany: async () => [
        {
          id: "c1",
          type: "INSURANCE",
          title: "Professional Liability Insurance",
          status: "VERIFIED",
          expiryDate: new Date("2026-08-18"),
          freelancer: { firstName: "Maria", lastName: "Garcia" },
        },
      ],
    },
    ...overrides,
  };
  return data as never;
};

describe("rag: buildChunks", () => {
  it("builds one chunk per entity with English content", async () => {
    const chunks = await buildChunks(mockPrisma(), "acme");
    expect(chunks).toHaveLength(4);

    const types = chunks.map((c) => c.entityType).sort();
    expect(types).toEqual(["COMPLIANCE", "FREELANCER", "INVOICE", "PROJECT"]);

    const invoice = chunks.find((c) => c.entityType === "INVOICE")!;
    expect(invoice.entityId).toBe("i1");
    expect(invoice.content).toContain("INV-2026-001");
    expect(invoice.content).toContain("OVERDUE");

    const compliance = chunks.find((c) => c.entityType === "COMPLIANCE")!;
    expect(compliance.content).toContain("INSURANCE");
    expect(compliance.content).toContain("Maria Garcia");
  });
});

describe("rag: MockProvider.embed (deterministic, $0)", () => {
  it("returns same vector for same text and normalized length", async () => {
    const p = new MockProvider([]);
    const a = await p.embed("insurance document");
    const b = await p.embed("insurance document");
    expect(a).toEqual(b);
    expect(a).toHaveLength(768);
    const norm = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it("gives higher similarity for lexically related texts", async () => {
    const p = new MockProvider([]);
    const [doc, sameTopic, unrelated] = await Promise.all([
      p.embed("professional liability insurance policy"),
      p.embed("insurance expiry reminder"),
      p.embed("website redesign landing page"),
    ]);
    const dot = (x: number[], y: number[]) =>
      x.reduce((s, v, i) => s + v * y[i], 0);
    expect(dot(doc, sameTopic)).toBeGreaterThan(dot(doc, unrelated));
  });
});
