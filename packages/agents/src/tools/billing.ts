import { z } from "zod";
import { Prisma } from "@repo/db";
import type { ToolContext, ToolDef } from "../types";
import { sendAgentEmail } from "../email";

// ─── Perhitungan deterministik (LLM tidak pernah menghitung) ────────

export interface InvoiceMathInput {
  hours: number;
  ratePerHour: number;
  taxRate?: number;
}

export interface InvoiceMath {
  hours: number;
  rate: number;
  amount: number;
  tax: number;
  total: number;
  currency: string;
}

export function calcInvoice(
  input: InvoiceMathInput & { currency: string },
): InvoiceMath {
  const amount = Math.round(input.hours * input.ratePerHour * 100) / 100;
  const tax = Math.round(amount * (input.taxRate ?? 0) * 100) / 100;
  return {
    hours: input.hours,
    rate: input.ratePerHour,
    amount,
    tax,
    total: Math.round((amount + tax) * 100) / 100,
    currency: input.currency,
  };
}

/** Nomor invoice deterministik: INV-<year>-<counter> */
export function buildInvoiceNo(year: number, counter: number): string {
  return `INV-${year}-${String(counter).padStart(3, "0")}`;
}

export async function nextInvoiceNo(
  ctx: ToolContext,
  _input: unknown,
): Promise<string> {
  const year = new Date().getFullYear();
  const count = await ctx.prisma.invoice.count({
    where: { invoiceNo: { startsWith: `INV-${year}-` } },
  });
  return buildInvoiceNo(year, count + 1);
}

// ─── Tool definitions ──────────────────────────────────────────────

const periodSchema = z.object({
  periodStart: z.string(),
  periodEnd: z.string(),
});

const invoiceDraftSchema = z.object({
  freelancerId: z.string(),
  contractId: z.string().optional(),
  periodStart: z.string(),
  periodEnd: z.string(),
  hours: z.number().min(0),
  rate: z.number().min(0),
  amount: z.number().min(0),
  taxAmount: z.number().min(0).optional(),
  totalAmount: z.number().min(0),
  currency: z.string(),
  items: z.array(z.record(z.string(), z.any())).optional(),
  notes: z.string().optional(),
});

export const billingTools: ToolDef[] = [
  {
    name: "getApprovedTimesheets",
    description:
      "Fetches approved timesheets in a period as the basis for draft invoices.",
    inputSchema: periodSchema as z.ZodType<unknown>,
    defaultMode: "AUTO",
    permission: ["SYSTEM"],
    execute: async (ctx, input) => {
      const p = input as z.infer<typeof periodSchema>;
      const rows = await ctx.prisma.timesheet.findMany({
        where: {
          status: "APPROVED",
          date: { gte: new Date(p.periodStart), lte: new Date(p.periodEnd) },
          freelancer: { companyId: ctx.companyId },
        },
        select: {
          id: true,
          date: true,
          hours: true,
          freelancer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              currency: true,
            },
          },
          contract: {
            select: {
              id: true,
              contractNo: true,
              ratePerHour: true,
              currency: true,
            },
          },
        },
      });
      return { count: rows.length, rows };
    },
  },
  {
    name: "createDraftInvoice",
    description:
      "Creates a draft invoice for one freelancer from hours x rate. Financial tool — defaults to PROPOSE, needs approval.",
    inputSchema: invoiceDraftSchema as z.ZodType<unknown>,
    defaultMode: "PROPOSE",
    permission: ["SYSTEM", "OWNER", "ADMIN", "FINANCE"],
    monetary: (input) =>
      (input as z.infer<typeof invoiceDraftSchema>).amount ?? null,
    idempotencyKey: (ctx, input) => {
      const i = input as z.infer<typeof invoiceDraftSchema>;
      return Promise.resolve(
        `${ctx.companyId}:invoice:${i.periodStart}:${i.freelancerId}:${i.contractId ?? "none"}`,
      );
    },
    execute: async (ctx, input) => {
      const i = input as z.infer<typeof invoiceDraftSchema>;
      const invoiceNo = await nextInvoiceNo(ctx, input);
      const invoice = await ctx.prisma.invoice.create({
        data: {
          invoiceNo,
          companyId: ctx.companyId,
          freelancerId: i.freelancerId,
          contractId: i.contractId ?? null,
          amount: i.amount,
          taxAmount: i.taxAmount ?? 0,
          totalAmount: i.totalAmount,
          currency: i.currency ?? "USD",
          status: "DRAFT",
          dueDate: new Date(Date.now() + 14 * 86400000),
          items: (i.items ?? []) as unknown as Prisma.InputJsonValue,
          notes: i.notes,
        },
      });
      return {
        invoiceId: invoice.id,
        invoiceNo,
        totalAmount: i.totalAmount,
      };
    },
  },
  {
    name: "getUnpaidInvoices",
    description:
      "Fetches unpaid invoices (SENT/VIEWED/OVERDUE) as the basis for reminders.",
    inputSchema: z.object({}),
    defaultMode: "AUTO",
    permission: ["SYSTEM"],
    execute: async (ctx) => {
      const rows = await ctx.prisma.invoice.findMany({
        where: {
          companyId: ctx.companyId,
          status: { in: ["SENT", "VIEWED", "OVERDUE"] },
        },
        select: {
          id: true,
          invoiceNo: true,
          amount: true,
          currency: true,
          status: true,
          dueDate: true,
          freelancer: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });
      return { count: rows.length, rows };
    },
  },
  {
    name: "sendInvoiceReminder",
    description:
      "Sends a payment reminder for unpaid invoices (tier 1/2/3). Non-financial, AUTO. Can be proposed via chat.",
    inputSchema: z.object({
      invoiceId: z.string(),
      tier: z.number().min(1).max(3),
    }),
    defaultMode: "AUTO",
    permission: ["SYSTEM", "OWNER", "ADMIN", "FINANCE"],
    idempotencyKey: (ctx, input) => {
      const i = input as { invoiceId: string; tier: number };
      return Promise.resolve(
        `${ctx.companyId}:reminder:${i.invoiceId}:${i.tier}`,
      );
    },
    execute: async (ctx, input) => {
      const i = input as { invoiceId: string; tier: number };
      const invoice = await ctx.prisma.invoice.findFirst({
        where: { id: i.invoiceId, companyId: ctx.companyId },
        include: { freelancer: { select: { firstName: true } } },
      });
      if (!invoice) throw new Error(`Invoice ${i.invoiceId} not found`);
      const owner = await findOwner(ctx);
      if (owner) {
        await ctx.prisma.notification.create({
          data: {
            userId: owner,
            title: `Invoice ${invoice.invoiceNo} unpaid (tier ${i.tier})`,
            message: `Invoice unpaid; reminder level ${i.tier}.`,
            type: "INVOICE",
            metadata: {
              invoiceId: invoice.id,
              tier: i.tier,
              actorType: "AGENT",
            },
          },
        });
      }
      const sent = await sendAgentEmail({
        ctx,
        kind: "invoice-reminder",
        subject: `Invoice ${invoice.invoiceNo} — reminder tier ${i.tier}`,
        props: {
          invoiceNo: invoice.invoiceNo,
          amount: `${invoice.currency} ${invoice.totalAmount}`,
          dueDate: (invoice.dueDate ?? new Date()).toISOString().slice(0, 10),
          tier: i.tier,
          companyName: "TalentFlow",
          actionUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/invoices`,
        },
      });
      return {
        status: "reminded",
        invoiceNo: invoice.invoiceNo,
        tier: i.tier,
        email: sent.channel,
      };
    },
  },
  {
    name: "getAgingReport",
    description: "Invoice aging summary per bucket 0-30, 31-60, 60+ days.",
    inputSchema: z.object({}),
    defaultMode: "AUTO",
    permission: ["SYSTEM"],
    execute: async (ctx) => {
      const now = Date.now();
      const rows = await ctx.prisma.invoice.findMany({
        where: {
          companyId: ctx.companyId,
          status: { in: ["SENT", "VIEWED", "OVERDUE"] },
        },
        select: { id: true, createdAt: true },
      });
      return rows.map((r) => {
        const ageDays = Math.max(
          0,
          Math.floor((now - r.createdAt.getTime()) / 86400000),
        );
        return {
          id: r.id,
          ageDays,
          bucket: ageDays > 60 ? "60+" : ageDays > 30 ? "31-60" : "0-30",
        };
      });
    },
  },
  {
    name: "sendWeeklySummary",
    description:
      "Weekly DSO & status summary (unpaid, draft, compliance) for finance. Non-financial, AUTO.",
    inputSchema: z.object({}),
    defaultMode: "AUTO",
    permission: ["SYSTEM"],
    idempotencyKey: (ctx) =>
      Promise.resolve(`${ctx.companyId}:weekly-summary:${weekKey()}`),
    execute: async (ctx) => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const [unpaid, overdue, drafts, expiring] = await Promise.all([
        ctx.prisma.invoice.findMany({
          where: {
            companyId: ctx.companyId,
            status: { in: ["SENT", "VIEWED", "OVERDUE"] },
          },
          select: { totalAmount: true, currency: true },
        }),
        ctx.prisma.invoice.count({
          where: { companyId: ctx.companyId, status: "OVERDUE" },
        }),
        ctx.prisma.invoice.count({
          where: { companyId: ctx.companyId, status: "DRAFT" },
        }),
        ctx.prisma.complianceRecord.count({
          where: {
            freelancer: { companyId: ctx.companyId },
            status: "VERIFIED",
            expiryDate: {
              lte: new Date(Date.now() + 30 * 86400000),
              gte: new Date(),
            },
          },
        }),
      ]);
      const totalOutstanding = unpaid.reduce((s, u) => s + u.totalAmount, 0);
      const currency = unpaid[0]?.currency ?? "USD";

      const sent = await sendAgentEmail({
        ctx,
        kind: "weekly-summary",
        subject: `Weekly summary — ${weekKey()}`,
        props: {
          companyName: "TalentFlow",
          totalOutstanding: `${currency} ${totalOutstanding.toLocaleString("en-US")}`,
          unpaidCount: unpaid.length,
          overdueCount: overdue,
          expiringCount: expiring,
          draftCount: drafts,
          actionUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard`,
        },
      });
      return {
        status: "sent",
        totalOutstanding,
        unpaidCount: unpaid.length,
        channel: sent.channel,
      };
    },
  },
];

function weekKey(): string {
  const base = new Date();
  const day = (base.getDay() + 6) % 7;
  const monday = new Date(base);
  monday.setDate(base.getDate() - day);
  return monday.toISOString().slice(0, 10);
}

async function findOwner(ctx: ToolContext): Promise<string | null> {
  const m = await ctx.prisma.membership.findFirst({
    where: { companyId: ctx.companyId, role: "OWNER", status: "ACTIVE" },
    select: { userId: true },
  });
  return m?.userId ?? null;
}
