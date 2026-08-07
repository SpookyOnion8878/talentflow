import { z } from "zod";
import { router, protectedProcedure, requireRole, audit } from "../server";
import { freelancerSchema, paginationSchema } from "@repo/validators";
import { Prisma } from "@repo/db";
import type { FreelancerStatus } from "@repo/db";
import { TRPCError } from "@trpc/server";

const roleGuard = requireRole("OWNER", "ADMIN", "MANAGER");

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
        data,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    }),

  getById: protectedProcedure
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
      return freelancer;
    }),

  create: protectedProcedure
    .input(freelancerSchema)
    .mutation(async ({ input, ctx }) => {
      const freelancer = await ctx.prisma.freelancer.create({
        data: { ...input, companyId: ctx.companyId },
      });

      await audit(ctx.prisma, {
        companyId: ctx.companyId,
        userId: ctx.userId,
        action: "FREELANCER_CREATED",
        entity: "Freelancer",
        entityId: freelancer.id,
        metadata: { name: `${freelancer.firstName} ${freelancer.lastName}` },
      });

      return freelancer;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), data: freelancerSchema.partial() }))
    .mutation(async ({ input, ctx }) => {
      const existing = await ctx.prisma.freelancer.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      const freelancer = await ctx.prisma.freelancer.update({
        where: { id: input.id },
        data: input.data,
      });

      await audit(ctx.prisma, {
        companyId: ctx.companyId,
        userId: ctx.userId,
        action: "FREELANCER_UPDATED",
        entity: "Freelancer",
        entityId: freelancer.id,
      });

      return freelancer;
    }),

  delete: protectedProcedure
    .use(roleGuard)
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const existing = await ctx.prisma.freelancer.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.prisma.freelancer.delete({ where: { id: input.id } });

      await audit(ctx.prisma, {
        companyId: ctx.companyId,
        userId: ctx.userId,
        action: "FREELANCER_DELETED",
        entity: "Freelancer",
        entityId: input.id,
        metadata: { name: `${existing.firstName} ${existing.lastName}` },
      });

      return { success: true };
    }),
});
