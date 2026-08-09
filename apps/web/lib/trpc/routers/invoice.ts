import { z } from "zod";
import { router, protectedProcedure, requireRole, audit } from "../server";
import { invoiceSchema, paginationSchema } from "@repo/validators";
import { Prisma } from "@repo/db";
import type { InvoiceStatus } from "@repo/db";
import { TRPCError } from "@trpc/server";
import { generateInvoiceNumber } from "@repo/utils";
import { enqueueAgentJob } from "@repo/agents";

const financeGuard = requireRole("OWNER", "ADMIN", "FINANCE");

export const invoiceRouter = router({
  list: protectedProcedure
    .input(paginationSchema.extend({ status: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const skip = (input.page - 1) * input.limit;
      const where: Prisma.InvoiceWhereInput = { companyId: ctx.companyId };
      if (input.status && input.status !== "ALL")
        where.status = input.status as InvoiceStatus;

      const [data, total] = await Promise.all([
        ctx.prisma.invoice.findMany({
          where,
          skip,
          take: input.limit,
          orderBy: { createdAt: "desc" },
          include: { freelancer: true, contract: true, payment: true },
        }),
        ctx.prisma.invoice.count({ where }),
      ]);

      // Summary
      const allInvoices = await ctx.prisma.invoice.findMany({
        where: { companyId: ctx.companyId },
      });
      const totalOutstanding = allInvoices
        .filter((i) => ["SENT", "VIEWED", "OVERDUE"].includes(i.status))
        .reduce((sum, i) => sum + i.totalAmount, 0);
      const totalPaid = allInvoices
        .filter((i) => i.status === "PAID")
        .reduce((sum, i) => sum + i.totalAmount, 0);
      const totalOverdue = allInvoices
        .filter((i) => i.status === "OVERDUE")
        .reduce((sum, i) => sum + i.totalAmount, 0);
      const totalDraft = allInvoices
        .filter((i) => i.status === "DRAFT")
        .reduce((sum, i) => sum + i.totalAmount, 0);

      return {
        data,
        meta: {
          page: input.page,
          limit: input.limit,
          total,
          totalPages: Math.ceil(total / input.limit),
        },
        summary: {
          totalOutstanding,
          totalPaid,
          totalOverdue,
          totalDraft,
          totalCount: allInvoices.length,
        },
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const invoice = await ctx.prisma.invoice.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: { freelancer: true, contract: true, payment: true },
      });
      if (!invoice)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      return invoice;
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

      const subtotal = input.items.reduce((sum, item) => sum + item.amount, 0);
      const tax = subtotal * 0.11;

      const invoice = await ctx.prisma.invoice.create({
        data: {
          invoiceNo: generateInvoiceNumber(),
          companyId: ctx.companyId,
          freelancerId: input.freelancerId,
          contractId: input.contractId,
          amount: subtotal,
          taxAmount: tax,
          totalAmount: subtotal + tax,
          currency: input.currency,
          dueDate: input.dueDate,
          notes: input.notes,
          items: input.items as Prisma.InputJsonValue,
          status: "DRAFT",
        },
      });

      await audit(ctx.prisma, {
        companyId: ctx.companyId,
        userId: ctx.userId,
        action: "INVOICE_CREATED",
        entity: "Invoice",
        entityId: invoice.id,
        metadata: { invoiceNo: invoice.invoiceNo, amount: invoice.totalAmount },
      });

      try {
        await enqueueAgentJob(ctx.prisma, {
          companyId: ctx.companyId,
          agentType: "BILLING",
          triggerType: "INVOICE_STATUS_CHANGED",
        });
      } catch (err) {
        console.error("[agents] enqueue INVOICE_STATUS_CHANGED gagal", err);
      }

      return invoice;
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

      const updated = await ctx.prisma.invoice.update({
        where: { id: input.id },
        data: { status: "SENT" },
      });

      await audit(ctx.prisma, {
        companyId: ctx.companyId,
        userId: ctx.userId,
        action: "INVOICE_SENT",
        entity: "Invoice",
        entityId: input.id,
        metadata: { invoiceNo: invoice.invoiceNo },
      });

      return updated;
    }),

  markAsPaid: protectedProcedure
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
      if (invoice.status === "PAID") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invoice is already paid",
        });
      }

      const paid = await ctx.prisma.$transaction([
        ctx.prisma.invoice.update({
          where: { id: input.id },
          data: { status: "PAID", paidAt: new Date() },
        }),
        ctx.prisma.payment.upsert({
          where: { invoiceId: input.id },
          update: { status: "COMPLETED", processedAt: new Date() },
          create: {
            invoiceId: input.id,
            amount: invoice.totalAmount,
            currency: invoice.currency,
            method: "BANK_TRANSFER",
            status: "COMPLETED",
            processedAt: new Date(),
          },
        }),
      ]);

      await audit(ctx.prisma, {
        companyId: ctx.companyId,
        userId: ctx.userId,
        action: "INVOICE_PAID",
        entity: "Invoice",
        entityId: input.id,
        metadata: { invoiceNo: invoice.invoiceNo, amount: invoice.totalAmount },
      });

      return paid[0];
    }),

  cancel: protectedProcedure
    .use(financeGuard)
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const invoice = await ctx.prisma.invoice.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!invoice) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.prisma.invoice.update({
        where: { id: input.id },
        data: { status: "CANCELLED" },
      });
    }),
});
