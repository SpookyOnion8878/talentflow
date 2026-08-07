import { z } from "zod";
import { router, protectedProcedure, requireRole, audit } from "../server";
import { paymentSchema, paginationSchema } from "@repo/validators";
import { Prisma } from "@repo/db";
import type { PaymentStatus } from "@repo/db";
import { TRPCError } from "@trpc/server";

const financeGuard = requireRole("OWNER", "ADMIN", "FINANCE");

export const paymentRouter = router({
  list: protectedProcedure
    .input(paginationSchema.extend({ status: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const skip = (input.page - 1) * input.limit;
      const where: Prisma.PaymentWhereInput = {
        invoice: { companyId: ctx.companyId },
      };
      if (input.status && input.status !== "ALL")
        where.status = input.status as PaymentStatus;

      const [data, total] = await Promise.all([
        ctx.prisma.payment.findMany({
          where,
          skip,
          take: input.limit,
          orderBy: { createdAt: "desc" },
          include: {
            invoice: { include: { freelancer: true } },
          },
        }),
        ctx.prisma.payment.count({ where }),
      ]);

      // Summary
      const allPayments = await ctx.prisma.payment.findMany({
        where: { invoice: { companyId: ctx.companyId } },
      });
      const processedByCurrency: Record<string, number> = {};
      const pendingByCurrency: Record<string, number> = {};
      for (const p of allPayments) {
        if (p.status === "COMPLETED") {
          processedByCurrency[p.currency] =
            (processedByCurrency[p.currency] ?? 0) + p.amount;
        } else if (p.status === "PENDING" || p.status === "PROCESSING") {
          pendingByCurrency[p.currency] =
            (pendingByCurrency[p.currency] ?? 0) + p.amount;
        }
      }

      return {
        data,
        meta: {
          page: input.page,
          limit: input.limit,
          total,
          totalPages: Math.ceil(total / input.limit),
        },
        summary: {
          processedByCurrency,
          pendingByCurrency,
          totalCount: allPayments.length,
        },
      };
    }),

  record: protectedProcedure
    .use(financeGuard)
    .input(paymentSchema)
    .mutation(async ({ input, ctx }) => {
      const invoice = await ctx.prisma.invoice.findFirst({
        where: { id: input.invoiceId, companyId: ctx.companyId },
      });
      if (!invoice)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      if (input.amount > invoice.totalAmount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Payment amount exceeds invoice total",
        });
      }

      const { invoiceId, ...data } = input;
      const [payment] = await ctx.prisma.$transaction([
        ctx.prisma.payment.upsert({
          where: { invoiceId },
          update: { ...data, status: "COMPLETED", processedAt: new Date() },
          create: {
            ...data,
            invoiceId,
            status: "COMPLETED",
            processedAt: new Date(),
          },
        }),
        ctx.prisma.invoice.update({
          where: { id: invoiceId },
          data: { status: "PAID", paidAt: new Date() },
        }),
      ]);

      await audit(ctx.prisma, {
        companyId: ctx.companyId,
        userId: ctx.userId,
        action: "PAYMENT_RECORDED",
        entity: "Payment",
        entityId: payment.id,
        metadata: { invoiceId, amount: input.amount, method: input.method },
      });

      return payment;
    }),
});
