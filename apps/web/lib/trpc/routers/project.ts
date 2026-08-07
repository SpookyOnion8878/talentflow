import { z } from "zod";
import { router, protectedProcedure, requireRole, audit } from "../server";
import { projectSchema, paginationSchema } from "@repo/validators";
import { Prisma } from "@repo/db";
import type { ProjectStatus } from "@repo/db";
import { TRPCError } from "@trpc/server";

const roleGuard = requireRole("OWNER", "ADMIN", "MANAGER");

export const projectRouter = router({
  list: protectedProcedure
    .input(paginationSchema.extend({ status: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const skip = (input.page - 1) * input.limit;
      const where: Prisma.ProjectWhereInput = { companyId: ctx.companyId };
      if (input.status && input.status !== "ALL")
        where.status = input.status as ProjectStatus;

      const [data, total] = await Promise.all([
        ctx.prisma.project.findMany({
          where,
          skip,
          take: input.limit,
          orderBy: { createdAt: "desc" },
          include: {
            assignments: {
              include: {
                freelancer: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    avatar: true,
                  },
                },
              },
            },
            _count: { select: { timesheets: true, contracts: true } },
          },
        }),
        ctx.prisma.project.count({ where }),
      ]);

      return {
        data,
        meta: {
          page: input.page,
          limit: input.limit,
          total,
          totalPages: Math.ceil(total / input.limit),
        },
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const project = await ctx.prisma.project.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          assignments: { include: { freelancer: true } },
          contracts: { include: { freelancer: true } },
          timesheets: {
            orderBy: { date: "desc" },
            take: 20,
            include: {
              freelancer: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
      });

      if (!project)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      return project;
    }),

  create: protectedProcedure
    .use(roleGuard)
    .input(projectSchema)
    .mutation(async ({ input, ctx }) => {
      const project = await ctx.prisma.project.create({
        data: { ...input, companyId: ctx.companyId },
      });

      await audit(ctx.prisma, {
        companyId: ctx.companyId,
        userId: ctx.userId,
        action: "PROJECT_CREATED",
        entity: "Project",
        entityId: project.id,
        metadata: { name: project.name },
      });

      return project;
    }),

  update: protectedProcedure
    .use(roleGuard)
    .input(z.object({ id: z.string(), data: projectSchema.partial() }))
    .mutation(async ({ input, ctx }) => {
      const existing = await ctx.prisma.project.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      const project = await ctx.prisma.project.update({
        where: { id: input.id },
        data: input.data,
      });

      await audit(ctx.prisma, {
        companyId: ctx.companyId,
        userId: ctx.userId,
        action: "PROJECT_UPDATED",
        entity: "Project",
        entityId: project.id,
      });

      return project;
    }),

  assignFreelancer: protectedProcedure
    .use(roleGuard)
    .input(
      z.object({
        projectId: z.string(),
        freelancerId: z.string(),
        role: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const project = await ctx.prisma.project.findFirst({
        where: { id: input.projectId, companyId: ctx.companyId },
      });
      const freelancer = await ctx.prisma.freelancer.findFirst({
        where: { id: input.freelancerId, companyId: ctx.companyId },
      });
      if (!project || !freelancer) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.prisma.projectAssignment.upsert({
        where: {
          projectId_freelancerId: {
            projectId: input.projectId,
            freelancerId: input.freelancerId,
          },
        },
        update: { role: input.role },
        create: {
          projectId: input.projectId,
          freelancerId: input.freelancerId,
          role: input.role,
        },
      });
    }),

  unassignFreelancer: protectedProcedure
    .use(roleGuard)
    .input(z.object({ projectId: z.string(), freelancerId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const project = await ctx.prisma.project.findFirst({
        where: { id: input.projectId, companyId: ctx.companyId },
      });
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.prisma.projectAssignment.delete({
        where: {
          projectId_freelancerId: {
            projectId: input.projectId,
            freelancerId: input.freelancerId,
          },
        },
      });
      return { success: true };
    }),

  getBudgetSummary: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const project = await ctx.prisma.project.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      const timesheets = await ctx.prisma.timesheet.findMany({
        where: { projectId: input.id, status: "APPROVED" },
        include: { freelancer: true },
      });

      const totalHours = timesheets.reduce((sum, t) => sum + t.hours, 0);
      const contracts = await ctx.prisma.contract.findMany({
        where: { projectId: input.id },
      });
      const rateMap = new Map(
        contracts.map((c) => [c.freelancerId, c.ratePerHour]),
      );

      const totalSpent = timesheets.reduce((sum, t) => {
        const rate = rateMap.get(t.freelancerId) || 0;
        return sum + t.hours * rate;
      }, 0);

      return {
        budget: project.budget || 0,
        spent: totalSpent,
        totalHours,
        remaining: (project.budget || 0) - totalSpent,
        percentUsed: project.budget
          ? Math.min(100, Math.round((totalSpent / project.budget) * 100))
          : 0,
      };
    }),
});
