import { z } from "zod";
import { router, protectedProcedure, requireRole, audit } from "../server";
import { invoiceSchema, paginationSchema } from "@repo/validators";
import {
  Prisma,
  calculateInvoiceAmounts,
  calculateOutstandingBalance,
  canTransition,
  decimalToNumber,
  invoiceTransitions,
} from "@repo/db";
import type { InvoiceStatus } from "@repo/db";
import { TRPCError } from "@trpc/server";
import { generateInvoiceNumber } from "@repo/utils";
import { enqueueAgentJob } from "@repo/agents";
import { freelancerPublicSelect } from "../../freelancer-access";
import { withSerializableTransaction } from "../../domain/transactions";

const financeGuard = requireRole("OWNER", "ADMIN", "FINANCE");

function requireInvoiceTransition(from: string, to: string): void {
  if (!canTransition(invoiceTransitions, from, to)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Invoice cannot transition from ${from} to ${to}`,
    });
  }
}

function serializeInvoiceMoney<
  T extends {
    amount: Prisma.Decimal;
    taxAmount: Prisma.Decimal;
    totalAmount: Prisma.Decimal;
    taxRate: Prisma.Decimal;
  },
>(invoice: T) {
  return {
    ...invoice,
    amount: decimalToNumber(invoice.amount),
    taxAmount: decimalToNumber(invoice.taxAmount),
    totalAmount: decimalToNumber(invoice.totalAmount),
    taxRate: decimalToNumber(invoice.taxRate),
  };
}

export const invoiceRouter = router({
  list: protectedProcedure
    .input(paginationSchema.extend({ status: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const skip = (input.page - 1) * input.limit;
      const where: Prisma.InvoiceWhereInput = { companyId: ctx.companyId };
      if (input.status && input.status !== "ALL")
        where.status = input.status as InvoiceStatus;

      const [data, total, summaryGroups, totalCount] = await Promise.all([
        ctx.prisma.invoice.findMany({
          where,
          skip,
          take: input.limit,
          orderBy: { createdAt: "desc" },
          include: {
            freelancer: { select: freelancerPublicSelect },
            contract: true,
            payments: true,
          },
        }),
        ctx.prisma.invoice.count({ where }),
        ctx.prisma.invoice.groupBy({
          by: ["currency", "status"],
          where: { companyId: ctx.companyId },
          _sum: { totalAmount: true },
          _count: { _all: true },
        }),
        ctx.prisma.invoice.count({ where: { companyId: ctx.companyId } }),
      ]);

      const byCurrency: Record<
        string,
        { outstanding: number; paid: number; overdue: number; draft: number }
      > = {};
      const statusCounts: Record<string, number> = {};
      for (const group of summaryGroups) {
        const summary = (byCurrency[group.currency] ??= {
          outstanding: 0,
          paid: 0,
          overdue: 0,
          draft: 0,
        });
        const amount = decimalToNumber(group._sum.totalAmount ?? 0);
        statusCounts[group.status] =
          (statusCounts[group.status] ?? 0) + group._count._all;
        if (["SENT", "VIEWED", "OVERDUE"].includes(group.status)) {
          summary.outstanding += amount;
        }
        if (group.status === "PAID") summary.paid += amount;
        if (group.status === "OVERDUE") summary.overdue += amount;
        if (group.status === "DRAFT") summary.draft += amount;
      }

      return {
        data: data.map((invoice) => ({
          ...serializeInvoiceMoney(invoice),
          payments: invoice.payments.map((payment) => ({
            ...payment,
            amount: decimalToNumber(payment.amount),
          })),
        })),
        meta: {
          page: input.page,
          limit: input.limit,
          total,
          totalPages: Math.ceil(total / input.limit),
        },
        summary: {
          byCurrency,
          statusCounts,
          totalCount,
        },
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const invoice = await ctx.prisma.invoice.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          freelancer: { select: freelancerPublicSelect },
          contract: true,
          payments: true,
        },
      });
      if (!invoice)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      return {
        ...serializeInvoiceMoney(invoice),
        payments: invoice.payments.map((payment) => ({
          ...payment,
          amount: decimalToNumber(payment.amount),
        })),
      };
    }),

  create: protectedProcedure
    .use(financeGuard)
    .input(invoiceSchema)
    .mutation(async ({ input, ctx }) => {
      const freelancer = await ctx.prisma.freelancer.findFirst({
        where: { id: input.freelancerId, companyId: ctx.companyId },
      });
      if (!freelancer)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Freelancer not found",
        });

      if (input.contractId) {
        const contract = await ctx.prisma.contract.findFirst({
          where: {
            id: input.contractId,
            companyId: ctx.companyId,
            freelancerId: input.freelancerId,
          },
          select: { currency: true },
        });
        if (!contract) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Contract not found for this freelancer",
          });
        }
        if (contract.currency !== input.currency) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invoice currency must match the contract currency",
          });
        }
      }

      const amounts = calculateInvoiceAmounts(input.items);

      const invoice = await ctx.prisma.$transaction(async (transaction) => {
        const created = await transaction.invoice.create({
          data: {
            invoiceNo: generateInvoiceNumber(),
            companyId: ctx.companyId,
            freelancerId: input.freelancerId,
            contractId: input.contractId,
            amount: amounts.subtotal,
            taxAmount: amounts.tax,
            totalAmount: amounts.total,
            taxRate: amounts.taxRate,
            calculationVersion: amounts.calculationVersion,
            currency: input.currency,
            dueDate: input.dueDate,
            notes: input.notes,
            items: amounts.lines as unknown as Prisma.InputJsonValue,
            status: "DRAFT",
          },
        });

        await audit(transaction, {
          companyId: ctx.companyId,
          userId: ctx.userId,
          action: "INVOICE_CREATED",
          entity: "Invoice",
          entityId: created.id,
          metadata: {
            invoiceNo: created.invoiceNo,
            amount: created.totalAmount.toFixed(4),
            calculationVersion: created.calculationVersion,
          },
        });
        return created;
      });

      try {
        await enqueueAgentJob(ctx.prisma, {
          companyId: ctx.companyId,
          agentType: "BILLING",
          triggerType: "INVOICE_STATUS_CHANGED",
        });
      } catch (err) {
        console.error("[agents] failed to enqueue INVOICE_STATUS_CHANGED", err);
      }

      return serializeInvoiceMoney(invoice);
    }),

  send: protectedProcedure
    .use(financeGuard)
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const invoice = await ctx.prisma.invoice.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!invoice)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });

      requireInvoiceTransition(invoice.status, "SENT");
      const updated = await ctx.prisma.$transaction(async (transaction) => {
        const claimed = await transaction.invoice.updateMany({
          where: {
            id: input.id,
            companyId: ctx.companyId,
            status: invoice.status,
          },
          data: { status: "SENT" },
        });
        if (claimed.count !== 1) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Invoice status changed during this request",
          });
        }
        await audit(transaction, {
          companyId: ctx.companyId,
          userId: ctx.userId,
          action: "INVOICE_SENT",
          entity: "Invoice",
          entityId: input.id,
          metadata: { invoiceNo: invoice.invoiceNo },
        });
        return transaction.invoice.findUniqueOrThrow({
          where: { id: input.id },
        });
      });

      return serializeInvoiceMoney(updated);
    }),

  markAsPaid: protectedProcedure
    .use(financeGuard)
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const paid = await withSerializableTransaction(
        ctx.prisma,
        async (transaction) => {
          const invoice = await transaction.invoice.findFirst({
            where: { id: input.id, companyId: ctx.companyId },
            include: {
              payments: {
                where: { status: "COMPLETED" },
                select: { amount: true },
              },
            },
          });
          if (!invoice) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Invoice not found",
            });
          }
          requireInvoiceTransition(invoice.status, "PAID");
          const outstanding = calculateOutstandingBalance(
            invoice.totalAmount,
            invoice.payments.map((payment) => payment.amount),
          );
          if (outstanding.isZero()) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Invoice balance is already settled",
            });
          }

          const payment = await transaction.payment.create({
            data: {
              invoiceId: input.id,
              amount: outstanding,
              currency: invoice.currency,
              method: "BANK_TRANSFER",
              status: "COMPLETED",
              processedAt: new Date(),
              notes: "Manual settlement from invoice action",
            },
          });
          const claimed = await transaction.invoice.updateMany({
            where: {
              id: input.id,
              companyId: ctx.companyId,
              status: invoice.status,
            },
            data: { status: "PAID", paidAt: new Date() },
          });
          if (claimed.count !== 1) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Invoice status changed during settlement",
            });
          }
          await audit(transaction, {
            companyId: ctx.companyId,
            userId: ctx.userId,
            action: "INVOICE_PAID",
            entity: "Invoice",
            entityId: input.id,
            metadata: {
              invoiceNo: invoice.invoiceNo,
              paymentId: payment.id,
              amount: outstanding.toFixed(4),
            },
          });
          return transaction.invoice.findUniqueOrThrow({
            where: { id: input.id },
          });
        },
      );

      return serializeInvoiceMoney(paid);
    }),

  cancel: protectedProcedure
    .use(financeGuard)
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const invoice = await ctx.prisma.invoice.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!invoice) throw new TRPCError({ code: "NOT_FOUND" });
      requireInvoiceTransition(invoice.status, "CANCELLED");

      const cancelled = await ctx.prisma.$transaction(async (transaction) => {
        const claimed = await transaction.invoice.updateMany({
          where: {
            id: input.id,
            companyId: ctx.companyId,
            status: invoice.status,
          },
          data: { status: "CANCELLED" },
        });
        if (claimed.count !== 1) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Invoice status changed during this request",
          });
        }
        await audit(transaction, {
          companyId: ctx.companyId,
          userId: ctx.userId,
          action: "INVOICE_CANCELLED",
          entity: "Invoice",
          entityId: input.id,
          metadata: { invoiceNo: invoice.invoiceNo },
        });
        return transaction.invoice.findUniqueOrThrow({
          where: { id: input.id },
        });
      });
      return serializeInvoiceMoney(cancelled);
    }),
});
