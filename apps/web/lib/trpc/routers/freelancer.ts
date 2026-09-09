import { z } from "zod";
import { router, protectedProcedure, requireRole, audit } from "../server";
import { freelancerSchema, paginationSchema } from "@repo/validators";
import { Prisma, decimalToNumber } from "@repo/db";
import type { FreelancerStatus } from "@repo/db";
import { TRPCError } from "@trpc/server";
import {
  hasRestrictedFinancialMutation,
  redactFreelancerSensitiveFields,
} from "../../freelancer-access";

const roleGuard = requireRole("OWNER", "ADMIN", "MANAGER");
const detailGuard = requireRole("OWNER", "ADMIN", "MANAGER", "FINANCE");

export const freelancerRouter = router({
  list: protectedProcedure
    .input(paginationSchema.extend({ status: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const { page, limit, search, status, sortBy, sortOrder } = input;
      const skip = (page - 1) * limit;

      const where: Prisma.FreelancerWhereInput = { companyId: ctx.companyId };
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ];
      }
      if (status && status !== "ALL") where.status = status as FreelancerStatus;

      const [data, total] = await Promise.all([
        ctx.prisma.freelancer.findMany({
          where,
          skip,
          take: limit,
          orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: "desc" },
          include: {
            _count: {
              select: { contracts: true, timesheets: true, invoices: true },
            },
            projectAssignments: {
              include: { project: { select: { id: true, name: true } } },
            },
          },
        }),
        ctx.prisma.freelancer.count({ where }),
      ]);

      return {
        data: data.map((freelancer) =>
          redactFreelancerSensitiveFields(freelancer, ctx.membership.role),
        ),
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    }),

  getById: protectedProcedure
    .use(detailGuard)
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const freelancer = await ctx.prisma.freelancer.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          contracts: {
            orderBy: { createdAt: "desc" },
            include: { project: { select: { id: true, name: true } } },
          },
          projectAssignments: { include: { project: true } },
          timesheets: {
            orderBy: { date: "desc" },
            take: 10,
            include: { project: { select: { id: true, name: true } } },
          },
          invoices: { orderBy: { createdAt: "desc" }, take: 5 },
          complianceRecords: { orderBy: { createdAt: "desc" } },
        },
      });

      if (!freelancer)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Freelancer not found",
        });
      return redactFreelancerSensitiveFields(
        {
          ...freelancer,
          contracts: freelancer.contracts.map((contract) => ({
            ...contract,
            ratePerHour: decimalToNumber(contract.ratePerHour),
          })),
          invoices: freelancer.invoices.map((invoice) => ({
            ...invoice,
            amount: decimalToNumber(invoice.amount),
            taxAmount: decimalToNumber(invoice.taxAmount),
            totalAmount: decimalToNumber(invoice.totalAmount),
            taxRate: decimalToNumber(invoice.taxRate),
          })),
        },
        ctx.membership.role,
      );
    }),

  create: protectedProcedure
    .use(roleGuard)
    .input(freelancerSchema)
    .mutation(async ({ input, ctx }) => {
      if (hasRestrictedFinancialMutation(ctx.membership.role, input)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and administrators can set financial PII",
        });
      }

      const freelancer = await ctx.prisma.$transaction(async (transaction) => {
        const created = await transaction.freelancer.create({
          data: { ...input, companyId: ctx.companyId },
        });
        await audit(transaction, {
          companyId: ctx.companyId,
          userId: ctx.userId,
          action: "FREELANCER_CREATED",
          entity: "Freelancer",
          entityId: created.id,
          metadata: { name: `${created.firstName} ${created.lastName}` },
        });
        return created;
      });

      return redactFreelancerSensitiveFields(freelancer, ctx.membership.role);
    }),

  update: protectedProcedure
    .use(roleGuard)
    .input(z.object({ id: z.string(), data: freelancerSchema.partial() }))
    .mutation(async ({ input, ctx }) => {
      if (hasRestrictedFinancialMutation(ctx.membership.role, input.data)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and administrators can change financial PII",
        });
      }

      const freelancer = await ctx.prisma.$transaction(async (transaction) => {
        const existing = await transaction.freelancer.findFirst({
          where: { id: input.id, companyId: ctx.companyId },
        });
        if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

        const updated = await transaction.freelancer.update({
          where: { id: input.id },
          data: input.data,
        });
        await audit(transaction, {
          companyId: ctx.companyId,
          userId: ctx.userId,
          action: "FREELANCER_UPDATED",
          entity: "Freelancer",
          entityId: updated.id,
        });
        return updated;
      });

      return redactFreelancerSensitiveFields(freelancer, ctx.membership.role);
    }),

  delete: protectedProcedure
    .use(roleGuard)
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.$transaction(async (transaction) => {
        const existing = await transaction.freelancer.findFirst({
          where: { id: input.id, companyId: ctx.companyId },
        });
        if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

        await transaction.freelancer.delete({ where: { id: input.id } });
        await audit(transaction, {
          companyId: ctx.companyId,
          userId: ctx.userId,
          action: "FREELANCER_DELETED",
          entity: "Freelancer",
          entityId: input.id,
          metadata: { name: `${existing.firstName} ${existing.lastName}` },
        });
      });

      return { success: true };
    }),
});
