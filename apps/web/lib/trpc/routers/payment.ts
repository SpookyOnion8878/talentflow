import { z } from "zod";
import { router, protectedProcedure, requireRole, audit } from "../server";
import { paymentSchema, paginationSchema } from "@repo/validators";
import {
  Prisma,
  canTransition,
  decimalToNumber,
  invoiceTransitions,
  PaymentStatus,
} from "@repo/db";
import { TRPCError } from "@trpc/server";
import { freelancerPublicSelect } from "../../freelancer-access";
import { withSerializableTransaction } from "../../domain/transactions";
import {
  PaymentApplicationError,
  calculatePaymentApplication,
} from "../../domain/payments";

const financeGuard = requireRole("OWNER", "ADMIN", "FINANCE");

export const paymentRouter = router({
  list: protectedProcedure
    .input(paginationSchema.extend({ status: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const skip = (input.page - 1) * input.limit;
      const where: Prisma.PaymentWhereInput = {
        invoice: { companyId: ctx.companyId },
      };
      if (input.status && input.status !== "ALL") {
        const parsed = z.nativeEnum(PaymentStatus).safeParse(input.status);
        if (!parsed.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid $PaymentStatus filter`,
          });
        }
        where.status = parsed.data;
      }

      const [data, total, summaryGroups, totalCount] = await Promise.all([
        ctx.prisma.payment.findMany({
          where,
          skip,
          take: input.limit,
          orderBy: { createdAt: "desc" },
          include: {
            invoice: {
              include: { freelancer: { select: freelancerPublicSelect } },
            },
          },
        }),
        ctx.prisma.payment.count({ where }),
        ctx.prisma.payment.groupBy({
          by: ["currency", "status"],
          where: { invoice: { companyId: ctx.companyId } },
          _sum: { amount: true },
        }),
        ctx.prisma.payment.count({
          where: { invoice: { companyId: ctx.companyId } },
        }),
      ]);

      const processedByCurrency: Record<string, number> = {};
      const pendingByCurrency: Record<string, number> = {};
      for (const group of summaryGroups) {
        const amount = decimalToNumber(group._sum.amount ?? 0);
        if (group.status === "COMPLETED") {
          processedByCurrency[group.currency] =
            (processedByCurrency[group.currency] ?? 0) + amount;
        } else if (
          group.status === "PENDING" ||
          group.status === "PROCESSING"
        ) {
          pendingByCurrency[group.currency] =
            (pendingByCurrency[group.currency] ?? 0) + amount;
        }
      }

      return {
        data: data.map((payment) => ({
          ...payment,
          amount: decimalToNumber(payment.amount),
          invoice: {
            ...payment.invoice,
            amount: decimalToNumber(payment.invoice.amount),
            taxAmount: decimalToNumber(payment.invoice.taxAmount),
            totalAmount: decimalToNumber(payment.invoice.totalAmount),
            taxRate: decimalToNumber(payment.invoice.taxRate),
          },
        })),
        meta: {
          page: input.page,
          limit: input.limit,
          total,
          totalPages: Math.ceil(total / input.limit),
        },
        summary: {
          processedByCurrency,
          pendingByCurrency,
          totalCount,
        },
      };
    }),

  record: protectedProcedure
    .use(financeGuard)
    .input(paymentSchema)
    .mutation(async ({ input, ctx }) => {
      const payment = await withSerializableTransaction(
        ctx.prisma,
        async (transaction) => {
          const invoice = await transaction.invoice.findFirst({
            where: { id: input.invoiceId, companyId: ctx.companyId },
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
          let application: ReturnType<typeof calculatePaymentApplication>;
          try {
            application = calculatePaymentApplication({
              invoiceStatus: invoice.status,
              invoiceCurrency: invoice.currency,
              paymentCurrency: input.currency,
              invoiceTotal: invoice.totalAmount,
              completedPayments: invoice.payments.map((entry) => entry.amount),
              requestedAmount: input.amount,
            });
          } catch (error) {
            if (error instanceof PaymentApplicationError) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: error.message,
              });
            }
            throw error;
          }
          const { amount, remaining } = application;

          const created = await transaction.payment.create({
            data: {
              invoiceId: input.invoiceId,
              amount,
              currency: input.currency,
              method: input.method,
              reference: input.reference,
              notes: input.notes,
              status: "COMPLETED",
              processedAt: new Date(),
            },
          });
          if (application.settlesInvoice) {
            if (!canTransition(invoiceTransitions, invoice.status, "PAID")) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Invoice cannot transition from ${invoice.status} to PAID`,
              });
            }
            const claimed = await transaction.invoice.updateMany({
              where: {
                id: input.invoiceId,
                companyId: ctx.companyId,
                status: invoice.status,
              },
              data: { status: "PAID", paidAt: new Date() },
            });
            if (claimed.count !== 1) {
              throw new TRPCError({
                code: "CONFLICT",
                message: "Invoice status changed during payment processing",
              });
            }
          }

          await audit(transaction, {
            companyId: ctx.companyId,
            userId: ctx.userId,
            action: "PAYMENT_RECORDED",
            entity: "Payment",
            entityId: created.id,
            metadata: {
              invoiceId: input.invoiceId,
              amount: amount.toFixed(4),
              remaining: remaining.toFixed(4),
              method: input.method,
            },
          });
          return created;
        },
      );

      return { ...payment, amount: decimalToNumber(payment.amount) };
    }),
});
